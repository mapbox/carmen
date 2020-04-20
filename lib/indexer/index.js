'use strict';
const feature = require('../util/feature'),
    constants = require('../constants'),
    queue = require('d3-queue').queue,
    indexdocs = require('./indexdocs'),
    split = require('split'),
    TIMER = process.env.TIMER,
    fuzzy = require('@mapbox/node-fuzzy-phrase'),
    carmenCore = require('@mapbox/carmen-core');

module.exports = index;
module.exports.update = update;
module.exports.store = store;
module.exports.cleanDocs = cleanDocs;

/**
 * The main interface for building an index
 *
 * @access public
 *
 * @param {Geocoder} geocoder - a {@link Geocoder} instance
 * @param {stream.Readable} from - a stream of geojson features
 * @param {CarmenSource} to - the interface to the index's destinaton
 * @param {Object} options - options
 * @param {number} options.zoom - the max zoom level for the index
 * @param {stream.Writable} options.output - the output stream for
 * @param {PatternReplaceMap} options.tokens - a pattern-based string replacement specification
 * @param {function} callback - A callback function
 *
 */
function index(geocoder, from, to, options, callback) {
    options = options || {};

    const zoom = options.zoom + parseInt(options.geocoder_resolution || 0,10);

    if (!to) return callback(new Error('to parameter required'));
    if (!from) return callback(new Error('from parameter required'));
    if (!options) return callback(new Error('options parameter required'));
    if (!zoom) return callback(new Error('must specify zoom level in options'));
    if (!options.output) return callback(new Error('must specify output stream in options'));
    if (!from.readable) return callback(new Error('input stream must be readable'));

    let inStream = from.pipe(split());
    let docs = [];

    inStream.on('data', (doc) => {
        if (doc === '') return;
        docs.push(JSON.parse(doc));
        if (docs.length === 10000) {
            inStream.pause();
            indexDocs(null, docs, options);
        }
    });
    inStream.on('end', () => {
        inStream = false;
        indexDocs(null, docs, options);
    });
    inStream.on('error', (err) => {
        return callback(err);
    });

    getDocs(options);

    function getDocs(options) {
        if (TIMER) console.time('getIndexableDocs');
        if (!inStream) return indexDocs(null, [], options);
        docs = [];
        inStream.resume();
    }

    function indexDocs(err, docs, options) {
        to.startWriting((err) => {
            if (err) return callback(err);

            if (TIMER) console.timeEnd('getIndexableDocs');
            if (err) return callback(err);
            if (!docs.length) {
                geocoder.emit('store');
                store(to, (err) => {
                    if (err) return callback(err);
                    to.stopWriting(callback);
                });
            } else {
                geocoder.emit('index', docs.length);

                update(to, docs, {
                    zoom: zoom,
                    output: options.output,
                    tokens: options.tokens,
                    openStream: true
                }, (err) => {
                    if (err) return callback(err);
                    getDocs(options);
                });
            }
        });
    }
}

/**
 * Update
 *
 * Updates the source's index with provided docs.
 *
 * @param {CarmenSource} source - the source to be updated
 * @param {Array<Feature>} docs - an array of GeoJSON `Feature` documents
 * @param {Object} options - TODO
 * @param {Function} callback - a callback function
 */
