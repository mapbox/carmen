var addressItp = require('./pure/addressitp');
var addressCluster = require('./pure/addresscluster');
var queue = require('d3-queue').queue;
var context = require('./context');
var termops = require('./util/termops');
var feature = require('./util/feature');
var proximity = require('./util/proximity');
var closestLang = require('./util/closest-lang');
var bbox = require('./util/bbox');
var filter = require('./util/filter');

module.exports = verifymatch;
module.exports.verifyFeatures = verifyFeatures;
module.exports.sortFeature = sortFeature;
module.exports.sortContext = sortContext;

function verifymatch(query, stats, geocoder, matched, options, callback) {
    var results = matched.results;
    var sets = matched.sets;

    var q = queue(10);

    options.limit_verify = options.limit_verify || 10;

    // Limit covers based on whether their source is allowed by types & stacks filters.
    if (options.types || options.stacks) {
        results = results.filter(function(result) {
            var source = geocoder.byidx[result[0].idx];
            // Currently unclear why this might be undefined.
            if (!source) console.error(new Error('Misuse: source undefined for idx ' + result[0].idx));
            return source && filter.sourceAllowed(source, options);
        });
    }

    // Limit initial feature check to the best 20 max.
    if (results.length > 20) results = results.slice(0,20);
    for (var i = 0; i < results.length; i++) q.defer(loadFeature, results[i], i);
    q.awaitAll(afterFeatures);

    // For each result, load the feature from its Carmen index.
    function loadFeature(spatialmatch, pos, callback) {
        var cover = spatialmatch[0];
        var source = geocoder.byidx[cover.idx];

        // Currently unclear why this might be undefined.
        // For now, catch and return error to try to learn more.
        if (!source) return callback(new Error('Misuse: source undefined for idx ' + cover.idx));

        feature.getFeatureByCover(source, cover, callback);
    }

    // Once all features are loaded, filter, verify, and load contexts
    function afterFeatures(err, loaded) {
        if (err) return callback(err);

        var verified;

        // Limit each feature based on whether it is allowed by types & stacks filters.
        if (options.types || options.stacks) {
            var filteredResults = [];
            var filteredLoaded = [];
            loaded.forEach(function(feature, i) {
                if (!feature || !feature.properties) return;
                var source = geocoder.indexes[feature.properties['carmen:index']];
                if (source && filter.featureAllowed(source, feature, options)) {
                    filteredResults.push(results[i]);
                    filteredLoaded.push(loaded[i]);
                }
            });
            verified = verifyFeatures(query, geocoder, filteredResults, filteredLoaded, options);
        // No filters specified, go straight to verify
        } else {
            verified = verifyFeatures(query, geocoder, results, loaded, options);
        }
        // Limit verify results before loading contexts
        verified = verified.slice(0, options.limit_verify);

        loadContexts(geocoder, verified, sets, options, callback);
    }
}

