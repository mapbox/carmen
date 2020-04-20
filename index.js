/* eslint no-process-exit: "off" */
'use strict';

const EventEmitter = require('events').EventEmitter;
const queue = require('d3-queue').queue;
const fs = require('fs');
const crypto = require('crypto');
const Handlebars = require('handlebars');

const fuzzy = require('@mapbox/node-fuzzy-phrase');
const carmenCore = require('@mapbox/carmen-core');
const constants = require('./lib/constants');
const termops = require('./lib/text-processing/termops');
const getContext = require('./lib/geocoder/context');
const loader = require('./lib/sources/loader');
const geocode = require('./lib/geocoder/geocode');
const analyze = require('./lib/util/analyze');
const token = require('./lib/text-processing/token');
const index = require('./lib/indexer/index');

require('util').inherits(Geocoder, EventEmitter);
module.exports = Geocoder;

/**
 * An interface to the underlying data that a {@link Geocoder} instance is indexing and querying. In addition to the properties described below, instances must satisfy interface requirements for `Tilesource` and `Tilesink`. See tilelive {@link https://github.com/mapbox/tilelive/blob/master/API.md API Docs} for more info. Currently, carmen supports the following tilelive modules:
 *
 * - {@link https://github.com/mapbox/tilelive-s3 tilelive-s3}
 * - {@link https://github.com/mapbox/node-mbtiles node-mbtiles}
 * - {@link MemSource}
 *
 * @access public
 *
 * @typedef {function} CarmenSource
 * @property {function(id, callback} getFeature - retrieves a feature given by `id`, calls `callback` with `(err, result)`
 * @property {function(id, data, callback} putFeature - inserts feature `data` and calls callback with `(err, result)`.
 * @property {function(index,shard,callback)} getGeocoderData - get carmen record at `shard` in `index` and call callback with `(err, buffer)`
 * @property {function(index,shard,buffer,callback)} putGeocoderData - put buffer into a shard with index `index`, and call callback with `(err)`
 * @property {function(type)} geocoderDataIterator - custom method for iterating over documents in the source.
 * @property {function(pointer, callback)} getIndexableDocs - get documents needed to create a forward geocoding datasource. `pointer` is an optional object that has different behavior depending on the implementation. It is used to indicate the state of the database, similar to a cursor, and can allow pagination, limiting, etc. `callback` is called with `(error, documents, pointer)` in which `documents` is a list of objects.
 *
 */



/**
 * Geocoder is an interface used to submit a single query to
 * multiple indexes, returning a single set of ranked results.
 *
 * @access public
 *
 * @param {Object<string, CarmenSource>} indexes - A one-to-one mapping from index layer name to a {@link CarmenSource}.
 * @param {Object} options - options
 * @param {PatternReplaceMap} options.tokens - A {@link PatternReplaceMap} used to perform custom string replacement at index and query time.
 * @param {Object} options.helper - helper functions to used for formatting
 * @param {Object<string, (string|Function)>} options.geocoder_inverse_tokens - for reversing abbreviations. Replace key with a stipulated string value or pass it to a function that returns a string. see {@link #text-processsing Text Processing} for details.
 *
 */