function update(source, docs, options, callback) {
    // First pass over docs.
    // - Creates termsets (one or more arrays of termids) from document text.
    // - Tallies frequency of termids against current frequencies compiling a
    //   final in-memory frequency count of all terms involved with this set of
    //   documents to be indexed.
    // - Stores new frequencies.

    if (!options) return callback(new Error('options argument requied'));
    if (!options.zoom) return callback(new Error('options.zoom argument requied'));

    indexdocs(docs, source, {
        zoom: options.zoom,
        geocoder_tokens: source.geocoder_tokens,
        tokens: options.tokens
    }, updateCache);

    function updateCache(err, patch) {
        if (err) return callback(err);
        if (TIMER) console.timeEnd('update:indexdocs');

        // Output geometries to vectorize
        if (options.output) {
            for (let docs_it = 0; docs_it < patch.vectors.length; docs_it++) {
                options.output.write(JSON.stringify(patch.vectors[docs_it]) + '\n');
            }
            if (!options.openStream) options.output.end();
        }

        // ? Do this in master?
        const features = {};
        const q = queue(500);
        q.defer((features, callback) => {
            if (TIMER) console.time('update:putFeatures');

            feature.putFeatures(source, cleanDocs(source, patch.docs), (err) => {
                if (TIMER) console.timeEnd('update:putFeatures');
                if (err) return callback(err);
                // @TODO manually calls _commit on MBTiles sources.
                // This ensures features are persisted to the store for the
                // next run which would not necessarily be the case without.
                // Given that this is a very performant pattern, commit may
                // be worth making a public function in node-mbtiles (?).
                return source._commit ? source._commit(callback) : callback();
            });
        }, features);
        setParts(patch.grid, 'grid');
        q.awaitAll(callback);

        function setParts(data, type) {
            q.defer((data, type, callback) => {
                const gridBuilder = source._gridstore.writer;
                const fuzzyBuilder = source._fuzzyset.writer;
                if (TIMER) console.time('update:setParts:' + type);

                for (const [phrase, phraseData] of data) {
                    if ((phrase === null) || (phrase.trim().length === 0)) {
                        console.warn('invalid phrase');
                        continue;
                    }

                    const phrase_id = fuzzyBuilder.insert(phrase.split(' '));

                    // This merges new entries on top of old ones.
                    phraseData.forEach((chunks, langList) => {
                        let lang_set;
                        if (langList.includes('all')) {
                            lang_set = null;
                        } else {
                            lang_set = [];
                            for (const lang of langList.split(',')) {
                                if (!source.lang.lang_map.hasOwnProperty(lang)) {
                                    console.warn("can't index text for index", source.id, 'because it has no lang code', lang);
                                    continue;
                                }
                                lang_set.push(source.lang.lang_map[lang]);
                            }
                            if (lang_set.length === 0) lang_set = null;
                        }
                        const key = { phrase_id, lang_set };
                        for (const chunk of chunks) {
                            gridBuilder.compactAppend(key, chunk.relev, chunk.score, chunk.id, chunk.source_phrase_hash, chunk.coords);
                        }
                    });
                }
                if (TIMER) console.timeEnd('update:setParts:' + type);
                callback();
            }, data, type);
        }
    }
}

/**
 * Store
 *
 * Serialize and make permanent the index currently in memory for a source.
 *
 * @param {object} source - Carmen source
 * @param {callback} callback - accepts error argument
 */
function store(source, callback) {

    const q = queue();

    q.defer((callback) => {
        // write fuzzy phrase set
        const idMap = source._fuzzyset.writer.finish();

        const fuzzySetFile = source.getBaseFilename() + '.fuzzy';
        source._fuzzyset.writer = null;
        source._fuzzyset.reader = new fuzzy.FuzzyPhraseSet(fuzzySetFile);

        const bins = source._fuzzyset.reader.getPrefixBins(8192);

        // write grid store
        source._gridstore.writer.renumber(idMap);
        source._gridstore.writer.loadBinBoundaries(bins);
        source._gridstore.writer.finish();

        const gridStoreFile = source.getBaseFilename() + '.gridstore.rocksdb';
        source._gridstore.writer = null;
        source._gridstore.reader = new carmenCore.GridStore(gridStoreFile, {
            zoom: source.zoom,
            type_id: source.ndx,
            coalesce_radius: source.geocoder_coalesce_radius || constants.COALESCE_PROXIMITY_RADIUS
        });

        callback();
    });

    q.awaitAll(callback);
}

/**
 * Cleans a doc for storage based on source properties.
 * Currently only drops _geometry data for non interpolated
 * address sources.
 *
 * @param {object} source - carmen source
 * @param {object[]} docs - array of geojson docs
 *
 * @return {object[]} "cleaned" docs
 */
function cleanDocs(source, docs) {
    for (let i = 0; i < docs.length; i++) {
        // source is not address enabled
        if (!source.geocoder_address) {
            delete docs[i].geometry;
        }
    }
    return docs;
}
