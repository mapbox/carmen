var applyAddress = require('./pure/applyaddress');
var addressCluster = require('./pure/addresscluster');
var sm = new(require('sphericalmercator'))();
var queue = require('queue-async');
var context = require('./context');
var termops = require('./util/termops');
var feature = require('./util/feature');
var Relev = require('./util/relev');
var proximity = require('./util/proximity');

var mp2_14 = Math.pow(2, 14);
var mp2_28 = Math.pow(2, 28);

module.exports = verifymatch;
module.exports.verifyFeatures = verifyFeatures;
module.exports.sortFeature = sortFeature;
module.exports.sortContext = sortContext;

function verifymatch(query, stats, geocoder, matched, options, callback) {
    var results = matched.results;
    var sets = matched.sets;

    var contexts = [];
    var q = queue(10);

    options.limit_verify = options.limit_verify || 10;

    // Limit initial feature check to the best 40 max.
    if (results.length > 40) results = results.slice(0,40);

    for (var i = 0; i < results.length; i++) q.defer(loadFeature, results[i], i);
    q.awaitAll(afterFeatures);

    // For each result, load the feature from its Carmen index.
    function loadFeature(spatialmatch, pos, callback) {
        var cover = spatialmatch[0];
        var source = geocoder.byidx[cover.idx];
        feature.getFeatureByCover(source, cover, callback);
    }

    function afterFeatures(err, loaded) {
        if (err) return callback(err);
        var verified = verifyFeatures(query, geocoder, results, loaded, options);
        verified = verified.slice(0, options.limit_verify);
        loadContexts(geocoder, verified, sets, callback);
    }
}

function verifyFeatures(query, geocoder, spatial, loaded, options) {
    var maxScore = 0;
    var result = [];
    for (var pos = 0; pos < loaded.length; pos++) {
        if (!loaded[pos]) continue;

        var feat = loaded[pos];

        var spatialmatch = spatial[pos];
        var cover = spatialmatch[0];
        var source = geocoder.byidx[cover.idx];

        // Calculate to see if there is room for an address in the query based on bitmask
        var address = termops.maskAddress(query, cover.mask);

        var checks = true;

        if (address && feat._rangetype && source._geocoder.geocoder_address) {
            feat._address = address.addr;
            feat._geometry = applyAddress(feat, address.addr);
            feat._center = feat._geometry && feat._geometry.coordinates;
            checks = checks && feat._geometry;
        } else if (address && feat._cluster && source._geocoder.geocoder_address) {
            feat._address = address.addr;
            feat._geometry = addressCluster(feat, address.addr);
            feat._center = feat._geometry && feat._geometry.coordinates;
            checks = checks && feat._geometry;
        } else if (source._geocoder.geocoder_address) {
            feat._address = null;
        }

        if (checks) {
            // Compare feature text to matching input subquery as a safeguard
            // against fnv1a collisions.
            if (!termops.decollide(source._geocoder.token_replacer, feat, cover.text)) continue;

            feat._extid = source._geocoder.name + '.' + feat._id;
            feat._tmpid = cover.tmpid;
            feat._dbidx = cover.idx;
            feat._relev = cover.relev;
            feat._distance = proximity.distance(options.proximity, feat._center);
            feat._position = pos;
            feat._spatialmatch = spatialmatch;
            maxScore = Math.max(maxScore, feat._score);
            result.push(feat);
        }
    }

    // Set a score + distance combined heuristic.
    for (var i = 0; i < result.length; i++) {
        var feat = result[i];
        if (options.proximity) {
            feat._scoredist = Math.max(
                feat._score,
                proximity.scoredist(options.proximity, feat._center, maxScore)
            );
        } else {
            feat._scoredist = feat._score;
        }
    }

    // Sort + disallow more than options.limit_verify of
    // the best results at this point.
    result.sort(sortFeature);
    return result;
}

