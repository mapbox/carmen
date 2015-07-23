var mp32 = Math.pow(2,32);
var termops = require('./util/termops'),
    token = require('./util/token'),
    feature = require('./util/feature'),
    uniq = require('./util/uniq'),
    ops = require('./util/ops'),
    queue = require('queue-async'),
    indexdocs = require('./indexer/indexdocs'),
    TIMER = process.env.TIMER,
    DEBUG = process.env.DEBUG;

var centroid = require('turf-point-on-surface');
var tilebelt = require('tilebelt');
var cover = require('tile-cover');

module.exports = index;
module.exports.update = update;
module.exports.generateFrequency = generateFrequency;
module.exports.store = store;
module.exports.cleanDocs = cleanDocs;
module.exports.teardown = teardown;

function index(geocoder, from, to, options, callback) {
    options = options || {};

    to.startWriting(function(err) {
        if (err) return callback(err);

        process(options);

        function process(options) {
            if (TIMER) console.time('getIndexableDocs');
            from.getIndexableDocs(options, function(err, docs, options) {
                if (TIMER) console.timeEnd('getIndexableDocs');
                if (err) return callback(err);
                if (!docs.length) {
                    // All docs processed + validated.
                    // Teardown to kill workers.
                    teardown();

                    geocoder.emit('store');
                    store(to, function(err) {
                        if (err) return callback(err);
                        to.stopWriting(callback);
                    });
                } else {
                    geocoder.emit('index', docs.length);
                    update(to, docs, from._geocoder.zoom, function(err) {
                        if (err) return callback(err);
                        process(options);
                    });
                }
            });
        }
    });
}

// # Update
//
// Updates the source's index with provided docs.
//
// @param {Object} source - a Carmen source
// @param {Array} docs - an array of documents
// @param {Function} callback
function update(source, docs, zoom, callback) {
    // First pass over docs.
    // - Creates termsets (one or more arrays of termids) from document text.
    // - Tallies frequency of termids against current frequencies compiling a
    //   final in-memory frequency count of all terms involved with this set of
    //   documents to be indexed.
    // - Stores new frequencies.
    if (TIMER) console.time('update:freq');
    try {
        var freq = generateFrequency(docs, source._geocoder.token_replacer);
    } catch(err) {
        return callback(err);
    }
    if (TIMER) console.timeEnd('update:freq');

    if (TIMER) console.time('update:covers');
    generateCovers(docs, zoom);
    if (TIMER) console.timeEnd('update:covers');

    // Do this within each shard worker.
    var getter = source.getGeocoderData.bind(source);

    var q = queue(2);
    q.defer(function(done) {
        feature.putFeatures(source, cleanDocs(source, docs), function(err) {
            if (TIMER) console.timeEnd('update:putFeatures');
            if (err) return callback(err);
            // @TODO manually calls _commit on MBTiles sources.
            // This ensures features are persisted to the store for the
            // next run which would not necessarily be the case without.
            // Given that this is a very performant pattern, commit may
            // be worth making a public function in node-mbtiles (?).
            return source._commit ? source._commit(done) : done();
        });
    });
    q.defer(function(done) {
        // Ensures all shards are loaded.
        if (TIMER) console.time('update:loadall');

        var ids = Object.keys(freq);
        var l = ids.length;
        while (l--) ids[l] = parseInt(ids[l],10);

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
            indexdocs(docs, freq, zoom, source._geocoder.geocoder_tokens, function(err, patch) {
                if (err) return done(err);
                updateCache(patch, done);
            });
        });
    });
    q.awaitAll(callback);

    function updateCache(patch, callback) {
        if (TIMER) console.timeEnd('update:indexdocs');

        var q = queue(500);
        for (var type in patch) if (type !== 'docs') setParts(patch[type], type);
        q.awaitAll(callback);

        function setParts(data, type) {
            q.defer(function(data, type, callback) {
                var ids = Object.keys(data);
                var cache = source._geocoder;
                if (TIMER) console.time('update:setParts:'+type);
                cache.loadall(getter, type, ids, function(err) {
                    if (err) return callback(err);
                    for (var i = 0; i < ids.length; i++) {
                        var id = ids[i];
                        // This merges new entries on top of old ones.
                        switch (type) {
                        case 'grid':
                            cache.set('grid', id, data[id], true);
                            cache.set('stat', id, []);
                            break;
                        }
                    }
                    if (TIMER) console.timeEnd('update:setParts:'+type);
                    callback();
                });
            }, data, type);
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
        if (!docs[i]._text) {
            throw new Error('doc has no _text');
        }

        // set max score
        freq[1][0] = Math.max(freq[1][0], docs[i]._score || 0);

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

function generateCovers(docs, zoom) {
    for (var i = 0; i < docs.length; i++) {
        if (docs[i]._zxy && docs[i]._zxy.length) continue;
        var doc = docs[i];
        var tiles = cover.tiles(doc._geometry, {min_zoom: zoom, max_zoom: zoom});
        doc._zxy = [];
        for (var x = 0; x < tiles.length; x++) {
            var tile = tiles[x];
            doc._zxy.push(tile[2]+'/'+tile[0]+'/'+tile[1]);
        }
        if (!doc._center || !verifyCenter(doc._center, tiles)) {
            console.warn('doc._center did not fall within the provided geometry for %s (%s). Calculating new point on surface.', doc._id, doc._text);
            doc._center = centroid(doc._geometry).geometry.coordinates;
            if (!verifyCenter(doc._center, tiles)) {
                return 'Invalid doc._center provided, and unable to calculate corrected centroid. Verify validity of doc._geometry for doc id:' + doc._id;
            } else {
                console.warn('new: doc._center: ', doc._center);
                console.warn('new: doc._zxy:    ', doc._zxy);
            }
        }
    }
}

function verifyCenter(center, tiles) {
    var found = false;
    var i = 0;
    while(!found && i < tiles.length) {
        var bbox = tilebelt.tileToBBOX(tiles[i]);
        if(center[0] >= bbox[0] && center[0] <= bbox[2] && center[1] >= bbox[1] && center[1] <= bbox[3]) {
            found = true;
        }
        i++;
    }
    return found;
}

// ## Store
//
// Serialize and make permanent the index currently in memory for a source.
function store(source, callback) {
    var tasks = [];

    ['freq','grid','stat'].forEach(loadTerm);

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
    tasks.forEach(function (task) {
        q.defer(function(task, callback) {
            var type = task[0];
            var shard = task[1];
            var cache = source._geocoder;
            source.putGeocoderData(type, shard, cache.pack(type, shard), callback);
        }, task);
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
        if (!source._geocoder.geocoder_address) {
            delete docs[i]._geometry;
        // source uses _cluster for addresses
        } else if (docs[i]._cluster) {
            delete docs[i]._geometry;
        }
    }
    return docs;
}

// Kill all child process workers.
function teardown() {
    indexdocs.teardown();
}

