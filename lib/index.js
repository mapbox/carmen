var termops = require('./util/termops'),
    feature = require('./util/feature'),
    uniq = require('./util/uniq'),
    ops = require('./util/ops'),
    queue = require('queue-async'),
    cover = require('tile-cover')
    DEBUG = process.env.DEBUG;

module.exports = index;
module.exports.update = update;
module.exports.loadDoc = loadDoc;
module.exports.generateFrequency = generateFrequency;
module.exports.store = store;

function index(geocoder, from, to, options, callback) {
    options = options || {};

    to.startWriting(function(err) {
        if (err) return callback(err);
        if (options.shardlevel || from._geocoder.shardlevel) {
            var shardlevel = options.shardlevel || from._geocoder.shardlevel;
            to.putInfo({geocoder_shardlevel:shardlevel}, function(err) {
                if (err) return callback(err);
                to._geocoder.shardlevel = shardlevel;
                process(options);
            });
        } else {
            process(options);
        }
        function process(options) {
            from.getIndexableDocs(options, function(err, docs, options) {
                if (err) return callback(err);
                if (!docs.length) {
                    geocoder.emit('store');
                    store(to, function(err) {
                        if (err) return callback(err);
                        to.stopWriting(callback);
                    });
                } else {
                    geocoder.emit('index', docs.length);
                    update(to, docs, function(err) {
                        if (err) return callback(err);
                        process(options);
                    });
                }
            });
        };
    });
}

// # Update
//
// Updates the source's index with provided docs.
//
// @param {Object} source - a Carmen source
// @param {Array} docs - an array of documents
// @param {Function} callback
function update(source, docs, callback) {
    source._geocoder._known = source._geocoder._known || { term:{} };
    var known = source._geocoder._known;

    // First pass over docs.
    // - Creates termsets (one or more arrays of termids) from document text.
    // - Tallies frequency of termids against current frequencies compiling a
    //   final in-memory frequency count of all terms involved with this set of
    //   documents to be indexed.
    // - Stores new frequencies.
    try {
        var freq = generateFrequency(docs);
    } catch(err) {
        return callback(err);
    }
    var getter = source.getGeocoderData.bind(source);

    // Ensures all shards are loaded.
    var ids = Object.keys(freq).map(function(v) { return parseInt(v, 10); });
    source._geocoder.getall(getter, 'freq', ids, function(err) {
        if (err) return callback(err);
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            freq[id][0] = (source._geocoder.get('freq', id) || [0])[0] + freq[id][0];
            source._geocoder.set('freq', id, freq[id]);
        }
        indexDocs(freq[0], freq, callback);
    });

    // Second pass over docs.
    // - Create term => docid index. Uses calculated frequencies to index only
    //   significant terms for each document.
    // - Create id => grid zxy index.
    function indexDocs(approxdocs, freq, callback) {
        var patch = { grid: {}, term: {}, phrase: {}, degen: {} };
        var features = {};

        try {
            for (var i = 0; i < docs.length; i++) loadDoc(docs[i], freq, patch, known);
        } catch(err) {
            return callback(err);
        }

        var q = queue(500);
        q.defer(function(features, callback) {
            feature.putFeatures(source, docs, function(err) {
                if (err) return callback(err);
                // @TODO manually calls _commit on MBTiles sources.
                // This ensures features are persisted to the store for the
                // next run which would not necessarily be the case without.
                // Given that this is a very performant pattern, commit may
                // be worth making a public function in node-mbtiles (?).
                return source._commit ? source._commit(callback) : callback();
            });
        }, features);
        for (var type in patch) setParts(patch[type], type);
        q.awaitAll(callback);

        function setParts(data, type) {
            q.defer(function(data, type, callback) {
                var ids = Object.keys(data);
                var cache = source._geocoder;
                cache.getall(getter, type, ids, function(err) {
                    if (err) return callback(err);
                    for (var i = 0; i < ids.length; i++) {
                        var id = ids[i];
                        // This merges new entries on top of old ones.
                        switch (type) {
                        case 'term':
                            var current = cache.get(type, id);
                            if (current) {
                                current.push.apply(current, data[id]);
                                if (current.length > 2000) current = uniq(current);
                            } else {
                                current = data[id];
                            }
                            cache.set(type, id, current);
                            break;
                        case 'grid':
                        case 'degen':
                            var current = cache.get(type, id);
                            if (current) {
                                current.push.apply(current, data[id]);
                            } else {
                                current = data[id];
                            }
                            cache.set(type, id, current);
                            break;
                        case 'phrase':
                            cache.set(type, id, data[id]);
                            break;
                        }
                    }
                    callback();
                });
            }, data, type);
        }
    }
};

