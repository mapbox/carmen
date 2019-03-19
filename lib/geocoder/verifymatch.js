'use strict';
const addressItp = require('./addressitp');
const addressCluster = require('./addresscluster');
const queue = require('d3-queue').queue;
const context = require('./context');
const feature = require('../util/feature');
const proximity = require('../util/proximity');
const closestLang = require('../text-processing/closest-lang');
const bbox = require('../util/bbox');
const filter = require('./filter-sources');
const routablePoints = require('./routablepoint');

module.exports = verifymatch;
module.exports.verifyFeatures = verifyFeatures;
module.exports.sortFeature = sortFeature;
module.exports.sortContext = sortContext;

/**
* verifymatch - results from spatialmatch are now verified by querying real geometries in vector tiles
*
* @access public
* @param {Array} query - a list of terms composing the query to Carmen
* @param {Object} stats - ?
* @param {Object} geocoder - a geocoder datasource
* @param {Object} matched - resultant indexes that could be spatially stacked
* @param {Object} options - passed through the geocode function in geocode.js
* @param {Function} callback - callback function which is called with the verified indexes in the correct hierarchical order
*/
function verifymatch(query, stats, geocoder, matched, options, callback) {
    let spatialmatches = matched.results;
    const sets = matched.sets;

    options.limit_verify = options.limit_verify || 10;
    // Limit covers based on whether their source is allowed by types & stacks filters.
    if (options.types || options.stacks) {
        spatialmatches = spatialmatches.filter((spatialmatch) => {
            const firstCover = spatialmatch.covers[0];
            const source = geocoder.byidx[firstCover.idx];
            // Currently unclear why this might be undefined.
            if (!source) console.error(new Error('Misuse: source undefined for idx ' + firstCover.idx));
            return source && filter.sourceAllowed(source, options);
        });
    }

    // Limit initial feature check to the best 20 max.
    if (spatialmatches.length > options.verifymatch_stack_limit) {
        let partialNumberCount = 0;
        const partialNumberLimit = 0.8 * options.verifymatch_stack_limit;
        spatialmatches = spatialmatches
            .filter((match) => {
                if (match.partialNumber) {
                    partialNumberCount++;
                    return partialNumberCount > partialNumberLimit;
                } else {
                    return true;
                }
            }).slice(0, options.verifymatch_stack_limit);
    }

    const q = queue(10);
    for (let i = 0; i < spatialmatches.length; i++) q.defer(loadFeature, spatialmatches[i]);
    q.awaitAll(afterFeatures);

    /**
     * For each result, load the feature from its Carmen index.
     *
     * @param {Object} spatialmatch - Spatialmatch instance
     * @param {callback} callback - accepts error and GeoJSON object
     * @returns {undefined}
     */
    function loadFeature(spatialmatch, callback) {
        const cover = spatialmatch.covers[0];
        const source = geocoder.byidx[cover.idx];

        // Currently unclear why this might be undefined.
        // For now, catch and return error to try to learn more.
        if (!source) return callback(new Error('Misuse: source undefined for idx ' + cover.idx));

        // getFeatureByCover() uses `getGeocoderData` to fetch a carmen record
        feature.getFeatureByCover(source, cover, callback);
    }

    /**
     * Once all features are loaded, filter, verify, and load contexts
     *
     * @param {Error} err - error
     * @param {Array<object>} loaded array of GeoJSON fetures
     * @returns {undefined}
     */
    function afterFeatures(err, loaded) {
        if (err) return callback(err);

        let verified;

        // Limit each feature based on whether it is allowed by types & stacks filters.
        if (options.types || options.stacks || options.languageMode === 'strict') {
            const filteredSpatialmatches = [];
            const filteredLoaded = [];
            loaded.forEach((feature, i) => {
                if (!feature || !feature.properties) return;
                const source = geocoder.indexes[feature.properties['carmen:index']];
                if (source && filter.featureAllowed(source, feature, options)) {
                    filteredSpatialmatches.push(spatialmatches[i]);
                    filteredLoaded.push(loaded[i]);
                }
            });
            verified = verifyFeatures(query, geocoder, filteredSpatialmatches, filteredLoaded, options);
        // No filters specified, go straight to verify
        } else {
            verified = verifyFeatures(query, geocoder, spatialmatches, loaded, options);
        }
        // Limit verify results before loading contexts
        verified = verified.slice(0, options.limit_verify);
        loadContexts(geocoder, verified, sets, options, callback);
    }
}

