var ops = require('./util/ops'),
    phrasematch = require('./phrasematch'),
    context = require('./context'),
    termops = require('./util/termops'),
    spatialmatch = require('./spatialmatch'),
    verifymatch = require('./verifymatch'),
    queue = require('d3-queue').queue,
    feature = require('./util/feature'),
    token = require('./util/token'),
    cl = require('./util/closest-lang'),
    constants = require('./constants'),
    dedupe = require('./util/dedupe'),
    errcode = require('err-code'),
    filter = require('./util/filter');

module.exports = function(geocoder, query, options, callback) {
    options = options || {};
    options.stats = options.stats || false;
    options.debug = options.debug ? {
        id: termops.feature(options.debug),
        extid: options.debug
    } : false;
    options.allow_dupes = options.allow_dupes || false;
    options.indexes = options.indexes || false;
    options.autocomplete = options.autocomplete === undefined ? true : options.autocomplete;
    options.bbox = options.bbox || false;
    options.reverseMode = options.reverseMode || 'distance';

    //Limit query length
    if (query.length > constants.MAX_QUERY_CHARS) {
        return callback(errcode('Query too long - ' + query.length + '/' + constants.MAX_QUERY_CHARS + ' characters', 'EINVALID'));
    }

    // Types option
    if (options.types) {
        if (!Array.isArray(options.types) || options.types.length < 1)
            return callback(errcode('options.types must be an array with at least 1 type', 'EINVALID'));

        var l = options.types.length;
        var acceptableTypes = Object.keys(geocoder.bytype).concat(Object.keys(geocoder.bysubtype));
        while (l--) {
            if (acceptableTypes.indexOf(options.types[l]) === -1) {
                return callback(errcode('Type "' + options.types[l] + '" is not a known type. Must be one of: ' + acceptableTypes.join(', '), 'EINVALID'));
            } else {
                //remove any cases like poi and poi.landmark
                var subtypeAndTypeExist = geocoder.bytype[options.types[l]] && ((options.types).toString().indexOf(options.types[l]) != l);
                var subtypeIndexWhenTypeExists = subtypeAndTypeExist ? (options.types).toString().indexOf(options.types[l]) : -1;
                if (subtypeAndTypeExist) {
                    options.types.splice(subtypeIndexWhenTypeExists, 1);
                }
            }
        }
    }

    // Stacks option
    if (options.stacks) {
        if (!Array.isArray(options.stacks) || options.stacks.length < 1)
            return callback(errcode('options.stacks must be an array with at least 1 stack', 'EINVALID'));
        var k = options.stacks.length;
        while (k--) {
            options.stacks[k] = options.stacks[k].toLowerCase();

            if (!geocoder.bystack[options.stacks[k]])
                return callback(errcode('Stack "' + options.stacks[k] + '" is not a known stack. Must be one of: ' + Object.keys(geocoder.bystack).join(', '), 'EINVALID'));
        }
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

    // check that language code is valid
    if (options.language) {
        if (!cl.hasLanguage(options.language)) return callback(errcode('\'' + options.language + '\' is not a valid language code', 'EINVALID'));
    }

    // check that the language mode is valid
    if (options.languageMode) {
        if (options.languageMode !== 'strict') return callback(errcode('\'' + options.languageMode + '\' is not a valid language mode', 'EINVALID'));
    }


    // bbox option
    if (options.bbox) {
        // check if valid bbox
        if (!options.bbox instanceof Array || options.bbox.length !== 4)
            return callback(errcode('BBox is not valid. Must be an array of format [minX, minY, maxX, maxY]', 'EINVALID'));
        if (isNaN(options.bbox[0]) || options.bbox[0] < -180 || options.bbox[0] > 180)
            return callback(errcode('BBox minX value must be a number between -180 and 180', 'EINVALID'));
        if (isNaN(options.bbox[1]) || options.bbox[1] < -90 || options.bbox[1] > 90)
            return callback(errcode('BBox minY value must be a number between -90 and 90', 'EINVALID'));
        if (isNaN(options.bbox[2]) || options.bbox[2] < -180 || options.bbox[2] > 180)
            return callback(errcode('BBox maxX value must be a number between -180 and 180', 'EINVALID'));
        if (isNaN(options.bbox[3]) || options.bbox[3] < -90 || options.bbox[3] > 90)
            return callback(errcode('BBox maxY value must be a number between -90 and 90', 'EINVALID'));
        if (options.bbox[0] > options.bbox[2])
            return callback(errcode('BBox minX value cannot be greater than maxX value', 'EINVALID'));
        if (options.bbox[1] > options.bbox[3])
            return callback(errcode('BBox minY value cannot be greater than maxY value', 'EINVALID'));
    }

    if (options.reverseMode) {
        if (options.reverseMode !== 'score' && options.reverseMode !== 'distance') return callback(errcode(options.reverseMode + ' is not a valid reverseMode. Must be one of: score, distance', 'EINVALID'))
    }

    // Allows user to search for specific ID
    var asId = termops.id(geocoder.bytype, query);
    if (asId) return idGeocode(geocoder, asId, options, callback);

    // Reverse geocode: lon,lat pair. Provide the context for this location.
    var tokenized = termops.tokenize(query, true);

    if (tokenized.length > constants.MAX_QUERY_TOKENS) {
        return callback(errcode('Query too long - ' + tokenized.length + '/' + constants.MAX_QUERY_TOKENS + ' tokens', 'EINVALID'));
    }

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
    var indexes = geocoder.bytype[asId.dbname];
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
            f.relevance = 1;
            result.features.push(f);
        }
        return callback(null, result);
    });
}