function loadDoc(doc, freq, patch, known) {
    if (!doc._id) throw new Error('doc has no _id');
    if (!doc._text) throw new Error('doc has no _text on _id:' + doc._id);
    if (!doc._center) throw new Error('doc has no _center on _id:' + doc._id);
    if (!doc._zxy || !doc._zxy.length) {
        var tiles = cover.tiles(doc._geometry, {min_zoom: 7, max_zoom: 7});
        doc._zxy = [];
        tiles.forEach(function(tile){
            doc._zxy.push(tile[2]+'/'+tile[0]+'/'+tile[1])
        });
    }
    if (!doc._zxy || !doc._zxy.length) throw new Error('doc failed spatial indexing')

    doc._hash = termops.feature(doc._id.toString());
    doc._grid = doc._grid || [];
    if (doc._zxy) for (var i = 0; i < doc._zxy.length; i++) {
        doc._grid.push(ops.zxy(doc._hash, doc._zxy[i]));
    }

    var texts = doc._text.split(',');
    var termsets = [];
    var termsmaps = [];
    var tokensets = [];
    for (var x = 0; x < texts.length; x++) {
        var tokens = termops.tokenize(texts[x]);
        if (!tokens.length) continue;
        termsets.push(termops.termsWeighted(tokens, freq));
        termsmaps.push(termops.termsMap(tokens));
        tokensets.push(tokens);
    }

    for (var x = 0; x < termsets.length; x++) {
        var terms = termsets[x];
        var sigid = null;
        var sigweight = 0;
        var termsmap = termsmaps[x];

        for (var i = 0; i < terms.length; i++) {
            // Decode the term id, weight from weighted terms.
            var id = terms[i] >>> 4 << 4 >>> 0;
            var weight = terms[i] % 16;
            if (weight > sigweight) {
                sigid = id;
                sigweight = weight;
            }

            // This check avoids doing redundant work for a term once
            // it is known to be indexed. @TODO known issue, this prevents
            // degens from being used as an approach to avoiding fnv1a term
            // collisions.
            if (known.term[id]) continue;
            known.term[id] = true;

            // Degenerate terms are indexed for all terms
            // (not just significant ones).
            var degens = termops.degens(termsmap[id]);
            for (var j = 0; j < degens.length; j = j+2) {
                var d = degens[j];
                patch.degen[d] = patch.degen[d] || [];
                patch.degen[d].push(degens[j+1]);
            }
        }

        // Generate phrase, clustered by most significant term.
        var phrase = termops.phrase(tokensets[x], termsmap[sigid]);
        patch.phrase[phrase] = patch.phrase[phrase] || terms;
        patch.term[sigid] = patch.term[sigid] || [];
        patch.term[sigid].push(phrase);
        patch.grid[phrase] = patch.grid[phrase] || [];
        patch.grid[phrase].push.apply(patch.grid[phrase], doc._grid);

        // Debug significant term selection.
        if (DEBUG) {
            var debug = termsmap;
            var oldtext = terms.map(function(id) {
                id = id >>> 4 << 4 >>> 0;
                return debug[id];
            }).join(' ');
            var sigtext = debug[sigid];
            if (oldtext !== sigtext)  console.log('%s => %s', oldtext, sigtext);
        }
    }
}

function generateFrequency(docs) {
    var freq = {};

    // Uses freq[0] as a convention for storing total # of docs.
    // @TODO determine whether 0 can really ever be a relevant term
    // when using fnv1a.
    freq[0] = [0];
    for (var i = 0; i < docs.length; i++) {
        if (!docs[i]._text) {
            throw new Error('doc has no _text');
        }
        var texts = docs[i]._text.split(',');
        for (var x = 0; x < texts.length; x++) {
            var tokens = termops.tokenize(texts[x]);
            var terms = termops.terms(tokens);
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
    if (source._geocoder._known) delete source._geocoder._known;

    var tasks = [];

    ['freq','term','phrase','grid','degen'].forEach(loadTerm);

    function loadTerm(type) {
        var cache = source._geocoder;
        tasks = tasks.concat(cache.list(type).map(loadShard));

        function loadShard(shard) {
            var ids = cache.list(type, shard);
            for (var i = 0; i < ids.length; i++) {
                var id = ids[i];
                switch (type) {
                    case 'term':
                    case 'grid':
                    case 'degen':
                        var data = source._geocoder.get(type, id) || [];
                        source._geocoder.set(type, id, uniq(data));
                        break;
                }
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
        source._geocoder.unloadall('freq');
        source._geocoder.unloadall('term');
        source._geocoder.unloadall('phrase');
        source._geocoder.unloadall('grid');
        source._geocoder.unloadall('degen');
        callback();
    });
}