/**
* verifyFeatures - filters the best results from the list of spatialmatches
* allows for high-scored features to beat local ones
* checks if features lie in a bbox supplied by the bbox option
* finds an address using a bitmask, incase none of the matched features contain the address
*
* @param {Array<string>} query - a list of terms composing the query to Carmen
* @param {Object} geocoder - a geocoder datasource
* @param {Object} spatialmatches - resultant indexes that could be spatially stacked
* @param {Object} loaded - features that are loaded from the carmen index
* @param {Object} options - passed through the geocode function in geocode.js
* @returns {Array} filtered - sorted and verified features
*/
function verifyFeatures(query, geocoder, spatialmatches, loaded, options) {
    const result = [];
    let feats;
    for (let pos = 0; pos < loaded.length; pos++) {
        if (!loaded[pos]) continue;

        feats = [loaded[pos]];

        const spatialmatch = spatialmatches[pos];
        const cover = spatialmatch.covers[0];
        const source = geocoder.byidx[cover.idx];

        // this is passed-through information from phrasematch about what and
        // where we think the address number is in this query
        const address = spatialmatch.address;

        if (source.geocoder_address) {
            if (feats[0].properties['carmen:addressnumber'] || feats[0].properties['carmen:rangetype']) {
                let addressPoints = [];

                if (spatialmatch.partialNumber) {
                    // the whole query is just the beginning of a number, so we need to figure out
                    // where in the cluster the things are that start with this number
                    // we don't bother with interpolation at all; if that's the only way
                    // we can do it, we skip the whole cluster

                    // If feature has address points, try a partial match
                    if (feats[0].properties['carmen:addressnumber']) {
                        // if we're in the partialNumber state, the whole query is just a number
                        // so we can just use that, rather than needing the calculated address mask
                        addressPoints = addressCluster.forwardPrefixFiltered(feats[0], query[0], options, cover);

                        if (!addressPoints.length) feats = [];
                    } else {
                        // skip this feature - we don't street fallback for prefixes
                        feats = [];
                    }
                } else if (address) {
                    feats[0].properties['carmen:address'] = address.number;
                    feats[0].properties['carmen:addresspos'] = address.position;

                    // If feature has address points, see if there is an exact match
                    if (feats[0].properties['carmen:addressnumber']) {
                        addressPoints = addressCluster.forward(feats[0], address.number);
                    }

                    // If feature did not match a point and has interpolation - interpolate a match
                    if (!addressPoints.length && feats[0].properties['carmen:rangetype']) {
                        const itpPoint = addressItp.forward(feats[0], address.number);
                        addressPoints = itpPoint ? [itpPoint] : [];
                    }
                } else {
                    feats[0].properties['carmen:address'] = null;
                }

                // If there was an address match then set up a new result
                if (addressPoints.length && feats.length) {
                    const newFeats = addressPoints.slice(0,10).map((addressPoint) => {
                        const addressFeat = JSON.parse(JSON.stringify(addressPoint));

                        if (options.routing && source.geocoder_routable) {
                            const routPoints = routablePoints(addressFeat.geometry, feats[0]);
                            if (routPoints) {
                                // For now, return nearestPointCoords as an object in an array
                                // to support multiple routable points, with other meta info
                                // TODO: eventually figure out how to identify and add multiple routable points.
                                addressFeat.routable_points = routPoints;
                            }
                        }

                        addressFeat.properties['carmen:center'] = addressFeat.geometry && addressFeat.geometry.coordinates;

                        return addressFeat;
                    });

                    feats = newFeats;
                } else if (feats.length && feats[0].properties['carmen:address'] !== null) {
                    // The feature is an address cluster or range but does not match this cover, return a street result
                    // (null apparently has special meaning, so leave it null if it's null)
                    feats[0].properties['carmen:address'] = false;
                }
            } else if (feats.length) {
                feats[0].properties['carmen:address'] = null;
            }
        } else if (options.routing && source.geocoder_routable) {
            feats.forEach((feat) => {
                const routPoints = routablePoints(feat.properties['carmen:center'], feat);
                feat.routable_points = routPoints;
            });
        }

        for (const feat of feats) {
            // checks if the feature falls within the bbox specified as a part of the options
            if (options.bbox && !bbox.inside(feat.properties['carmen:center'], options.bbox)) continue;

            const lastType = feat.properties['carmen:types'].slice(-1)[0];
            feat.properties['carmen:score'] = feat.properties['carmen:score'] || 0;
            feat.properties['carmen:extid'] = lastType + '.' + feat.id;
            feat.properties['carmen:tmpid'] = cover.tmpid;

            feat.properties['carmen:distance'] = feat.properties['carmen:distance'] ||
                proximity.distance(options.proximity, feat.properties['carmen:center'], cover);
            feat.properties['carmen:position'] = pos;
            feat.properties['carmen:spatialmatch'] = spatialmatch;

            // Apply a small penalty to addresses that failed to match an address number
            // and fell back to a street result. This penalty used to live in phrasematch
            // before being moved here to allow street level fallback mode
            if (feat.properties['carmen:address'] === false) cover.relev *= 0.99;

            feat.properties['carmen:relev'] = cover.relev;
            feat.properties['carmen:geocoder_address_order'] = source.geocoder_address_order;
            feat.properties['carmen:zoom'] = cover.zoom;
            result.push(feat);
        }
    }

    // Set a score + distance combined heuristic.
    for (let k = 0; k < result.length; k++) {
        const feat = result[k];
        if (options.proximity) {
            feat.properties['carmen:scoredist'] = proximity.scoredist(
                feat.properties['carmen:score'],
                geocoder.minScore,
                geocoder.maxScore,
                feat.properties['carmen:distance'],
                feat.properties['carmen:zoom']
            );
            feat.properties['carmen:relevance'] = proximity.relevanceScore(
                feat.properties['carmen:spatialmatch'].relev,
                feat.properties['carmen:scoredist'],
                feat.properties['carmen:address'],
                feat.geometry && feat.geometry.omitted,
                feat.properties['carmen:score'] < 0
            );
        } else {
            feat.properties['carmen:scoredist'] = feat.properties['carmen:score'];
        }
    }

    // Sort + disallow more than options.limit_verify of
    // the best results at this point.
    result.sort(sortFeature);

    // Eliminate any score < 0 results if there are better-scored results
    // with identical text.
    const filtered = [];
    const byText = {};
    for (let i = 0; i < result.length; i++) {
        const feat = result[i];
        const languageText = options.language ? closestLang(options.language[0], feat.properties, 'carmen:text_') : false;
        const text = languageText || feat.properties['carmen:text'];
        if (feat.properties['carmen:scoredist'] >= 0 || !byText[text]) {
            filtered.push(feat);
            byText[text] = true;
        }
    }
    return filtered;
}