function reverseGeocode(geocoder, tokenized, options, callback) {
    if (options.limit && options.types && options.types.length === 1) {
        options.limit = options.limit > 5 ? 5 : options.limit;
    } else if (options.limit > 1) {
        return callback(errcode('limit must be combined with a single type parameter when reverse geocoding', 'EINVALID'));
    }

    var parentTypes = [];
    if (options.types) parentTypes = options.types.map(function(t) {
        return t.split('.')[0];
    });

    // set a maxidx to limit context i/o to only allowed types and their
    // parent features. When a types filter is present this limits maxidx
    // to a lower number. When there's no types filter this allows all
    // indexes to do i/o.
    var maxidx = 0;
    for (var type in geocoder.bytype) {
        if (options.types && parentTypes.indexOf(type) === -1)
            continue;
        for (var i = 0; i < geocoder.bytype[type].length; i++)
            maxidx = Math.max(maxidx, geocoder.bytype[type][i].idx + 1);
    }
    var queryData = {
        type: 'FeatureCollection',
        query: tokenized
    };

    if (options.limit > 1) {
        context.nearest(geocoder, queryData.query[0], queryData.query[1], options.types[0], options.limit, function(err, feats) {
            if (err) return callback(err);

            var q = queue();

            for (var feat_it = 0; feat_it < feats.length; feat_it++) {
                var position = feats[feat_it];
                q.defer(context, geocoder, position, {
                    full: true,
                    types: options.types,
                    stacks: options.stacks,
                    targetFeature: [position.source_id, position.tmpid]
                });
            }

            q.awaitAll(function(err, contexts) {
                if (err) return callback(err);

                // deduplicate contexts, respecting the fact that
                // address features are allowed multiple contexts
                var observedIds = [];
                var dedupedContexts = [];
                for (var context_i = 0; context_i < contexts.length; context_i++) {
                    var feat = contexts[context_i][0];
                    if (!feat) continue;
                    if (feat.properties && feat.properties['carmen:tmpid']) {
                        var dedupeId = feat.properties['carmen:tmpid'] + '-' + (feat.properties['carmen:address'] || '');
                        if (observedIds.indexOf(dedupeId) !== -1)
                            continue;
                        observedIds.push(dedupeId);
                    }
                    contexts[context_i]._relevance = 1;
                    dedupedContexts.push(contexts[context_i]);
                }

                finalize(null, dedupedContexts);
            });
        });
    } else {
        context(geocoder, queryData.query, {
            full: true,
            maxidx: maxidx,
            types: options.types,
            stacks: options.stacks,
            reverseMode: options.reverseMode
        }, function(err, context) {
            if (err) return callback(err);
            //If a single result is being returned, split the context array into
            //each of its compenents. So [poi, place, country]
            // => [[poi, place, country], [place, country], [country]]
            var contexts = [];
            while (context.length) {
                var clone = context.slice(0);
                clone._relevance = 1;
                contexts.push(clone);
                context.shift();
            }
            finalize(null, contexts);
        });
    }

    function finalize(err, contexts) {
        try {
            Object.assign(queryData, toFeatures(geocoder, contexts, options));
        } catch (err) {
            return callback(err);
        }
        return callback(null, queryData);
    }
}