function verifyFeatures(query, geocoder, spatial, loaded, options) {
    var meanScore = 1;
    var result = [];
    var feat;
    for (var pos = 0; pos < loaded.length; pos++) {
        if (!loaded[pos]) continue;

        feat = loaded[pos];

        var spatialmatch = spatial[pos];
        var cover = spatialmatch[0];
        var source = geocoder.byidx[cover.idx];

        // Calculate to see if there is room for an address in the query based on bitmask
        var address = termops.maskAddress(query, cover.mask);

        var checks = true;

        if (source.geocoder_address) {
            var hasAddr = false;

            if (address && (feat.properties['carmen:addressnumber'] || feat.properties['carmen:rangetype'])) {
                feat.properties['carmen:address'] = address.addr;

                var res;
                if (feat.properties['carmen:addressnumber']) {
                    res = addressCluster.forward(feat, address.addr);
                    if (res) {
                        feat.geometry = res;
                        feat.properties['carmen:center'] = feat.geometry && feat.geometry.coordinates;
                        hasAddr = true;
                    }
                }

                if (!hasAddr && feat.properties['carmen:rangetype']) {
                    res = addressItp.forward(feat, address.addr);
                    if (res) {
                        feat.geometry = res;
                        feat.properties['carmen:center'] = feat.geometry && feat.geometry.coordinates;
                        hasAddr = true;
                    }
                }

                if (!hasAddr) checks = false;
            } else {
                feat.properties['carmen:address'] = null;
            }
        }

        if (checks) {
            // Compare feature text to matching input subquery as a safeguard
            // against fnv1a collisions.
            if (!termops.decollide(source.token_replacer, feat, cover.text)) continue;
            if (options.bbox && !bbox.inside(feat.properties["carmen:center"], options.bbox)) continue;
            var lastType = feat.properties["carmen:types"].slice(-1)[0];
            feat.properties["carmen:score"] = feat.properties["carmen:score"] || 0;
            feat.properties["carmen:extid"] = lastType + '.' + feat.id;
            feat.properties["carmen:tmpid"] = cover.tmpid;
            feat.properties["carmen:relev"] = cover.relev;
            feat.properties["carmen:distance"] = proximity.distance(options.proximity, feat.properties["carmen:center"]);
            feat.properties["carmen:position"] = pos;
            feat.properties["carmen:spatialmatch"] = spatialmatch;
            feat.properties["carmen:geocoder_address_order"] = source.geocoder_address_order;
            meanScore *= feat.properties["carmen:score"] > 0 ? feat.properties["carmen:score"] : 1;
            result.push(feat);
        }
    }

    // Use a geometric mean for calculating final _scoredist.
    // This allows extremely high-scored outliers to beat local
    // results unless within an extremely close proximity.
    if (result.length) meanScore = Math.pow(meanScore, 1/result.length);
    // Set a score + distance combined heuristic.
    for (var k = 0; k < result.length; k++) {
        feat = result[k];
        // ghost features don't participate
        if (options.proximity && feat.properties["carmen:score"] >= 0) {
            feat.properties["carmen:scoredist"] = Math.max(
                feat.properties["carmen:score"],
                proximity.scoredist(options.proximity, feat.properties["carmen:center"], meanScore)
            );
        } else {
            feat.properties["carmen:scoredist"] = feat.properties["carmen:score"];
        }
    }

    // Sort + disallow more than options.limit_verify of
    // the best results at this point.
    result.sort(sortFeature);
    // Eliminate any score < 0 results if there are better-scored results
    // with identical text.
    var filtered = [];
    var byText = {};
    for (var i = 0; i < result.length; i++) {
        feat = result[i];
        var languageText = options.language ? closestLang(options.language, feat.properties, "carmen:text_") : false;
        var text = languageText || feat.properties["carmen:text"];
        if (feat.properties["carmen:scoredist"] >= 0 || !byText[text]) {
            filtered.push(feat);
            byText[text] = true;
        }
    }
    return filtered;
}

function loadContexts(geocoder, features, sets, options, callback) {
    var q = queue(5);
    for (var i = 0; i < features.length; i++) q.defer(function(f, done) {
        var name = geocoder.indexes[f.properties["carmen:index"]].name;
        var firstidx = geocoder.byname[name][0].idx;
        context(geocoder, f.properties["carmen:center"][0], f.properties["carmen:center"][1], {
            maxtype: f.properties['carmen:extid'].split('.')[0],
            maxidx: firstidx,
            matched: sets,
            language: options.language
        }, function(err, context) {
            if (err) return done(err);
            // Push feature onto the top level.
            context.unshift(f);
            return done(null, context);
        });
    }, features[i]);

    q.awaitAll(function(err, contexts) {
        if (err) return callback(err);
        callback(null, verifyContexts(contexts, sets, geocoder.indexes));
    });
}

function verifyContexts(contexts, sets, indexes) {
    for (var a = 0; a < contexts.length; a++) {
        var context = contexts[a];
        context._relevance = 0;
        context._typeindex = indexes[context[0].properties['carmen:index']].ndx;

        // Create lookup for covers by tmpid.
        var verify = {};
        for (var b = 0; b < context[0].properties['carmen:spatialmatch'].length; b++) {
            var cover = context[0].properties['carmen:spatialmatch'][b];
            verify[cover.tmpid] = cover;
        }

        var strictRelev = verifyContext(context, verify, {}, indexes);
        var looseRelev = verifyContext(context, verify, sets, indexes);
        context._relevance = Math.max(strictRelev, looseRelev);
    }
    contexts.sort(sortContext);
    return contexts;
}