/**
* loadContexts returns the heirachy of the features that make up each result's
* geographic context, as provided by {@link context}
*
* @param {Object} geocoder - a geocoder datasource
* @param {Object} features - geojson feature
* @param {Object} sets - covers for the features that have been verified
* @param {Object} options -  passed through the geocode function in geocode.js
* @param {Function} callback - callback called with the features in the the appropriate heirachical order
*/
function loadContexts(geocoder, features, sets, options, callback) {
    const q = queue(5);
    for (let i = 0; i < features.length; i++) q.defer((f, done) => {
        const name = geocoder.indexes[f.properties['carmen:index']].name;
        const firstidx = geocoder.byname[name][0].idx;
        context(geocoder, f.properties['carmen:center'], {
            maxtype: f.properties['carmen:extid'].split('.')[0],
            maxidx: firstidx,
            matched: sets,
            language: options.language
        }, (err, context) => {
            if (err) return done(err);
            // Push feature onto the top level.
            context.unshift(f);
            return done(null, context);
        });
    }, features[i]);

    q.awaitAll((err, contexts) => {
        if (err) return callback(err);
        callback(null, verifyContexts(contexts, sets, geocoder.indexes, options, geocoder));
    });
}

/**
 * verifyContexts - Create lookup for peer contexts to use real loaded feature
 * score values rather than cover `scoredist` which is a gross approximation
 * based on an index's scorefactor
 *
 * @param {Array<Array<Object>>} contexts - lists of feature contexts to be sorted by scoring by verifyContexts
 * @param {Object} sets - covers for the features that have been verified
 * @param {Object} indexes - indexes in the instance of the geocoder for e.g: {country: {}, region: {}, place:{}}
 * @param {Object} options - optional arguments
 * @param {Geocoder} geocoder - the carmen {@link Geocoder} instance
 * @returns {Array<Object>} contexts - feature hierachy sorted by the score value
 */