function forwardGeocode(geocoder, query, options, callback) {
    options.limit = options.limit ? (options.limit > 10 ? 10 : options.limit) : 5;
    query = token.replaceToken(geocoder.replacer, query);
    var queryData = {
        type: 'FeatureCollection',
        query: termops.tokenize(query)
    };
    var q = queue(5);

    var stats;
    if (options.stats) {
        stats = {};
        stats.time = +new Date();
        stats.phrasematch = {};
        stats.spatialmatch = {};
        stats.verifymatch = {};
        stats.phrasematch.time = +new Date();
    }

    // set an allowed_idx hash to limit spatialmatch stack i/o only to features
    // that are allowed by options.types.
    options.allowed_idx = {};
    for (var type in geocoder.bytype) {
        if (options.types && options.types.indexOf(type) === -1) continue;
        for (var i = 0; i < geocoder.bytype[type].length; i++) {
            options.allowed_idx[geocoder.bytype[type][i].idx] = true;
        }
    }

    for (var subtype in geocoder.bysubtype) {
        if (options.types && options.types.indexOf(subtype) === -1) continue;
        for (var st = 0; st < geocoder.bysubtype[subtype].length; st++) {
            options.allowed_idx[geocoder.bysubtype[subtype][st].idx] = true;
        }
    }

    // search runs `geocoder.search` over each backend with `data.query`,
    // condenses all of the results, and sorts them by potential usefulness.
    for (var dbid in geocoder.indexes) q.defer(phrasematch, geocoder.indexes[dbid], query, options);
    q.awaitAll(function(err, phrasematchResults) {
        if (err) return callback(err);
        if (options.stats) {
            stats.spatialmatch.time = +new Date;
            stats.phrasematch.time = +new Date - stats.phrasematch.time;
        }
        if (options.debug) {
            options.debug.phrasematch = {};
            for (var idx = 0; idx < phrasematchResults.length; idx++) {
                var id = geocoder.byidx[idx].id;
                options.debug.phrasematch[id] = {};
                for (var x = 0; x < phrasematchResults[idx].phrasematches.length; x++) {
                    var matched = phrasematchResults[idx].phrasematches[x];
                    var phraseText = matched.subquery.join(' ');
                    options.debug.phrasematch[id][phraseText] = matched.weight;
                }
            }
        }

        spatialmatch(queryData.query, phrasematchResults, options, spatialmatchComplete);
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
                var spatialmatch = matched.results[x];
                if (spatialmatch.covers[0].id !== options.debug.id) continue;
                options.debug.spatialmatch = spatialmatch;
                options.debug.spatialmatch_position = x;
            }
        }
        if (matched.waste && matched.waste.length) {
            queryData.waste = matched.waste.map(function(idxSet) {
                return idxSet.map(function(idx) { return geocoder.byidx[idx].id; });
            })
        }

        verifymatch(queryData.query, stats, geocoder, matched, options, finalize);
    }

    function finalize(err, contexts) {
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

        try {
            Object.assign(queryData, toFeatures(geocoder, contexts, options));
        } catch (err) {
            return callback(err);
        }

        if (options.stats) {
            stats.relev = contexts.length ? contexts[0]._relevance : 0;
            stats.time = (+new Date()) - stats.time;
            queryData.stats = stats;
        }

        if (options.debug) queryData.debug = options.debug;

        return callback(null, queryData);
    }
}

/**
 * Takes an array of contexts and returns geojson features, recording
 * used indexes along the way. Any of our `raw contexts => final output`
 * logic will ideally end up here.
 *
 * @param {Carmen} geocoder A carmen object used to generate the results
 * @param {array} contexts A contexts array of results to convert to features
 * @param {object} options A geocoder query options object
 * @return {object}
 */
function toFeatures(geocoder, contexts, options) {
    var features = [];
    var indexes = {};

    for (var i = 0; i < contexts.length; i++) {
        var context = contexts[i];
        var index = geocoder.indexes[context[0].properties['carmen:index']];
        if (!filter.featureAllowed(index, context[0], options)) continue;

        // Convert this context array to a feature
        features.push(ops.toFeature(context, index.geocoder_format, options.language, options.languageMode, options.debug));

        // Record index usage for this feature
        if (options.indexes) for (var k = 0; k < context.length; k++) {
            indexes[context[k].properties['carmen:index']] = true;
        }
    }

    if (!options.allow_dupes) features = dedupe(features);

    if (options.limit) features = features.slice(0, options.limit);

    var data = { features: features };
    if (options.indexes) data.indexes = Object.keys(indexes);
    return data;
}

