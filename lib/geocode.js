var sm = new (require('sphericalmercator'))(),
    ops = require('./util/ops'),
    phrasematch = require('./phrasematch'),
    context = require('./context'),
    termops = require('./util/termops'),
    getSetRelevance = require('./pure/setrelevance'),
    spatialmatch = require('./spatialmatch'),
    queue = require('queue-async'),
    DEBUG = process.env.DEBUG;

module.exports = function(geocoder, query, options, callback) {
    options = options || {};
    options.stats = options.stats || false;
    options.limit = options.limit || 5;
    options.phrasematch = options.phrasematch || null;

    var indexes = geocoder.indexes;
    var types = Object.keys(indexes);
    var zooms = [];
    var stats = {};
    var queryData = {
        type: 'FeatureCollection',
        query: termops.tokenize(query, true)
    };
    var q = queue();

    stats.totalTime = +new Date();

    // lon,lat pair. Provide the context for this location.
    if (queryData.query.length === 2 &&
        'number' === typeof queryData.query[0] &&
        'number' === typeof queryData.query[1]) {
        return context(geocoder, queryData.query[0], queryData.query[1], null, true, function(err, context) {
            if (err) return callback(err);
            context._relevance = 1;
            queryData.features = [];
            while (context.length) {
                try {
                    queryData.features.push(ops.toFeature(context));
                } catch(err) {
                    return callback(err);
                }
                context.shift();
            }
            stats.totalTime = (+new Date()) - stats.totalTime;
            if (options.stats) queryData.stats = stats;
            return callback(null, queryData);
        });
    }

    // keyword search. Find matching features.
    stats.searchTime = +new Date();

    // search runs `geocoder.search` over each backend with `data.query`,
    // condenses all of the results, and sorts them by potential usefulness.
    types.forEach(function(type) {
        q.defer(loadType, type);
    });

    q.awaitAll(function(err, res) {
        if (err) return callback(err);

        // unpack results
        var feats = [], grids = [];
        for (var i = 0; i < res.length; i++) {
            feats.push(res[i].feat);
            grids.push(res[i].grid);
        }

        zooms = zooms.sort(sortNumeric);
        stats.searchTime = +new Date() - stats.searchTime;
        stats.searchCount = res.length;
        stats.relevTime = +new Date();
        searchComplete(null, feats, grids, zooms);
    });

    function loadType(dbname, callback) {
        phrasematch(indexes[dbname], queryData.query.join(' '), { threshold:options.phrasematch }, searchLoaded);
        function searchLoaded(err, feat, grid, s) {
            if (err) return callback(err);
            if (grid.length) {
                var z = indexes[dbname]._geocoder.zoom;
                if (zooms.indexOf(z) === -1) zooms.push(z);
            }
            callback(null, { feat: feat, grid: grid });
            if (DEBUG) stats['search.' + dbname] = s;
        }
    }

    // ## searchComplete
    //
    // Calls the callback to `geocode` when complete. Called once per
    // call to `geocode`.
    //
    // @param {Object} err an error potentially given by the caller
    // @param {Array} feats a list of feature objects
    // @param {Array} grids a list of grid objects
    // @param {Array} zooms a list of zoom numbers
    function searchComplete(err, feats, grids, zooms) {
        if (err) return callback(err);
        spatialmatch(indexes, types, queryData.query, stats, geocoder, feats, grids, zooms, function(err, contexts) {
            if (err) return callback(err);

            try {
                queryData.features = contexts.slice(0, options.limit).map(ops.toFeature);
            } catch(err) {
                return callback(err);
            }
            stats.relev = contexts.length ? contexts[0]._relevance : 0;
            stats.totalTime = (+new Date()) - stats.totalTime;

            if (options.stats) queryData.stats = stats;

            return callback(null, queryData);
        });
    }
};

function sortNumeric(a,b) { return a < b ? -1 : 1; }
