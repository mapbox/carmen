var addressItp = require('./pure/addressitp');
var addressCluster = require('./pure/addresscluster');
var sm = new(require('sphericalmercator'))();
var queue = require('d3-queue').queue;
var context = require('./context');
var termops = require('./util/termops');
var feature = require('./util/feature');
var proximity = require('./util/proximity');
var bbox = require('./util/bbox');

var mp2_14 = Math.pow(2, 14);
var mp2_28 = Math.pow(2, 28);

module.exports = verifymatch;
module.exports.verifyFeatures = verifyFeatures;
module.exports.sortFeature = sortFeature;
module.exports.sortContext = sortContext;
module.exports.dropFeature = dropFeature;

function verifymatch(query, stats, geocoder, matched, options, callback) {
    var results = matched.results;
    var sets = matched.sets;

    var contexts = [];
    var q = queue(10);

    options.limit_verify = options.limit_verify || 10;

    // Limit features to those matching specified types.
    if (options.types || options.stacks) {
        results = dropFeature(geocoder, options, results);
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

    function afterFeatures(err, loaded) {
        if (err) return callback(err);

        if (options.stacks) {
            var filtered = {
                loaded: [],
                results: []
            };
            for (var j = 0; j < loaded.length; j++) {
                // getFeatureByCover does not always return a feature.
                if (!loaded[j]) continue;

                if (loaded[j].properties['carmen:geocoder_stack']) {
                    if (options.stacks.indexOf(loaded[j].properties['carmen:geocoder_stack']) > -1) {
                        filtered.loaded.push(loaded[j]);
                        filtered.results.push(results[j]);
                    }
                } else {
                    filtered.loaded.push(loaded[j]);
                    filtered.results.push(results[j]);
                }
            }
            loaded = filtered.loaded;
            results = filtered.results;
        }

        var verified = verifyFeatures(query, geocoder, results, loaded, options);
        verified = verified.slice(0, options.limit_verify);
        loadContexts(geocoder, verified, sets, options, callback);
    }
}

function dropFeature(geocoder, options, results, callback) {
    var filtered = [];
    for (var i = 0; i < results.length; i++) {
        var cover = results[i][0];
        var source = geocoder.byidx[cover.idx];

        // Currently unclear why this might be undefined.
        // For now, catch and return error to try to learn more.
        if (!source) return callback(new Error('Misuse: source undefined for idx ' + cover.idx));

        function typeMatch() {
            return (options.types.indexOf(source.type) !== -1);
        }

        function stackMatch() {
            if (options.stacks && source.stack) {
                for (var j = 0; j < source.stack.length; j++) {
                    if (options.stacks.indexOf(source.stack[j]) !== -1) return true;
                }
            } else if (options.stacks && !source.stack) {
                return true;
            }
        }

        if ((options.types && !options.stacks && typeMatch()) ||
            (options.stacks && !options.types && stackMatch()) ||
            (options.stacks && options.types && typeMatch() && stackMatch())) {

            filtered.push(results[i]);
        }
    }
    return filtered;
}

function verifyFeatures(query, geocoder, spatial, loaded, options) {
    var meanScore = 1;
    var result = [];
    for (var pos = 0; pos < loaded.length; pos++) {
        if (!loaded[pos]) continue;

        var feat = loaded[pos];

        var spatialmatch = spatial[pos];
        var cover = spatialmatch[0];
        var source = geocoder.byidx[cover.idx];

        // Calculate to see if there is room for an address in the query based on bitmask
        var address = termops.maskAddress(query, cover.mask);

        var checks = false;

        if (source.geocoder_address) {
            if (!checks && address && feat.properties['carmen:addressnumber']) {
                feat.properties['carmen:address'] = address.addr;
                feat.geometry = addressCluster(feat, address.addr);
                feat.properties['carmen:center'] = feat.geometry && feat.geometry.coordinates;
                checks = feat.geometry ? true : false;
            }

            if (!checks && address && feat.properties['carmen:rangetype']) {
                feat.properties['carmen:address'] = address.addr;
                feat.geometry = addressItp(feat, address.addr);
                feat.properties['carmen:center'] = feat.geometry && feat.geometry.coordinates;
                checks = checks && feat.geometry;
            }

            if (!checks) {
                feat.properties['carmen:address'] = null;
            }
        }

        if (checks) {
            // Compare feature text to matching input subquery as a safeguard
            // against fnv1a collisions.
            if (!termops.decollide(source.token_replacer, feat, cover.text)) continue;
            if (options.bbox && !bbox.inside(feat.properties["carmen:center"], options.bbox)) continue;
            feat.properties["carmen:score"] = feat.properties["carmen:score"] || 0;
            feat.properties["carmen:extid"] = source.type + '.' + feat.id;
            feat.properties["carmen:tmpid"] = cover.tmpid;
            feat.properties["carmen:dbidx"] = cover.idx;
            feat.properties["carmen:relev"] = cover.relev;
            feat.properties["carmen:distance"] = proximity.distance(options.proximity, feat.properties["carmen:center"]);
            feat.properties["carmen:position"] = pos;
            feat.properties["carmen:spatialmatch"] = spatialmatch;
            meanScore *= feat.properties["carmen:score"] > 0 ? feat.properties["carmen:score"] : 1;
            result.push(feat);
        }
    }

    // Use a geometric mean for calculating final _scoredist.
    // This allows extremely high-scored outliers to beat local
    // results unless within an extremely close proximity.
    if (result.length) meanScore = Math.pow(meanScore, 1/result.length);
    // Set a score + distance combined heuristic.
    for (var i = 0; i < result.length; i++) {
        var feat = result[i];
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
        var feat = result[i];
        var text = options.language && feat.properties["carmen:text_"+options.language] ? feat.properties["carmen:text_"+options.language] : feat.properties["carmen:text"];
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
        var name = geocoder.byidx[f.properties["carmen:dbidx"]].name;
        var firstidx = geocoder.byname[name][0].idx;
        context(geocoder, f.properties["carmen:center"][0], f.properties["carmen:center"][1], { maxidx:firstidx, matched:sets, language: options.language}, function(err, context) {
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
        var context = contexts[a];
        context._relevance = 0;
        context._typeindex = groups[context[0].properties['carmen:dbidx']];

        // Create lookup for covers by tmpid.
        var verify = {};
        for (var b = 0; b < context[0].properties['carmen:spatialmatch'].length; b++) {
            var cover = context[0].properties['carmen:spatialmatch'][b];
            verify[cover.tmpid] = cover;
        }

        var strictRelev = verifyContext(context, verify, {}, groups);
        var looseRelev = verifyContext(context, verify, sets, groups);
        context._relevance = Math.max(strictRelev, looseRelev);
    }

    contexts.sort(sortContext);
    return contexts;
}

function verifyContext(context, strict, loose, groups) {
    var spatialmatch = context[0].properties['carmen:spatialmatch'];
    var gappy = 0;
    var stacky = 0;
    var usedmask = 0;
    var lastmask = -1;
    var lastgroup = -1;
    var relevance = 0;

    for (var c = 0; c < context.length; c++) {
        var backy = false;
        var feat = context[c];
        var matched = strict[feat.properties["carmen:tmpid"]] || loose[feat.properties["carmen:tmpid"]];
        if (!matched) continue;
        if (usedmask & matched.mask) continue;

        if (lastgroup > -1) {
            stacky = 1;
            backy = lastmask > matched.mask;
            gappy += Math.abs(groups[feat.properties["carmen:dbidx"]] - lastgroup) - 1;
        }

        usedmask = usedmask | matched.mask;
        lastmask = matched.mask;
        lastgroup = groups[feat.properties['carmen:dbidx']];
        if (backy) {
            relevance += matched.relev * 0.5;
        } else {
            relevance += matched.relev;
        }
    }

    relevance -= 0.01;
    relevance += 0.01 * stacky;
    // Penalize stacking bonus slightly based on whether stacking matches
    // contained "gaps" in continuity between index levels.
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