function verifyContexts(contexts, sets, indexes, options, geocoder) {
    const peers = {};
    for (let i = 0; i < contexts.length; i++) {
        peers[contexts[i][0].properties['carmen:tmpid']] = contexts[i][0];
    }

    for (let i = 0; i < contexts.length; i++) {
        const context = contexts[i];
        context._relevance = 0;
        context._typeindex = indexes[context[0].properties['carmen:index']].ndx;

        // Create lookup for covers by tmpid.
        const verify = {};
        const covers = context[0].properties['carmen:spatialmatch'].covers;
        for (let j = 0; j < covers.length; j++) {
            verify[covers[j].tmpid] = covers[j];
        }

        for (let j = 0; j < context.length; j++) {
            const ctx = context[j];

            if (j > 0) {
                // Check for "overrides:[index]"
                const prop = `override:${ctx.properties['carmen:index']}`;
                const feat = context[0];
                if (feat.properties[prop] && ctx.properties['carmen:text'] !== feat.properties[prop]) {
                    // Create a minimal new context to replace the recalled one. Proxy
                    // the geometry and extid forward of the feature which has the override.
                    const carmenIndex = ctx.properties['carmen:index'];
                    context[j] = {
                        properties: {
                            'carmen:text': feat.properties[prop],
                            'carmen:index': carmenIndex,
                            'carmen:types': [carmenIndex],
                            'carmen:center': feat.properties['carmen:center'],
                            'carmen:extid': `postcode.${feat.properties['carmen:extid']}`
                        }
                    };
                    continue;
                }
            }

            if (verify[ctx.properties['carmen:tmpid']]) {
                const cover = verify[ctx.properties['carmen:tmpid']];
                ctx.properties['carmen:matches_language'] = cover.matches_language;
                ctx.properties['carmen:prefix'] = cover.prefix;
                ctx.properties['carmen:query_text'] = cover.text;
                ctx.properties['carmen:idx'] = cover.idx;
            }

        }

        const strictRelev = verifyContext(context, peers, verify, {}, indexes, options, geocoder);
        const looseRelev = verifyContext(context, peers, verify, sets, indexes, options, geocoder);
        context._relevance = Math.max(strictRelev, looseRelev);
    }
    contexts.sort(sortContext);
    return contexts;
}

