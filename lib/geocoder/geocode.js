'use strict';
const ops = require('./ops'),
    phrasematch = require('./phrasematch'),
    context = require('./context'),
    termops = require('../text-processing/termops'),
    spatialmatch = require('./spatialmatch'),
    verifymatch = require('./verifymatch'),
    queue = require('d3-queue').queue,
    feature = require('../util/feature'),
    token = require('../text-processing/token'),
    cl = require('../text-processing/closest-lang'),
    constants = require('../constants'),
    dedupe = require('./dedupe'),
    errcode = require('err-code'),
    filter = require('./filter-sources'),
    uniq = require('../util/uniq');

/**
 * Main interface for querying an index and returning ranked results.
 *
 * @access public
 *
 * @param {Geocoder} geocoder - the geocoder itself
 * @param {string} query - a query string. If the query appears to be a longitude, latitude pair (eg "-75.1327,40.0115"), it is assumed to be a reverse query.
 * @param {Object} options - options
 * @param {Array<number>} [options.proximity] - a `[ lon, lat ]` array to use for biasing search results. Features closer to the proximity value will be given priority over those further from the proximity value.
 * @param {Array<string>} [options.types] - an array of string types. Only features matching one of the types specified will be returned.
 * @param {Array<string>} [options.language] - One or more {@link https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes ISO 639-1 codes}, separated by commas to be displayed. Only the first language code is used when prioritizing forward geocode results to be matched. If `carmen:text_{lc}` and/or `geocoder_format_{lc}` are available on a features, response will be returned in that language and appropriately formatted.
 * @param {string} [options.languageMode] - string. If set to `"strict"` the returned features will be filtered to only those with text matching the language specified by the
 * @param {Array<number>} [options.bbox] - a `[ w, s, e, n ]` bbox array to use for limiting search results. Only features inside the provided bbox will be included.
 * @param {number} [options.limit=5] - Adjust the maximium number of features returned.
 * @param {boolean} [options.allow_dupes=false] - If true, carmen will allow features with identical place names to be returned.
 * @param {boolean} [options.debug=false] - If true, the carmen debug object will be returned as part of the results and internal carmen properties will be preserved on feature output.
 * @param {boolean} [options.stats=false] - If true, the carmen stats object will be returned as part of the results.
 * @param {boolean} [options.indexes=false] - If true, indexes will be returned as part of the results.
 * @param {boolean} [options.autocomplete=true] - If true, indexes will be returned as part of the results.
 * @param {string} [options.reverseMode='distance'] - Choices are `'distance'`, `'score'`. Affects the way that a result's context array is built
 * @param {boolean} [options.routing=false] - If true, routable_points will be returned as part of the results for features whose sources are flagged as `geocoder_routable` in the tile json.
 *
 * @param {function} callback - a callback function
 */
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
    options.fuzzyMatch = options.fuzzyMatch === undefined ? true : options.fuzzyMatch;
    options.bbox = options.bbox || false;
    options.reverseMode = options.reverseMode || 'distance';
    options.routing = options.routing || false;

    // these options are parameterized cutoffs that can be tweaked for performance benefits
    // or for improving result quality
    options.stackable_limit = options.stackable_limit || constants.STACKABLE_LIMIT;
    options.spatialmatch_stack_limit = options.spatialmatch_stack_limit || constants.SPATIALMATCH_STACK_LIMIT;
    options.max_correction_length = options.max_correction_length || constants.MAX_CORRECTION_LENGTH;
    options.verifymatch_stack_limit = options.verifymatch_stack_limit || constants.VERIFYMATCH_STACK_LIMIT;

    // Limit query length
    if (query.length > constants.MAX_QUERY_CHARS) {
        return callback(errcode('Query too long - ' + query.length + '/' + constants.MAX_QUERY_CHARS + ' characters', 'EINVALID'));
    }

    // Types option
    if (options.types) {
        if (!Array.isArray(options.types) || options.types.length < 1)
            return callback(errcode('options.types must be an array with at least 1 type', 'EINVALID'));

        const acceptableTypes = new Set([...Object.keys(geocoder.bytype), ...Object.keys(geocoder.bysubtype)]);

        const requestedTypes = new Set(options.types);
        for (const type of options.types) {
            if (!acceptableTypes.has(type)) {
                return callback(errcode('Type "' + type + '" is not a known type. Must be one of: ' + Array.from(acceptableTypes).join(', '), 'EINVALID'));
            } else if (type.match(/\./) && requestedTypes.has(type.split('.')[0])) {
                // if we're looking at something like poi.landmark and we also have poi, remove poi.landmark
                requestedTypes.delete(type);
            }
        }
        options.types = Array.from(requestedTypes).sort();
    }

    // Stacks option
    if (options.stacks) {
        if (!Array.isArray(options.stacks) || options.stacks.length < 1)
            return callback(errcode('options.stacks must be an array with at least 1 stack', 'EINVALID'));
        let k = options.stacks.length;
        while (k--) {
            options.stacks[k] = options.stacks[k].toLowerCase();

            if (!geocoder.bystack[options.stacks[k]])
                return callback(errcode('Stack "' + options.stacks[k] + '" is not a known stack. Must be one of: ' + Object.keys(geocoder.bystack).join(', '), 'EINVALID'));
        }
    }

    // Proximity is currently not enabled
    if (options.proximity) {
        if (!(options.proximity instanceof Array) || options.proximity.length !== 2)
            return callback(errcode('Proximity must be an array in the form [lon, lat]', 'EINVALID'));
        if (isNaN(options.proximity[0]) || options.proximity[0] < -180 || options.proximity[0] > 180)
            return callback(errcode('Proximity lon value must be a number between -180 and 180', 'EINVALID'));
        if (isNaN(options.proximity[1]) || options.proximity[1] < -90 || options.proximity[1] > 90)
            return callback(errcode('Proximity lat value must be a number between -90 and 90', 'EINVALID'));
    }

    // check that language code is valid
    if (options.language) {
        options.language = Array.isArray(options.language) ? options.language : options.language.split(',');
        const invalidLanguages = options.language.filter((language) => {
            return !cl.hasLanguage(language);
        });
        if (invalidLanguages.length) return callback(errcode('\'' + invalidLanguages.join(',') + '\' is not a valid language code', 'EINVALID'));
        if (options.language.length > 20) return callback(errcode('options.language should be a list of no more than 20 languages', 'EINVALID'));
        if (uniq(options.language).length !== options.language.length) return callback(errcode('options.language should be a list of unique language codes', 'EINVALID'));
    }

    // check that the language mode is valid
    if (options.languageMode) {
        if (options.languageMode !== 'strict') return callback(errcode('\'' + options.languageMode + '\' is not a valid language mode', 'EINVALID'));
    }


    // bbox option
    if (options.bbox) {
        // check if valid bbox
        if (!(options.bbox instanceof Array) || options.bbox.length !== 4)
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
        if (options.reverseMode !== 'score' && options.reverseMode !== 'distance') return callback(errcode(options.reverseMode + ' is not a valid reverseMode. Must be one of: score, distance', 'EINVALID'));
    }

    // Allows user to search for specific ID
    const asId = termops.id(geocoder.bytype, query);
    if (asId) return idGeocode(geocoder, asId, options, callback);

    // TODO don't use tokenization for this!
    // Reverse geocode: lon,lat pair. Provide the context for this location.
    const tokenized = termops.tokenize(query, true);

    if (tokenized.tokens.length > constants.MAX_QUERY_TOKENS) {
        return callback(errcode('Query too long - ' + tokenized.tokens.length + '/' + constants.MAX_QUERY_TOKENS + ' tokens', 'EINVALID'));
    }

    if (tokenized.tokens.length === 2 &&
        'number' === typeof tokenized.tokens[0] &&
        'number' === typeof tokenized.tokens[1]) {
        return reverseGeocode(geocoder, tokenized.tokens, options, callback);
    }

    // Forward geocode.
    return forwardGeocode(geocoder, query, options, callback);
};

