var sm = new (require('sphericalmercator'))(),
    ops = require('./util/ops'),
    phrasematch = require('./phrasematch'),
    context = require('./context'),
    termops = require('./util/termops'),
    spatialmatch = require('./spatialmatch'),
    verifymatch = require('./verifymatch'),
    queue = require('queue-async'),
    feature = require('./util/feature'),
    Relev = require('./util/relev'),
    proximity = require('./util/proximity');
var dedupe = require('./util/dedupe');
var errcode = require('err-code');

module.exports = function(geocoder, query, options, callback) {
    options = options || {};
    options.stats = options.stats || false;
    options.limit = options.limit || 5;
    options.debug = options.debug ? {
        id: termops.feature(options.debug),
        extid: options.debug
    } : false;
    options.allow_dupes = options.allow_dupes || false;

    // Types option
    if (options.types) {
        if (!Array.isArray(options.types) || options.types.length < 1)
            return callback(errcode('options.types must be an array with at least 1 type', 'EINVALID'));
        var l = options.types.length;
        while (l--) if (!geocoder.byname[options.types[l]])
            return callback(errcode('Type "' + options.types[l] + '" is not a known type. Must be one of: ' + Object.keys(geocoder.byname).join(', '), 'EINVALID'));
    }

    //Proximity is currently not enabled
    if (options.proximity) {
        if (!options.proximity instanceof Array || options.proximity.length !== 2)
            return callback(errcode('Proximity must be an array in the form [lon, lat]', 'EINVALID'));
        if (isNaN(options.proximity[0]) || options.proximity[0] < -180 || options.proximity[0] > 180)
            return callback(errcode('Proximity lon value must be a number between -180 and 180', 'EINVALID'));
        if (isNaN(options.proximity[1]) || options.proximity[1] < -90 || options.proximity[1] > 90)
            return callback(errcode('Proximity lat value must be a number between -90 and 90', 'EINVALID'));
    }

    // Allows user to search for specific ID
    var asId = termops.id(geocoder.byname, query);
    if (asId) return idGeocode(geocoder, asId, options, callback);

    // Reverse geocode: lon,lat pair. Provide the context for this location.
    var tokenized = termops.tokenize(query, true);
    if (tokenized.length === 2 &&
        'number' === typeof tokenized[0] &&
        'number' === typeof tokenized[1]) {
        return reverseGeocode(geocoder, tokenized, options, callback);
    }

    // Forward geocode.
    return forwardGeocode(geocoder, query, options, callback);
};

function idGeocode(geocoder, asId, options, callback) {
    var q = queue(5);
    var extid = asId.dbname + '.' + asId.id;
    var indexes = geocoder.byname[asId.dbname];
    for (var i = 0; i < indexes.length; i++) {
        q.defer(function(source, id, done) {
            feature.getFeatureById(source, id, function(err, data) {
                if (err) return done(err);
                if (!data) return done();
                data.properties['carmen:extid'] = extid;
                done(null, data);
            });
        }, indexes[i], asId.id);
    }
    q.awaitAll(function(err, features) {
        if (err) return callback(err);
        var result = {
            "type": "FeatureCollection",
            "query": [extid],
            "features": []
        };
        for (var i = 0; i < features.length; i++) {
            if (!features[i]) continue;
            var f = ops.toFeature([features[i]]);
            f.relevance = features[i].properties['carmen:score'] || 0;
            result.features.push(f);
        }
        return callback(null, result);
    });
}

function reverseGeocode(geocoder, tokenized, options, callback) {
    var queryData = {
        type: 'FeatureCollection',
        query: tokenized
    };
    context(geocoder, queryData.query[0], queryData.query[1], { full:true }, function(err, context) {
        if (err) return callback(err);
        context._relevance = 1;
        queryData.features = [];
        try {
            while (context.length) {
                // filter context results by types if specified.
                if (options.types) {
                    var type = geocoder.byidx[context[0].properties['carmen:dbidx']]._geocoder.name;
                    if (options.types.indexOf(type) === -1) {
                        context.shift();
                        continue;
                    }
                }
                queryData.features.push(ops.toFeature(context, geocoder.byidx[context[0].properties['carmen:dbidx']]._geocoder.geocoder_address));
                context.shift();
            }
        } catch (err) {
            return callback(err);
        }
        return callback(null, queryData);
    });
}