/**
 * This function adjusts a result context's `relevance` score. There are
 * several bits of business logic here that can boost or penalize the original
 * `relevance`. The nicknames for these are _squishy_ and _backy_.
 *
 * #### squishy
 *
 * The `squishy` logic checks for nested, identically-named features in indexes
 * with geocoder_inherit_score enabled. When they are encountered, avoid
 * applying the gappy penalty and combine their scores on the smallest feature.
 *
 * This ensures that a context of "New York, New York, USA" will return the
 * place rather than the region when a query is made for "New York USA".  In
 * the absence of this check the place would be gappy-penalized and the region
 * feature would be returned as the first result.
 *
 * #### backy
 *
 * The _backy_ logic checks to see if the matching substrings of the query are
 * in a single ordering, going from low-to-high or high-to-low, as specified by
 * the geocoder's index hierarchy. It's helpful to walk through this with an
 * example. Here's a result context where the target feature is an address
 * (this is pseudocode for simplicity's sake).
 *
 * ```
 * [
 *   "123 Main St" (address),
 *   "02169" (postcode),
 *   "Quincy" (city),
 *   "Massachusetts" (state),
 *   "United States" (country)
 * ]
 * ```
 *
 * Here are three different query strings that could return that context, and
 * how the backy penalty would apply (or not).
 *
 * | query string           | direction  | backy penalty? |
 * |------------------------|------------|----------------|
 * | 123 Main St, Quincy MA | ascending  | no             |
 * | MA Quincy 123 Main St  | descending | no             |
 * | 123 Main St, MA Quincy | ascending  | yes            |
 *
 * The first two examples would not be penalized, because each one follows a
 * licit ordering with respect to the hierarchy of the geocoder. Not so for the
 * third query.
 *
 * - The first one is `ascending`, going from hierarchically low (street) to hierarchically high (state).
 * - The second one is `descending`, going from high (state) to low (street).
 * - The third one, however, begins by ascending from street to state, but then descends again,
 *   going from state to city. Therefore, a penalty is applied.
 *
 * It's possible for a layer to be exempted from the _backy_ penalty. This
 * affordance is built in because, in some places, the hierarchical order does
 * not match the conventional way of writing a full address. For instance,
 * postcodes in the United States are often written at the end of an address,
 * even though they're hierarchically positioned lower than cities or states.
 *
 * If a CarmenSource index has `geocoder_ignore_order=true`, then the backy
 * penalty is witheld for that layer (but could still apply to other layers).
 *
 * @access public
 *
 * @param {Array} context - created in {@link loadContexts} the target feature to be returned is context[0] and context[1:] are the features in which the target is contained, ordered by hierarchy of their layers
 * @param {Object} peers - A mapping from `carmen:tmpid`s to features, used when applying the "squishy" logic for nested, identically-named features.
 * @param {Object} strict - A mapping from `carmen:tmpid`s to covers matched by some substring of the query
 * @param {Object} loose - A mapping from `carmen:tmpid`s to the cover with that tmpid whose `relev` value is greatest (across all result contexts).
 * @param {Object} indexes - the geocoder's indexes
 * @param {Object} options - optional arguments
 * @param {Geocoder} geocoder - the carmen {@link Geocoder} instance
 * @returns {number} the adjusted relevance of the supplied result
 */