/**
 * Look up a feature by identifier
 *
 * @param {Object} geocoder - instance of the geocoder
 * @param {string} asId - a typed identifier, formatted `<type>.<id>`, eg `"place.1234"`
 * @param {Object} options - todo
 * @param {function} callback - a callback function
 */
function idGeocode(geocoder, asId, options, callback) {
    const q = queue(5);
    const extid = asId.dbname + '.' + asId.id;
    const indexes = geocoder.bytype[asId.dbname];
    for (let i = 0; i < indexes.length; i++) {
        q.defer((source, id, done) => {
            feature.getFeatureById(source, id, (err, data) => {
                if (err) return done(err);
                if (!data) return done();
                data.properties['carmen:extid'] = extid;
                done(null, data);
            });
        }, indexes[i], asId.id);
    }
    q.awaitAll((err, features) => {
        if (err) return callback(err);

        const resultIndexes = {};

        const result = {
            'type': 'FeatureCollection',
            'query': [extid],
            'features': []
        };
        for (let i = 0; i < features.length; i++) {
            if (!features[i]) continue;
            const f = ops.toFeature([features[i]]);
            f.relevance = 1;
            resultIndexes[features[i].properties['carmen:index']] = true;
            result.features.push(f);
        }

        if (options.indexes) result.indexes = Object.keys(resultIndexes);

        return callback(null, result);
    });
}