var uniq = require('./util/uniq');
var idmod = Math.pow(2,25);

function forwardGeocode(geocoder, query, options, callback) {
    var queryData = {
        type: 'FeatureCollection',
        query: termops.tokenize(query)
    };
    var zooms = [];
    var grids = [];
    var stats = {};
    var q = queue(5);

    if (options.stats) {
        var stats = {};
        stats.time = +new Date();
        stats.phrasematch = {};
        stats.spatialmatch = {};
        stats.verifymatch = {};
        stats.phrasematch.time = +new Date();
    }

    var mp25 = Math.pow(2,25);
    var mp33 = Math.pow(2,33);

    // search runs `geocoder.search` over each backend with `data.query`,
    // condenses all of the results, and sorts them by potential usefulness.
    for (var dbid in geocoder.indexes) q.defer(phrasematch, geocoder.indexes[dbid], query);
    q.awaitAll(function(err, phrasematches) {
        if (err) return callback(err);
        if (options.stats) {
            stats.spatialmatch.time = +new Date;
            stats.phrasematch.time = +new Date - stats.phrasematch.time;
        }
        if (options.debug) {
            options.debug.phrasematch = {};
            for (var idx = 0; idx < phrasematches.length; idx++) {
                var id = geocoder.byidx[idx]._geocoder.id;
                options.debug.phrasematch[id] = {};
                for (var x = 0; x < phrasematches[idx].length; x++) {
                    var matched = phrasematches[idx][x];
                    var phraseText = matched.join(' ');
                    options.debug.phrasematch[id][phraseText] = matched.weight;
                }
            }
        }

        spatialmatch(queryData.query, phrasematches, options, geocoder, spatialmatchComplete);
    });

    function spatialmatchComplete(err, matched) {
        if (err) return callback(err);

        if (options.stats) {
            stats.spatialmatch.time = +new Date - stats.spatialmatch.time;
            stats.spatialmatch.count = matched.results.length;
            stats.verifymatch.time = +new Date;
        }
        if (options.debug) {
            options.debug.spatialmatch = null;
            for (var x = 0; x < matched.results.length; x++) {
                if (matched.results[x][0].id !== options.debug.id) continue;
                options.debug.spatialmatch = matched.results[x];
                options.debug.spatialmatch_position = x;
            }
        }

        verifymatch(queryData.query, stats, geocoder, matched, options, function(err, contexts) {
            if (err) return callback(err);
            if (options.stats) {
                stats.verifymatch.time = +new Date - stats.verifymatch.time;
                stats.verifymatch.count = contexts.length;
            }
            if (options.debug) {
                options.debug.verifymatch = null;
                for (var x = 0; x < contexts.length; x++) {
                    if (contexts[x][0].id !== options.debug.extid) continue;
                    options.debug.verifymatch = contexts[x];
                    options.debug.verifymatch_position = x;
                }
            }

            queryData.features = [];
            try {
                for (var i = 0; i < contexts.length; i++) {
                    var feature = ops.toFeature(contexts[i], geocoder.byidx[contexts[i][0].properties['carmen:dbidx']]._geocoder.geocoder_address);
                    queryData.features.push(feature);
                }
            } catch (err) {
                return callback(err);
            }

            if (!options.allow_dupes) queryData.features = dedupe(queryData.features);

            queryData.features = queryData.features.slice(0, options.limit);

            if (options.stats) {
                stats.relev = contexts.length ? contexts[0]._relevance : 0;
                stats.time = (+new Date()) - stats.time;
                queryData.stats = stats;
            }
            if (options.debug) queryData.debug = options.debug;
            return callback(null, queryData);
        });
    }
}
