var feature = require('./util/feature'),
    queue = require('d3-queue').queue,
    indexdocs = require('./indexer/indexdocs'),
    split = require('split'),
    fs = require('fs-extra'),
    cxxcache = require('./util/cxxcache'),
    TIMER = process.env.TIMER;

module.exports = index;
module.exports.update = update;
module.exports.store = store;
module.exports.cleanDocs = cleanDocs;

function index(geocoder, from, to, options, callback) {
    options = options || {};

    var zoom = options.zoom + parseInt(options.geocoder_resolution || 0, 10);

    if (!to) return callback(new Error('to parameter required'));
    if (!from) return callback(new Error('from parameter required'));
    if (!options) return callback(new Error('options parameter required'));
    if (!zoom) return callback(new Error('must specify zoom level in options'));
    if (!options.output)
        return callback(new Error('must specify output stream in options'));
    if (!from.readable)
        return callback(new Error('input stream must be readable'));

    var inStream = from.pipe(split());
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

                update(
                    to,
                    docs,
                    {
                        zoom: zoom,
                        output: options.output,
                        tokens: options.tokens,
                        openStream: true
                    },
                    function(err) {
                        if (err) return callback(err);
                        getDocs(options);
                    }
                );
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
    if (!options.zoom)
        return callback(new Error('options.zoom argument requied'));

    indexdocs(
        docs,
        source,
        {
            zoom: options.zoom,
            geocoder_tokens: source.geocoder_tokens,
            tokens: options.tokens
        },
        updateCache
    );

    function updateCache(err, patch) {
        if (err) return callback(err);
        if (TIMER) console.timeEnd('update:indexdocs');

        //Output geometries to vectorize
        if (options.output) {
            for (var docs_it = 0; docs_it < patch.vectors.length; docs_it++) {
                options.output.write(
                    JSON.stringify(patch.vectors[docs_it]) + '\n'
                );
            }
            if (!options.openStream) options.output.end();
        }

        // ? Do this in master?
        var features = {};
        var q = queue(500);
        q.defer(function(features, callback) {
            if (TIMER) console.time('update:putFeatures');

            feature.putFeatures(source, cleanDocs(source, patch.docs), function(
                err
            ) {
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
        setText(patch.text, patch.normalizations);
        q.awaitAll(callback);

        function setParts(data, type) {
            q.defer(
                function(data, type, callback) {
                    var ids = Object.keys(data);
                    var cache = source._geocoder;
                    if (TIMER) console.time('update:setParts:' + type);

                    var id;
                    for (var i = 0; i < ids.length; i++) {
                        id = ids[i];
                        // This merges new entries on top of old ones.
                        data[id].forEach(function(langGrids, langList) {
                            var langArg;
                            if (langList.includes('all')) {
                                langArg = null;
                            } else {
                                langArg = [];
                                for (var lang of langList.split(',')) {
                                    if (
                                        !source.lang.lang_map.hasOwnProperty(
                                            lang
                                        )
                                    ) {
                                        console.warn(
                                            "can't index text for index",
                                            source.id,
                                            'because it has no lang code',
                                            lang
                                        );
                                        continue;
                                    }
                                    langArg.push(source.lang.lang_map[lang]);
                                }
                                if (langArg.length == 0) langArg = null;
                            }
                            if (id)
                                cache.grid.set(id, langGrids, langArg, true);
                        });
                    }
                    if (TIMER) console.timeEnd('update:setParts:' + type);
                    callback();
                },
                data,
                type
            );
        }

        function setText(textArray, variants) {
            var dictcache = source._dictcache;
            for (var i = 0; i < textArray.length; i++) {
                if (textArray[i] !== null && textArray[i].trim().length > 0) {
                    dictcache.setText(textArray[i], true);
                }
            }
            if (variants) {
                for (var v of Object.keys(variants)) {
                    if (
                        v !== null &&
                        variants[v] !== null &&
                        v.length &&
                        variants[v].length
                    ) {
                        dictcache.setNormalization(v, variants[v]);
                    }
                }
            }
        }
    }
}

// ## Store
//
// Serialize and make permanent the index currently in memory for a source.
function store(source, callback) {
    var cache = source._geocoder;

    var q = queue(10);

    let types;
    if (source.use_normalization_cache) {
        types = ['freq', 'grid', 'norm'];
    } else {
        types = ['freq', 'grid'];
        q.defer(function(callback) {
            var dawgFile = source.getBaseFilename() + '.dawg';
            fs.writeFile(dawgFile, source._dictcache.dump(), callback);
        });
    }

    types.forEach(function(type) {
        q.defer(function(callback) {
            var rocksdb = source.getBaseFilename() + '.' + type + '.rocksdb';

            // steps:
            //   - pack to a temp directory
            //   - delete current rocks cache
            //   - move temp rocks overtop current rocks position
            //   - create new rocks cache

            var tmpdir =
                require('os').tmpdir() +
                '/temp.' +
                Math.random()
                    .toString(36)
                    .substr(2, 5);
            var id;

            if (type == 'norm') {
                var dawgFile = source.getBaseFilename() + '.dawg';
                var dump = source._dictcache.dumpWithNormalizations(tmpdir);

                q.defer(function(cb) {
                    fs.writeFile(dawgFile, dump, cb);
                });
            } else {
                cache[type].pack(tmpdir);

                id = cache[type].id;
                delete cache[type];
            }

            fs.move(tmpdir, rocksdb, { clobber: true }, function(err) {
                if (!err && type != 'norm') {
                    cache[type] = new cxxcache.RocksDBCache(id, rocksdb);
                }
                callback(err);
            });
        });
    });

    q.awaitAll(callback);
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