function loadContexts(geocoder, features, sets, callback) {
    var q = queue(5);
    for (var i = 0; i < features.length; i++) q.defer(function(f, done) {
        var name = geocoder.byidx[f._dbidx]._geocoder.name;
        var firstidx = geocoder.byname[name][0]._geocoder.idx;
        context(geocoder, f._center[0], f._center[1], { maxidx:firstidx, matched:sets }, function(err, context) {
            if (err) return done(err);
            // Push feature onto the top level.
            context.unshift(f);
            return done(null, context);
        });
    }, features[i]);

    q.awaitAll(function(err, contexts) {
        if (err) return callback(err);
        callback(null, verifyContexts(contexts, sets, geocoder.names));
    });
}

function verifyContexts(contexts, sets, groups) {
    for (var a = 0; a < contexts.length; a++) {
        var gappy = 0;
        var stacky = 0;
        var usedmask = 0;
        var lastmask = -1;
        var lastgroup = -1;

        var context = contexts[a];
        context._relevance = 0;
        context._typeindex = groups[context[0]._dbidx];

        var spatialmatch = context[0]._spatialmatch;

        // Create lookup for covers by tmpid.
        var verify = {};
        for (var b = 0; b < spatialmatch.length; b++) {
            var cover = spatialmatch[b];
            verify[cover.tmpid] = cover;
        }

        // Build score for full context stack.
        for (var c = 0; c < context.length; c++) {
            var backy = false;
            var feat = context[c];
            var matched = verify[feat._tmpid] || sets[feat._tmpid];
            if (!matched) continue;
            if (usedmask & matched.mask) continue;

            if (lastgroup > -1) {
                stacky = 1;
                backy = lastmask > matched.mask;
                gappy += Math.abs(groups[feat._dbidx] - lastgroup) - 1;
            }

            usedmask = usedmask | matched.mask;
            lastmask = matched.mask;
            lastgroup = groups[feat._dbidx];
            if (backy) {
                context._relevance += matched.relev * 0.5;
            } else {
                context._relevance += matched.relev;
            }
        }

        context._relevance -= 0.01;
        context._relevance += 0.01 * stacky;
        // Penalize stacking bonus slightly based on whether stacking matches
        // contained "gaps" in continuity between index levels.
        context._relevance -= 0.001 * gappy;
        context._relevance = context._relevance > 0 ? context._relevance : 0;
    }

    contexts.sort(sortContext);
    return contexts;
}

function sortFeature(a, b) {
    return (b._spatialmatch.relev - a._spatialmatch.relev) ||
        ((a._address===null?1:0) - (b._address===null?1:0)) ||
        ((a._geometry&&a._geometry.omitted?1:0) - (b._geometry&&b._geometry.omitted?1:0)) ||
        ((b._scoredist||0) - (a._scoredist||0)) ||
        ((a._position||0) - (b._position||0)) ||
        0;
}

function sortContext(a, b) {
    // First, compute the relevance of this query term against
    // each set.
    if (a._relevance > b._relevance) return -1;
    if (a._relevance < b._relevance) return 1;

    // sort by score
    var as = a[0]._scoredist || 0;
    var bs = b[0]._scoredist || 0;
    if (as > bs) return -1;
    if (as < bs) return 1;

    // layer type
    if (a._typeindex < b._typeindex) return -1;
    if (a._typeindex > b._typeindex) return 1;

    // for address results, prefer those from point clusters
    if (a[0]._address && b[0]._address) {
        if (a[0]._cluster && !b[0]._cluster) return -1;
        if (b[0]._cluster && !a[0]._cluster) return 1;
    }

    // omitted difference
    var omitted = ((a[0]._geometry&&a[0]._geometry.omitted?1:0) - (b[0]._geometry&&b[0]._geometry.omitted?1:0));
    if (omitted !== 0) return omitted;

    // sort by spatialmatch position ("stable sort")
    if (a[0]._position < b[0]._position) return -1;
    if (a[0]._position > b[0]._position) return 1;

    // last sort by id.
    if (a[0]._id < b[0]._id) return -1;
    if (a[0]._id > b[0]._id) return 1;
    return 0;
}