function verifyContext(context, peers, strict, loose, indexes, options, geocoder) {
    const addressOrder = context[0].properties['carmen:geocoder_address_order'];
    let usedmask = 0;
    let lastmask = -1;
    let lastgroup = -1;
    let lastMatchedIndex;
    let relevance = 0;
    let direction;
    let squishy = 0;
    let squishyTarget = false;
    if (indexes[context[0].properties['carmen:index']].geocoder_inherit_score)
        squishyTarget = context[0].properties;

    for (let c = 0; c < context.length; c++) {
        let backy = false;
        let ignoreOrder = false;
        const feat = context[c];

        const matched = strict[feat.properties['carmen:tmpid']] || loose[feat.properties['carmen:tmpid']];
        // squishy and backy logic only applies to elements of the result
        // context that were matched by some substring of the query. If this
        // feature isn't one of the matches, then continue.
        if (!matched) continue;

        if (lastMatchedIndex) {
            // If the current element or the last-matched element are from an
            // index that has `geocoder_ignore_order=true`, then don't apply
            // the backy penalty at the end of this iteration.
            ignoreOrder = indexes[context[c].properties['carmen:index']].geocoder_ignore_order ||
                          indexes[lastMatchedIndex].geocoder_ignore_order;
        }

        // SQUISHY
        // Lookup and sum score from a peer feature if eligible.
        if (
            squishyTarget &&
            (c > 0) &&
            peers[feat.properties['carmen:tmpid']] &&
            textAlike(squishyTarget, feat.properties) &&
            indexes[feat.properties['carmen:index']].geocoder_grant_score
        ) {
            squishy += Math.max(peers[feat.properties['carmen:tmpid']].properties['carmen:score'] || 0, 0);
        }
        // If matched.mask is the same as as the OR'd together masks considered so far, continue
        if (usedmask & matched.mask) continue;

        // BACKY
        // If we don't know the direction yet, this is where it gets set.
        // Setting direction means deciding whether the left-to-right ordering
        // of the query string moves from hierarchically-low to
        // hierarchically-high (ascending) or from hierarchically-high to
        // hierarchically-low (descending).
        //
        // Reminder: the `mask`s are binary indicators of where in the original
        // query string a feature was matched, but their order in that
        // represenatation is flipped, with the right-most place corresponding
        // to the left-most position in the string. So, for "123 Main Street,
        // Quincy MA", the masks would be
        //
        //     123 Main Street    00111
        //     Quincy             01000
        //     MA                 10000
        //
        // That means that if `lastmask < matched.mask` then the previous match
        // corresponds to an earlier position in the query string than the
        // current match.
        //
        // We assume that `context` is sorted from low to high, so if the
        // current match's mask is greater than the previous match's mask, then
        // we decide that the intended direction is "ascending". In other
        // words, as we move from left to right in the query string, we're
        // matching features higher and higher in the hierarchy.
        //
        // The opposite would be "descending," meaning that as we move from
        // left to right in the query string, we match features lower and lower
        // in the hierarchy.
        if (!direction && !ignoreOrder && c > 0) {
            direction = lastmask < matched.mask ? 'ascending' : 'descending';
        }

        // BACKY
        // Now we check to see whether the actual ordering contradicts the
        // direction found in this or an earlier iteration. If so, then set `backy=true`.
        if (lastgroup > -1) {
            if (direction === 'ascending') {
                backy = lastmask > matched.mask;
            } else if (direction === 'descending') {
                backy = lastmask < matched.mask;
            }
        }

        usedmask = usedmask | matched.mask;
        lastmask = matched.mask;
        lastgroup = indexes[feat.properties['carmen:index']].ndx;
        lastMatchedIndex = feat.properties['carmen:index'];

        // BACKY
        // If `backy=true`, only add half of the current match's relevance to
        // the aggregated relevance.
        //
        // However, if `ignoreOrder=true`, that means that one or both of the
        // elements in this iteration's comparison is from an index that has
        // `geocoder_ignore_order=true`.  In that case, don't apply the backy
        // penalty.
        if (backy && !ignoreOrder) {
            relevance += matched.relev * 0.5;
        } else {
            relevance += matched.relev;
        }
    }

    // small bonus if feature order matches the expected order of the index
    if (direction) relevance -= 0.01;
    if (addressOrder === direction) relevance += 0.01;

    // SQUISHY
    // In the case of an eligible higher-level feature that shares an exact
    // carmen:text value with something in its context
    // (e.g. New York, New York)
    if (squishy > 0) {
        const feat = context[0];
        // Recalculate carmen:scoredist and carmen:relevance for smallest squishy feature
        // with new higher score to ensure it returns before larger squishy features
        if (options.proximity) {
            feat.properties['carmen:scoredist'] = proximity.scoredist(
                Math.min(feat.properties['carmen:score'] + squishy, geocoder.maxScore),
                geocoder.minScore,
                geocoder.maxScore,
                feat.properties['carmen:distance'],
                feat.properties['carmen:zoom']
            );
            feat.properties['carmen:relevance'] = proximity.relevanceScore(
                feat.properties['carmen:spatialmatch'].relev,
                feat.properties['carmen:scoredist'],
                feat.properties['carmen:address'],
                feat.geometry && feat.geometry.omitted,
                feat.properties['carmen:score'] < 0
            );
        } else {
            feat.properties['carmen:scoredist'] += squishy;
        }
    }

    relevance = relevance > 0 ? relevance : 0;

    return relevance;
}

/**
 * sortFeature - sorts the best results in the features according to the relevance, scoredist, position or if the address exists
 *
 * @param {object} a - GeoJSON feature w/ carmen properties
 * @param {object} b - GeoJSON feature w/ carmen properties
 * @return {number} comparison result
 */