function verifyContext(context, strict, loose, indexes) {
    var addressOrder = context[0].properties['carmen:geocoder_address_order'];
    var gappy = 0;
    var stacky = 0;
    var usedmask = 0;
    var lastmask = -1;
    var lastgroup = -1;
    var relevance = 0;
    var direction;
    // 'squishy' checks for nested, identically-named features in indexes
    //  without prevent_promotion enabled. When they are encountered, avoid
    // applying the gappy penalty and combine their scores on the smallest
    // feature.
    // This ensures that a context of "New York, New York, USA" will return
    // the place rather than the region when a query is made for "New York USA".
    // In the absence of this check the place would be gappy-penalized and the
    // region feature would be returned as the first result.
    var squishy = 0;
    var squishyTextToMatch = false;
    if (!indexes[context[0].properties["carmen:index"]].prevent_promotion)
        squishyTextToMatch = context[0].properties["carmen:text"].split(',')[0];

    for (var c = 0; c < context.length; c++) {
        var backy = false;
        var feat = context[c];

        var matched = strict[feat.properties["carmen:tmpid"]] || loose[feat.properties["carmen:tmpid"]];
        if (!matched) continue;

        if (squishyTextToMatch && (c > 0) && loose[feat.properties["carmen:tmpid"]] && (feat.properties["carmen:text"].split(',')[0] === squishyTextToMatch))
            squishy += loose[feat.properties["carmen:tmpid"]].scoredist;

        if (usedmask & matched.mask) continue;

        // check if address components are orderd general-to-specific or specific-to-general
        if (!direction && c > 0) {
            direction = lastmask < matched.mask ? "ascending" : "descending";
        }

        if (lastgroup > -1) {
            // penalize stacking bonus if the order of address components is inconsistent
            if (direction === "ascending") {
                backy = lastmask > matched.mask;
            } else if (direction === "descending") {
                backy = lastmask < matched.mask;
            }
            stacky = 1;
            gappy += Math.abs(indexes[feat.properties["carmen:index"]].ndx - lastgroup) - 1;
        }

        usedmask = usedmask | matched.mask;
        lastmask = matched.mask;
        lastgroup = indexes[feat.properties['carmen:index']].ndx;
        if (backy) {
            relevance += matched.relev * 0.5;
        } else {
            relevance += matched.relev;
        }
    }

    relevance -= 0.01;
    relevance += 0.01 * stacky;

    // small bonus if feature order matches the expected order of the index
    if (direction) relevance -= 0.006;
    if (addressOrder === direction) relevance += 0.006;

    // Penalize stacking bonus slightly based on whether stacking matches
    // contained "gaps" in continuity between index levels --
    // EXCEPT in the case of an eligible higher-level feature that shares an
    // exact carmen:text value with something in its context (e.g. New York, New York)
    if (squishy > 0)
        context[0].properties["carmen:scoredist"] += squishy;
    else
        relevance -= 0.001 * gappy;

    relevance = relevance > 0 ? relevance : 0;

    return relevance;
}

function sortFeature(a, b) {
    return (b.properties["carmen:spatialmatch"].relev - a.properties["carmen:spatialmatch"].relev) ||
        ((a.properties['carmen:address']===null?1:0) - (b.properties['carmen:address']===null?1:0)) ||
        ((a.geometry&&a.geometry.omitted?1:0) - (b.geometry&&b.geometry.omitted?1:0)) ||
        ((b.properties["carmen:scoredist"]||0) - (a.properties["carmen:scoredist"]||0)) ||
        ((a.properties["carmen:position"]||0) - (b.properties["carmen:position"]||0)) ||
        0;
}

function sortContext(a, b) {
    // First, compute the relevance of this query term against
    // each set.
    if (a._relevance > b._relevance) return -1;
    if (a._relevance < b._relevance) return 1;

    // sort by score
    var as = a[0].properties['carmen:scoredist'] || 0;
    var bs = b[0].properties['carmen:scoredist'] || 0;
    if (as > bs) return -1;
    if (as < bs) return 1;

    // layer type
    if (a._typeindex < b._typeindex) return -1;
    if (a._typeindex > b._typeindex) return 1;

    // for address results, prefer those from point clusters
    if (a[0].properties['carmen:address'] && b[0].properties['carmen:address']) {
        if (a[0].properties['carmen:addressnumber'] && !b[0].properties['carmen:addressnumber']) return -1;
        if (b[0].properties['carmen:addressnumber'] && !a[0].properties['carmen:addressnumber']) return 1;
    }

    // omitted difference
    var omitted = ((a[0].geometry&&a[0].geometry.omitted?1:0) - (b[0].geometry&&b[0].geometry.omitted?1:0));
    if (omitted !== 0) return omitted;

    // sort by spatialmatch position ("stable sort")
    if (a[0].properties['carmen:position'] < b[0].properties['carmen:position']) return -1;
    if (a[0].properties['carmen:position'] > b[0].properties['carmen:position']) return 1;

    // last sort by id.
    if (a[0].id < b[0].id) return -1;
    if (a[0].id > b[0].id) return 1;
    return 0;
}