/**
* reverseGeocode Given a lat,long pair returns the feature to the user
*
* @param {Object} geocoder - instance of the geocoder
* @param {Object} tokenized - tokenized version of the query
* @param {Object} options - options sent along with the query by the user
*
*/
function reverseGeocode(geocoder, tokenized, options, callback) {
    if (options.limit && options.types && options.types.length === 1) {
        options.limit = options.limit > 5 ? 5 : options.limit;
    } else if (options.limit > 1) {
        return callback(errcode('limit must be combined with a single type parameter when reverse geocoding', 'EINVALID'));
    }

    let parentTypes = [];
    if (options.types) parentTypes = options.types.map((t) => {
        return t.split('.')[0];
    });

    // set a maxidx to limit context i/o to only allowed types and their
    // parent features. When a types filter is present this limits maxidx
    // to a lower number. When there's no types filter this allows all
    // indexes to do i/o.
    let maxidx = 0;
    for (const type in geocoder.bytype) {
        if (options.types && parentTypes.indexOf(type) === -1)
            continue;
        for (let i = 0; i < geocoder.bytype[type].length; i++)
            maxidx = Math.max(maxidx, geocoder.bytype[type][i].idx + 1);
    }
    const queryData = {
        type: 'FeatureCollection',
        query: tokenized
    };

    if (options.limit > 1) {
        // returns an array of lat long pairs of features closest to the points provided
        context.nearest(geocoder, queryData.query[0], queryData.query[1], options.types[0], options.limit, (err, feats) => {
            if (err) return callback(err);

            const q = queue();

            for (let feat_it = 0; feat_it < feats.length; feat_it++) {
                const position = feats[feat_it];
                q.defer(context, geocoder, position, {
                    full: true,
                    types: options.types,
                    stacks: options.stacks,
                    targetFeature: [position.source_id, position.tmpid]
                });
            }

            q.awaitAll((err, contexts) => {
                if (err) return callback(err);

                // deduplicate contexts, respecting the fact that
                // address features are allowed multiple contexts
                const observedIds = [];
                const dedupedContexts = [];
                for (let context_i = 0; context_i < contexts.length; context_i++) {
                    const feat = contexts[context_i][0];
                    if (!feat) continue;
                    if (feat.properties && feat.properties['carmen:tmpid']) {
                        const dedupeId = feat.properties['carmen:tmpid'] + '-' + (feat.properties['carmen:address'] || '');
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
            reverseMode: options.reverseMode,
            routing: options.routing
        }, (err, context) => {
            if (err) return callback(err);
            // If a single result is being returned, split the context array into
            // each of its compenents. So [poi, place, country]
            // => [[poi, place, country], [place, country], [country]]
            const contexts = [];
            while (context.length) {
                const clone = context.slice(0);
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

/**
 * forwardGeocode returns a feature given a query
 *
 * @param {Object} geocoder - an instance of the geocoder
 * @param {string} text - query text
 * @param {Object} options - specific options sent with the query string by the user
 * @param {Function} callback - callback called with the feature after going through phrasematch, spatialmatch and after the results
 * have been verified
 */
function forwardGeocode(geocoder, text, options, callback) {
    options.limit = options.limit ? (options.limit > 10 ? 10 : options.limit) : 5;
    const query = termops.tokenize(token.replaceGlobalTokens(geocoder.replacer, text));
    const queryData = {
        type: 'FeatureCollection',
        query: query.tokens
    };
    const q = queue(5);

    let stats;
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
    let maxidx = 0;
    for (const type in geocoder.bytype) {
        if (options.types && options.types.indexOf(type) === -1) continue;
        for (let i = 0; i < geocoder.bytype[type].length; i++) {
            options.allowed_idx[geocoder.bytype[type][i].idx] = true;
            maxidx = Math.max(maxidx, geocoder.bytype[type][i].idx + 1);
        }
    }

    for (const subtype in geocoder.bysubtype) {
        if (options.types && options.types.indexOf(subtype) === -1) continue;
        for (let st = 0; st < geocoder.bysubtype[subtype].length; st++) {
            options.allowed_idx[geocoder.bysubtype[subtype][st].idx] = true;
            maxidx = Math.max(maxidx, geocoder.bysubtype[subtype][st].idx + 1);
        }
    }

    // search runs `geocoder.search` over each backend with `data.query`,
    // condenses all of the results, and sorts them by potential usefulness.
    for (const dbid in geocoder.indexes) {
        if (geocoder.indexes[dbid].idx < maxidx) {
            q.defer(phrasematch, geocoder.indexes[dbid], query, options);
        }
    }
    q.awaitAll((err, _phrasematchResults) => {
        if (err) return callback(err);

        if (options.stats) {
            stats.spatialmatch.time = +new Date;
            stats.phrasematch.time = +new Date - stats.phrasematch.time;
        }
        if (options.debug) {
            options.debug.phrasematch = {};
            for (const resultSet of _phrasematchResults) {
                const id = geocoder.byidx[resultSet.idx].id;
                options.debug.phrasematch[id] = {};
                for (let x = 0; x < resultSet.phrasematches.length; x++) {
                    const matched = resultSet.phrasematches[x];
                    const phraseText = matched.subquery.join(' ');
                    options.debug.phrasematch[id][phraseText] = matched.weight;
                }
            }
        }

        const phrasematchResults = _phrasematchResults.filter((resultSet) => resultSet.phrasematches.length > 0);
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
            for (let x = 0; x < matched.results.length; x++) {
                const spatialmatch = matched.results[x];
                if (spatialmatch.covers[0].id !== options.debug.id) continue;
                options.debug.spatialmatch = spatialmatch;
                options.debug.spatialmatch_position = x;
            }
        }
        if (matched.waste && matched.waste.length) {
            queryData.waste = matched.waste.map((idxSet) => {
                return idxSet.map((idx) => { return geocoder.byidx[idx].id; });
            });
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
            for (let x = 0; x < contexts.length; x++) {
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
    let features = [];
    const indexes = {};

    for (let i = 0; i < contexts.length; i++) {
        const context = contexts[i];
        const index = geocoder.indexes[context[0].properties['carmen:index']];
        if (!filter.featureAllowed(index, context[0], options)) continue;

        // Convert this context array to a feature
        features.push(ops.toFeature(context, index.geocoder_format, options.language, options.languageMode, options.debug, geocoder, options.clipBBox, options.routing));

        // Record index usage for this feature
        if (options.indexes) for (let k = 0; k < context.length; k++) {
            indexes[context[k].properties['carmen:index']] = true;
        }
    }

    if (!options.allow_dupes) features = dedupe(features);

    if (options.limit) features = features.slice(0, options.limit);

    const data = { features: features };
    if (options.indexes) data.indexes = Object.keys(indexes);
    return data;
}