function sortFeature(a, b) {
    return ((b.properties['carmen:relevance'] || 0) - (a.properties['carmen:relevance'] || 0)) ||
        (b.properties['carmen:spatialmatch'].relev - a.properties['carmen:spatialmatch'].relev) ||
        ((a.properties['carmen:address'] === null ? 1 : 0) - (b.properties['carmen:address'] === null ? 1 : 0)) ||
        ((a.geometry && a.geometry.omitted ? 1 : 0) - (b.geometry && b.geometry.omitted ? 1 : 0)) ||
        ((b.properties['carmen:scoredist'] || 0) - (a.properties['carmen:scoredist'] || 0)) ||
        ((a.properties['carmen:position'] || 0) - (b.properties['carmen:position'] || 0)) ||
        0;
}

/**
 * sortContext - sort contexts based on the relevance, then score, layer type, address position, spatialmatch position and then id
 *
 * @param {object} a - TODO
 * @param {object} b - TODO
 * @return {number} comparison result
 */
function sortContext(a, b) {
    // First, compute the relevance of this query term against
    // each set.
    if (a._relevance > b._relevance) return -1;
    if (a._relevance < b._relevance) return 1;

    // sort by relev + scoredist composite score
    const ar = a[0].properties['carmen:relevance'] || 0;
    const br = b[0].properties['carmen:relevance'] || 0;
    if (ar > br) return -1;
    if (ar < br) return 1;

    // sort by scoredist
    const as = a[0].properties['carmen:scoredist'] || 0;
    const bs = b[0].properties['carmen:scoredist'] || 0;
    if (as > bs) return -1;
    if (as < bs) return 1;

    // layer type
    if (a._typeindex < b._typeindex) return -1;
    if (a._typeindex > b._typeindex) return 1;

    if (a[0].properties['carmen:address'] && b[0].properties['carmen:address']) {
        // Prefer addresses with an earlier position in the query
        // so if you have a query "70 St. #501" it will prioritize 70
        if (a[0].properties['carmen:addresspos'] < b[0].properties['carmen:addresspos']) return -1;
        if (b[0].properties['carmen:addresspos'] < a[0].properties['carmen:addresspos']) return 1;

        // for address results, prefer those from point clusters
        if (a[0].properties['carmen:addressnumber'] && !b[0].properties['carmen:addressnumber']) return -1;
        if (b[0].properties['carmen:addressnumber'] && !a[0].properties['carmen:addressnumber']) return 1;

        // prefer non-interpolated address results
        if ((a[0].geometry && !a[0].geometry.interpolated) && (b[0].geometry && b[0].geometry.interpolated)) return -1;
        if ((b[0].geometry && !b[0].geometry.interpolated) && (a[0].geometry && a[0].geometry.interpolated)) return 1;
    }

    // omitted difference
    const omitted = ((a[0].geometry && a[0].geometry.omitted ? 1 : 0) - (b[0].geometry && b[0].geometry.omitted ? 1 : 0));
    if (omitted !== 0) return omitted;

    // sort by spatialmatch position ("stable sort")
    if (a[0].properties['carmen:position'] < b[0].properties['carmen:position']) return -1;
    if (a[0].properties['carmen:position'] > b[0].properties['carmen:position']) return 1;

    // last sort by id.
    if (a[0].id < b[0].id) return -1;
    if (a[0].id > b[0].id) return 1;
    return 0;
}


/**
 * Used for determining features with alike text for score promotion
 * e.g. boosting New York (city) above New York (state)
 *
 * Given two properties objects with carmen:text* fields, compare each
 * textfield and find likeness between target and candidate. If the text
 * from the target is fully contained within the candidate text for a like
 * language, the feature text is considered alike.
 *
 * @param {object} target - properties object
 * @param {object} candidate - properties object
 * @returns {boolean} true is the text is alike.
 */
function textAlike(target, candidate) {
    const pattern = /^carmen:text/;
    const keys = Object.keys(target).filter(pattern.test.bind(pattern));
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (typeof target[key] !== 'string' || !target[key]) continue;
        if (typeof candidate[key] !== 'string' || !candidate[key]) continue;
        const targetText = target[key].split(',')[0];
        const candidateText = candidate[key].split(',')[0];
        if (candidateText.indexOf(targetText) !== -1) return true;
    }
    return false;
}
