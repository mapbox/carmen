var mp32 = Math.pow(2,32);
var termops = require('./util/termops'),
    token = require('./util/token'),
    feature = require('./util/feature'),
    uniq = require('./util/uniq'),
    ops = require('./util/ops'),
    queue = require('d3-queue').queue,
    indexdocs = require('./indexer/indexdocs'),
    split = require('split'),
    TIMER = process.env.TIMER

module.exports = index;
module.exports.update = update;
module.exports.generateFrequency = generateFrequency;
module.exports.store = store;
module.exports.cleanDocs = cleanDocs;

function index(geocoder, from, to, options, callback) {
    options = options || {};

    var zoom = options.zoom + parseInt(options.geocoder_resolution||0,10);

    if (!to) return callback(new Error('to parameter required'));
    if (!from) return callback(new Error('from parameter required'));
    if (!options) return callback(new Error('options parameter required'));
    if (!options.zoom) return callback(new Error('must specify zoom level in options'));
    if (!options.output) return callback(new Error('must specify output stream in options'));
    if (!from.readable) return callback(new Error('input stream must be readable'));

    var inStream = from.pipe(split())
    var docs = [];

    inStream.on('data', function(doc) {
        if (doc === '') return;
        docs.push(JSON.parse(doc));
        if (docs.length === 10000) {
            inStream.pause();
            indexDocs(null, docs, options);
        }
    });
    inStream.on('end', function() {
        inStream = false;
        indexDocs(null, docs, options);
    });
    inStream.on('error', function(err) {
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
        to.startWriting(function(err) {
            if (err) return callback(err);

            if (TIMER) console.timeEnd('getIndexableDocs');
            if (err) return callback(err);
            if (!docs.length) {
                geocoder.emit('store');
                store(to, function(err) {
                    if (err) return callback(err);
                    to.stopWriting(callback);
                });
            } else {
                geocoder.emit('index', docs.length);

                //Add Global Tokens to source token list
                if (options.tokens) {
                    var tokens = Object.keys(options.tokens);
                    for (tokens_it = 0; tokens_it < tokens.length; tokens_it++) {
                        to.geocoder_tokens[tokens[tokens_it]] = options.tokens[tokens[tokens_it]];
                    }
                }
                update(to, docs, {
                    zoom: zoom,
                    output: options.output,
                    openStream: true
                }, function(err) {
                    if (err) return callback(err);
                    getDocs(options);
                });
            }
        });
    }
}

// # Update
//
// Updates the source's index with provided docs.
//
// @param {Object} source - a Carmen source
// @param {Array} docs - an array of documents
// @param {Function} callback
function update(source, docs, options, callback) {
    // First pass over docs.
    // - Creates termsets (one or more arrays of termids) from document text.
    // - Tallies frequency of termids against current frequencies compiling a
    //   final in-memory frequency count of all terms involved with this set of
    //   documents to be indexed.
    // - Stores new frequencies.

    if (!options) return callback(new Error('options argument requied'));
    if (!options.zoom) return callback(new Error('options.zoom argument requied'));

    if (TIMER) console.time('update:freq');
    try {
        var freq = generateFrequency(docs, source.token_replacer);
    } catch (err) {
        return callback(err);
    }
    if (TIMER) console.timeEnd('update:freq');

    // Do this within each shard worker.
    var getter = source.getGeocoderData.bind(source);

    // Ensures all shards are loaded.
    if (TIMER) console.time('update:loadall');
    var ids = Object.keys(freq).map(function(v) { return parseInt(v, 10); });
    source._geocoder.loadall(getter, 'freq', ids, function(err) {
        if (err) return callback(err);
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            freq[id][0] = (source._geocoder.get('freq', id) || [0])[0] + freq[id][0];
            // maxscore should not be cumulative.
            if (id === 1) {
                freq[id][0] = (source._geocoder.get('freq', id) || [0,0])[0] || freq[id][0];
            }
            source._geocoder.set('freq', id, freq[id]);
        }
        if (TIMER) console.timeEnd('update:loadall');
        if (TIMER) console.time('update:indexdocs');
        indexdocs(docs, freq, options.zoom, source.geocoder_tokens, updateCache);
    });

    function updateCache(err, patch) {
        if (err) return callback(err);
        if (TIMER) console.timeEnd('update:indexdocs');

        //Output geometries to vectorize
        if (options.output) {
            for (var docs_it = 0; docs_it < patch.vectors.length; docs_it++) {
                options.output.write(JSON.stringify(patch.vectors[docs_it])+'\n');
            }
            if (!options.openStream) options.output.end();
        }

        // ? Do this in master?
        var features = {};
        var q = queue(500);
        q.defer(function(features, callback) {
            if (TIMER) console.time('update:putFeatures');
            feature.putFeatures(source, cleanDocs(source, patch.docs), function(err) {
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
        setText(patch.text);
        q.awaitAll(callback);

        function setParts(data, type) {
            q.defer(function(data, type, callback) {
                var ids = Object.keys(data);
                var cache = source._geocoder;
                var dictcache = source._dictcache;
                if (TIMER) console.time('update:setParts:'+type);
                cache.loadall(getter, type, ids, function(err) {
                    if (err) return callback(err);
                    if (dictcache.properties.needsText) {
                        for (var i = 0; i < ids.length; i++) {
                            var id = ids[i];
                            // This merges new entries on top of old ones.
                            cache.set('grid', id, data[id], true);
                        }
                    } else {
                        for (var i = 0; i < ids.length; i++) {
                            var id = ids[i];
                            // This merges new entries on top of old ones.
                            cache.set('grid', id, data[id], true);
                            dictcache.setId(id);
                        }
                    }
                    if (TIMER) console.timeEnd('update:setParts:'+type);
                    callback();
                });
            }, data, type);
        }

        function setText(text) {
            var dictcache = source._dictcache;
            if (dictcache.properties.needsText) {
                for (var i = 0; i < text.length; i++) {
                    if ((text[i] !== null) && (text[i].trim().length > 0)) {
                        dictcache.setText(text[i]);
                    }
                }
            }
        }
    }
}

function generateFrequency(docs, replacer) {
    var freq = {};

    // Uses freq[0] as a convention for storing total # of docs.
    // Reserved for this use by termops.encodeTerm
    freq[0] = [0];

    // Uses freq[1] as a convention for storing max score.
    // Reserved for this use by termops.encodeTerm
    freq[1] = [0];

    for (var i = 0; i < docs.length; i++) {
        if (!docs[i].properties["carmen:text"]) {
            throw new Error('doc has no carmen:text');
        }

        // set max score
        freq[1][0] = Math.max(freq[1][0], docs[i].properties["carmen:score"] || 0);

        var texts = termops.getIndexableText(replacer, docs[i]);
        for (var x = 0; x < texts.length; x++) {
            var terms = termops.terms(texts[x]);
            for (var k = 0; k < terms.length; k++) {
                var id = terms[k];
                freq[id] = freq[id] || [0];
                freq[id][0]++;
                freq[0][0]++;
            }
        }
    }

    return freq;
}

// ## Store
//
// Serialize and make permanent the index currently in memory for a source.
function store(source, callback) {
    var tasks = [];

    ['freq','grid'].forEach(loadTerm);

    function loadTerm(type) {
        var cache = source._geocoder;
        tasks = tasks.concat(cache.list(type).map(loadShard));

        function loadShard(shard) {
            var ids = cache.list(type, shard);
            for (var i = 0; i < ids.length; i++) {
                var id = ids[i];
                var data = source._geocoder.get(type, id);
            }
            return [type, shard];
        }
    }
    var q = queue(10);
    tasks.forEach(function(task) {
        q.defer(function(task, callback) {
            var type = task[0];
            var shard = task[1];
            var cache = source._geocoder;
            source.putGeocoderData(type, shard, cache.pack(type, shard), callback);
        }, task);
    });
    q.defer(function(callback) {
        source.putGeocoderData('stat', 0, source._dictcache.dump(), callback);
    });
    q.awaitAll(function(err) {
        if (err) return callback(err);

        // @TODO: robustify this behavior in carmen-cache.
        // Currently unloadall + loadall after storing does not result in the
        // same state prior to storing (though it should).
        // Only affects geocoding unit tests which index, store, and then attempt
        // to use the index live immediately atm.

        // source._geocoder.unloadall('freq');
        // source._geocoder.unloadall('grid');
        // source._geocoder.unloadall('stat');
        callback();
    });
}

// Cleans a doc for storage based on source properties.
// Currently only drops _geometry data for non interpolated
// address sources.
function cleanDocs(source, docs) {
    for (var i = 0; i < docs.length; i++) {
        // source is not address enabled
        if (!source.geocoder_address) {
            delete docs[i].geometry;
        }
    }
    return docs;
}