function Geocoder(indexes, options) {
    if (!indexes) throw new Error('Geocoder indexes required.');
    options = options || {};

    const q = queue(10);

    this.indexes = indexes;

    const globalTokens = options.tokens || {};
    const formatHelpers = options.formatHelpers || {};
    if (typeof globalTokens !== 'object') throw new Error('globalTokens must be an object');
    if (typeof formatHelpers !== 'object') throw new Error('helper functions must be an object');

    this.replacer = token.createGlobalReplacer(globalTokens);

    this.globaltokens = options.tokens;
    this.formatHelpers = options.formatHelpers;
    this.byname = {};
    this.bytype = {};
    this.bysubtype = {};
    this.bystack = {};
    this.byidx = [];

    // Cloning each index. Below, many of the properties on the source object are
    // set due to the configuration of the Geocoder instance itself. Cloning
    // allows us to re-use a given source across multiple Geocoder instances,
    // setting these properties differently for each clone.
    for (const k in indexes) {
        indexes[k] = clone(indexes[k]);
        q.defer((id, source, callback) => {
            source.open((err) => {
                if (err) return callback(err);
                source.getInfo((err, info) => {
                    if (err) return callback(err);
                    callback(null, { id, info });
                });
            });
        }, k, indexes[k]);
    }

    /**
     * Activates a single index in the geocoder. This function operates on the
     * output of {@link loadIndex}, which provides information needed for
     * activation.
     *
     * @access private
     *
     * @param {Object} data - data obtained via {@link loadIndex}
     * @param {int} i - index number
     */
    q.awaitAll((err, results) => {
        const names = [];
        if (results) results.forEach((data, i) => {
            const id = data.id;
            const info = data.info;
            const source = indexes[id];
            const name = info.geocoder_name || id;
            const type = info.geocoder_type || info.geocoder_name || id.replace('.mbtiles', '');
            const types = info.geocoder_types || [type];
            let stack = info.geocoder_stack || false;
            const languages = info.geocoder_languages || [];
            const autopopulate = info.geocoder_languages_from_default || {};
            if (typeof stack === 'string') stack = [stack];
            if (!stack) stack = [];

            const scoreRangeKeys = info.scoreranges ? Object.keys(info.scoreranges) : [];

            if (names.indexOf(name) === -1) names.push(name);

            if (source._original._gridstore) source._gridstore = source._original._gridstore;
            if (source._original._fuzzyset) source._fuzzyset = source._original._fuzzyset;

            source._original._fuzzyset = source._fuzzyset;

            if (info.geocoder_address) {
                source.geocoder_address = info.geocoder_address;
            } else {
                source.geocoder_address = false;
            }

            source.geocoder_routable = info.geocoder_routable ? info.geocoder_routable : false;

            if (info.geocoder_version) {
                source.version = parseInt(info.geocoder_version, 10);
                if (source.version !== 10) {
                    err = new Error('geocoder version is not 10, index: ' + id);
                    return;
                }
            } else {
                source.version = 0;
                source.shardlevel = info.geocoder_shardlevel || 0;
            }

            // Fold language templates into geocoder_format object
            if (info.geocoder_format && typeof info.geocoder_format == 'string') {
                const p = /\{\{(.*?)\}\}/g;
                let types = new Set();
                let m;
                // eslint-disable-next-line no-cond-assign
                while (m = p.exec(info.geocoder_format)) {
                    if (/[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g.test(m[1])) {
                        types = null;
                        break;
                    }
                    else types.add(m[1].split('.')[0]);
                }
                source.geocoder_feature_types_in_format = types;
                source.geocoder_format = { default: Handlebars.compile(info.geocoder_format, { noEscape: true }) };
            } else {
                source.geocoder_format = { default: null };
                source.geocoder_feature_types_in_format = false;
            }

            Object.keys(info).forEach((key) => {
                if (/^geocoder_format_/.exec(key)) {
                    if (typeof info[key] === 'string') {
                        source.geocoder_format[key.replace(/^geocoder_format_/, '')] = Handlebars.compile(info[key], { noEscape: true });
                    } else {
                        source.geocoder_format[key.replace(/^geocoder_format_/, '')] = null;
                    }
                }
            });

            source.geocoder_address_order = info.geocoder_address_order || 'ascending'; // get expected address order from index-level setting
            source.geocoder_ignore_order = info.geocoder_ignore_order || false; // if true, don't apply `backy` penalty if this layer's matches are not in the expected order (eg US postcodes)
            source.geocoder_layer = (info.geocoder_layer || '').split('.').shift();
            source.geocoder_tokens = info.geocoder_tokens || {};
            source.geocoder_inverse_tokens = options.geocoder_inverse_tokens || {};
            source.geocoder_inherit_score = info.geocoder_inherit_score || false;
            source.geocoder_grant_score = info.hasOwnProperty('geocoder_grant_score') ? info.geocoder_grant_score : true;
            source.geocoder_universal_text = info.geocoder_universal_text || false;
            source.geocoder_reverse_mode = info.geocoder_reverse_mode || false;
            source.geocoder_expected_number_order = info.geocoder_expected_number_order || false;
            source.geocoder_intersection_token = info.geocoder_intersection_token || '';
            source.geocoder_coalesce_radius = info.geocoder_coalesce_radius;

            source.geocoder_frequent_word_list = false;
            if (info.geocoder_frequent_word_list) {
                source.geocoder_frequent_word_list = new Set();
                for (const word of info.geocoder_frequent_word_list) {
                    source.geocoder_frequent_word_list.add(word.toLowerCase());
                }
            }
            source.categorized_replacement_words = token.categorizeTokenReplacements(info.geocoder_tokens);
            source.simple_replacer = token.createSimpleReplacer(source.categorized_replacement_words.simple);
            source.complex_query_replacer = token.createComplexReplacer(source.categorized_replacement_words.complex, { includeRelevanceReduction: false });
            source.complex_indexing_replacer = token.createComplexReplacer(source.categorized_replacement_words.complex, { includeUnambiguous: true , includeRelevanceReduction: true });
            source.format_helpers = options.formatHelpers;

            source.categories = false;
            if (info.geocoder_categories) {
                source.categories = new Set();

                for (let category of info.geocoder_categories) {
                    category = termops.tokenize(category).tokens;

                    source.categories.add(category.join(' '));

                    category = category.map((cat) => {
                        let text = termops.tokenize(cat);
                        text = token.replaceToken(source.complex_query_replacer, text);
                        return source.simple_replacer.replacer(text.tokens).join(' ');
                    });

                    source.categories.add(category.join(' '));
                }
            }
            info.maxzoom = info.maxzoom || 6;
            source.maxzoom = info.maxzoom;
            source.maxscore = info.maxscore;
            source.minscore = info.minscore;
            source.stack = stack;
            source.zoom = info.maxzoom + parseInt(info.geocoder_resolution || 0,10);

            if (info.scoreranges && ((!info.maxscore && info.maxscore !== 0) || (!info.minscore && info.minscore !== 0))) {
                throw new Error('Indexes using scoreranges must also provide min/maxscore attribute');
            }

            source.scoreranges = info.scoreranges ? info.scoreranges : {};
            source.maxscore = info.maxscore;
            source.minscore = info.minscore;
            source.types = types;
            source.type = type;
            source.name = name;
            source.id = id;
            source.idx = i;
            source.ndx = names.indexOf(name);
            source.bounds = info.bounds || [-180, -85, 180, 85];

            // arrange languages into something presentable
            const lang = {};
            lang.has_languages = languages.length > 0;
            lang.languages = ['default'].concat(languages.map((l) => { return l.replace('-', '_'); }).sort());
            lang.hash = crypto.createHash('sha512').update(JSON.stringify(lang.languages)).digest().toString('hex').slice(0,8);
            lang.lang_map = {};
            lang.languages.forEach((l, idx) => { lang.lang_map[l] = idx; });
            lang.lang_map['unmatched'] = 128; // @TODO verify this is the right approach
            lang.autopopulate = {};
            Object.keys(autopopulate).forEach((k) => {
                lang.autopopulate[k] = autopopulate[k].map((l) => l.replace('-', '_'));
            });
            source.lang = lang;

            // add byname index lookup
            this.byname[name] = this.byname[name] || [];
            this.byname[name].push(source);

            // add bytype index lookup
            for (let t = 0; t < types.length; t++) {
                this.bytype[types[t]] = this.bytype[types[t]] || [];
                this.bytype[types[t]].push(source);
            }

            // add bysubtype index lookup
            for (let st = 0; st < scoreRangeKeys.length; st++) {
                this.bysubtype[type + '.' + scoreRangeKeys[st]] = this.bysubtype[type + '.' + scoreRangeKeys[st]] || [];
                this.bysubtype[type + '.' + scoreRangeKeys[st]].push(source);
            }

            // add bystack index lookup
            for (let j = 0; j < stack.length; j++) {
                this.bystack[stack[j]] = this.bystack[stack[j]] || [];
                this.bystack[stack[j]].push(source);
            }

            source.getBaseFilename = function() {
                const filename = source._original.cacheSource ? source._original.cacheSource.filename : source._original.filename;
                if (filename) {
                    return filename.replace('.mbtiles', '');
                } else if (source._original.tmpFilename) {
                    return source._original.tmpFilename;
                } else {
                    source._original.tmpFilename = require('os').tmpdir() + '/temp.' + Math.random().toString(36).substr(2, 5);
                    return source._original.tmpFilename;
                }
            };

            // add byidx index lookup
            this.byidx[i] = source;

        });

        // Second pass -- generate non_overlapping_indexes (geocoder_stack) per index.
        // The non_overlapping_indexes of an index represents a mask of all indexes that their
        // geocoder_stacks do not intersect with -- ie. a spatialmatch with any of
        // these indexes should not be attempted as it will fail anyway.
        for (let i = 0; i < this.byidx.length; i++) {
            const non_overlapping_indexes = new Set();
            const a = this.byidx[i];
            if (a.stack) {
                const a_stack = new Set(a.stack);
                for (let j = 0; j < this.byidx.length; j++) {
                    const b = this.byidx[j];
                    if (b.stack.length !== 0 && b.stack.filter((s) => a_stack.has(s)).length === 0) {
                        non_overlapping_indexes.add(j);
                    }
                }
            }
            this.byidx[i].non_overlapping_indexes = Array.from(non_overlapping_indexes);
        }
        // Find the min and max score of all features in all indexes
        this.minScore = this.byidx.reduce((min, source) => Math.min(min, source.minScore), 0) || 0;
        this.maxScore = this.byidx.reduce((max, source) => Math.max(max, source.maxscore), 0) || 1;

        for (const source of this.byidx) {
            if (!source._fuzzyset) {
                const fuzzySetFile = source.getBaseFilename() + '.fuzzy';
                if (!fs.existsSync(fuzzySetFile)) {
                    // write case: we'll be creating a FuzzyPhraseSetBuilder and storing it in _fuzzyset.writer
                    source._fuzzyset = {
                        reader: null,
                        writer: new fuzzy.FuzzyPhraseSetBuilder(fuzzySetFile)
                    };
                    source._fuzzyset.writer.loadWordReplacements(source.categorized_replacement_words.simple);
                } else {
                    // read case: we'll be creating a FuzzyPhraseSet and storing it in _fuzzyset.reader
                    source._fuzzyset = {
                        reader: new fuzzy.FuzzyPhraseSet(fuzzySetFile),
                        writer: null
                    };
                }
                source._original._fuzzyset = source._fuzzyset;
            }

            if (!source._gridstore) {
                const gridStoreFile = source.getBaseFilename() + '.gridstore.rocksdb';
                if (!fs.existsSync(gridStoreFile)) {
                    // write case: we'll be creating a GridStoreBuilder and storing it in _gridstore.writer
                    source._gridstore = {
                        reader: null,
                        writer: new carmenCore.GridStoreBuilder(gridStoreFile)
                    };
                } else {
                    // read case: we'll be creating a GridStore and storing it in _gridstore.reader
                    source._gridstore = {
                        reader: new carmenCore.GridStore(gridStoreFile, {
                            zoom: source.zoom,
                            type_id: source.ndx,
                            coalesce_radius: source.geocoder_coalesce_radius || constants.COALESCE_PROXIMITY_RADIUS
                        }),
                        writer: null
                    };
                }
                source._original._gridstore = source._gridstore;
            }
        }

        this._error = err;
        this._opened = true;

        // emit the open event in a setImmediate -- circumstances exist
        // where no async ops may be necessary to construct a carmen,
        // in which case callers may not have a chance to register a callback handler
        // before open is emitted if we don't protect it this way
        const _this = this;
        setImmediate(() => {
            _this.emit('open', err);
        });

    });
}

/**
 * Clones the source object. Methods in the cloned object are all bound
 * with the original source as their first argument.
 *
 * @access private
 *
 * @param {CarmenSource} source - a CarmenSource.
 * @returns {CarmenSource} a clone of the input source
 */
function clone(source) {
    const cloned = {};
    cloned.getInfo = source.getInfo.bind(source);
    cloned.getTile = source.getTile.bind(source);
    cloned.open = function(callback) {
        if (source.open === true) return callback();
        if (typeof source.open === 'function') return source.open(callback);
        return source.once('open', callback);
    };
    // Optional methods
    [
        '_commit',
        'putInfo',
        'putTile',
        'getGeocoderData',
        'putGeocoderData',
        'getBaseFilename',
        'geocoderDataIterator',
        'startWriting',
        'stopWriting',
        'getIndexableDocs',
        'serialize'
    ].forEach((method) => {
        if (typeof source[method] === 'function') {
            cloned[method] = source[method].bind(source);
        }
    });
    // Include reference to original
    cloned._original = source;
    return cloned;
}

/**
 * Ensure that all carmen sources are opened
 *
 * @access private
 *
 * @param {function} callback - a callback function
 * @returns {boolean} true if all sources have been opened
 */
Geocoder.prototype._open = function(callback) {
    return this._opened ? callback(this._error) : this.once('open', callback);
};

/**
 * Main entry point for geocoding API. Returns results across all indexes for
 * a given query.
 *
 * @access public
 *
 * @name Geocoder#geocode
 * @memberof Geocoder
 * @see {@link #geocode|gecode} for more details, including
 * `options` properties.
 *
 * @param {string} query - a query string, eg "Chester, NJ"
 * @param {Object} options - options
 * @param {function} callback - a callback function, passed on to {@link #geocode|geocode}
 */
Geocoder.prototype.geocode = function(query, options, callback) {
    const self = this;
    this._open((err) => {
        if (err) return callback(err);
        geocode(self, query, options, callback);
    });
};

/**
 * Main entry point for indexing. Index a stream of GeoJSON docs.
 *
 * @name Geocoder#index
 * @memberof Geocoder
 * @see {@link index} for more details, including `options` properties.
 *
 * @access public
 *
 * @param {stream.Readable} from - a readable stream of GeoJSON features
 * @param {CarmenSource} to - the interface to the index's destination
 * @param {Object} options - options
 * @param {number} options.zoom - the max zoom level for the index
 * @param {stream.Writable} options.output - the output stream for
 * @param {PatternReplaceMap} options.tokens - a pattern-based string replacement specification
 * @param {function} callback - a callback function, passed on to {@link #index|inde}
 */
Geocoder.prototype.index = function(from, to, options, callback) {
    const self = this;
    this._open((err) => {
        if (err) return callback(err);
        index(self, from, to, options, callback);
    });
};

// Analyze a source's index.
Geocoder.prototype.analyze = function(source, callback) {
    this._open((err) => {
        if (err) return callback(err);
        analyze(source, callback);
    });
};

Geocoder.auto = loader.auto;
Geocoder.autodir = loader.autodir;
Geocoder.setVtCacheSize = getContext.getTile.setVtCacheSize;
