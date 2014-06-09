var getSetRelevance = require('./pure/setrelevance'),
    coalesceZooms = require('./pure/coalescezooms'),
    applyAddress = require('./pure/applyaddress'),
    sm = new(require('sphericalmercator'))(),
    ops = require('./util/ops'),
    mp2_14 = Math.pow(2, 14),
    mp2_28 = Math.pow(2, 28),
    queue = require('queue-async'),
    context = require('./context'),
    termops = require('./util/termops'),
    feature = require('./util/feature');

var xd = Math.pow(2, 39),
    yd = Math.pow(2, 25),
    mp2_14 = Math.pow(2, 14),
    mp2_28 = Math.pow(2, 28);

module.exports = spatialmatch;

// Given that we've geocoded potential results in multiple sources, given
// arrays of `feats` and `grids` of the same length, combine matches that
// are over the same point, factoring in the zoom levels on which they
// occur.
// Calls `callback` with `(err, contexts, relevd)` in which
//
// @param `contexts` is an array of bboxes which are assigned scores
// @param `relevd` which is an object mapping place ids to places
// @param {Object} geocoder the geocoder instance
// @param {Array} feats an array of feature objects
// @param {Array} grids an array of grid objects
// @param {Array} zooms an array of zoom numbers
// @param {Function} callback
function spatialmatch(indexes, types, query, stats, geocoder, feats, grids, zooms, proximity, callback) {

    // Combine the scores for each match across multiple grids and zoom levels,
    // producing a mapping from `zxy` to matches
    var coalesced = coalesceZooms(grids, feats, types, zooms, indexes);

    // Generate a light modifier to apply to results from indexes without
    // address handling if an address is present in the query.
    var addrmod = {};
    var addridx = {};
    var address = termops.address(query);
    for (var id in indexes) {
        addrmod[id] = address && indexes[id]._geocoder.geocoder_address ? 0.01 : 0;
        addridx[indexes[id]._geocoder.idx] = address && indexes[id]._geocoder.geocoder_address;
    }

    var sets = {},
        i, j, c, l,
        feat,
        rowMemo = {},
        rows,
        relev,
        fullid;

    for (c in coalesced) {
        rows = coalesced[c];
        // Sort by db, relev such that total relev can be
        // calculated without results for the same db being summed.
        
        rows.sort(sortRelevReason);
        relev = getSetRelevance(query, rows, address);

        for (i = 0, l = rows.length; i < l; i++) {
            fullid = rows[i].db + '.' + rows[i].id;
            if (sets[fullid]) continue;
            sets[fullid] = rows[i];
            rowMemo[rows[i].tmpid] = {
                db: rows[i].db,
                id: rows[i].id,
                tmpid: rows[i].tmpid,
                relev: relev + addrmod[rows[i].db],
                idx: rows[i].idx
            };
        }
    }

    var results = [],
        contexts = [],
        formatted = [],
        memo = null;

    for (j in rowMemo) {
        results.push(rowMemo[j]);
    }

    results.sort(sortByRelev);

    for (var k = 0; k < results.length; k++) {
        feat = results[k];
        if (memo === null || memo - feat.relev < 0.1) {
            memo = memo || feat.relev;
            formatted.push(feat);
        }
    }

    results = formatted;

    stats.relevTime = +new Date() - stats.relevTime;
    stats.relevCount = results.length;

    if (!results.length) return callback(null, results);
     
   //Stores the proximity latlng as zxy at all source zoom levels
    var zxyProximity = {};

    //If latlng is given, favour results closest locale
    if (proximity) {
        for (var i = 0; i < zooms.length; i++) {
            zxyProximity[zooms[i]] = sm.px(proximity, zooms[i]);
        }
        var zxyResult = [];
        for (var i = 0; i < results.length; i++) {
            results[i].z = indexes[results[i].db]._geocoder.zoom;
            results[i].x = Math.floor(results[i].tmpid / xd);
            results[i].y = Math.floor(results[i].tmpid % xd / yd);
            results[i].distance = Math.pow(Math.pow(zxyProximity[results[i].z][0] - results[i].x, 2) + Math.pow(zxyProximity[results[i].z][1] - results[i].y, 2), 0.5);
        }
        results.sort(sortByProximity);
    }
    
    // Disallow more than 20 of the best results at this point.
    if (results.length > 20) results = results.slice(0, 20);

    var start = +new Date();
    var q = queue();

    results.forEach(function(term) {
        q.defer(loadResult, term);
    });

    q.awaitAll(function(err) {
        if (err) return callback(err);

        var subsets;
        for (var j = 0, cl = contexts.length; j < cl; j++) {
            subsets = [];
            for (var i = 0, cjl = contexts[j].length; i < cjl; i++) {
                var a = contexts[j][i];
                if (sets[a._fhash]) subsets.push(sets[a._fhash]);
            }
            contexts[j]._relevance = getSetRelevance(query, subsets);
            contexts[j]._typeindex = types.indexOf(contexts[j][0]._extid.split('.')[0]);
        }
        
        if (proximity) {
            for (var i = 0; i < contexts.length; i++) {
                var lat1 = proximity[0],
                    lat2 = contexts[i][0]._center[1],
                    lon1 = proximity[1],
                    lon2 = contexts[i][0]._center[0];
                var phi1 = lat1 * (Math.PI / 180),
                    phi2 = lat2 * (Math.PI / 180);
                var deltaPhi = (lat2-lat1) * (Math.PI / 180),
                    deltaLambda = (lon2-lon1) * (Math.PI / 180);
                var a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
                contexts[i][0]._distance = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            }
        }
        contexts.sort(sortContext);

        stats.contextTime = +new Date() - start;
        stats.contextCount = contexts.length;

        return callback(null, contexts);
    });

    // For each result, load the feature from its Carmen index so that we can
    // then load all of the relevant contexts for that feature
    function loadResult(term, callback) {
        var cq = queue();
        var source = geocoder.indexes[term.db];
        feature.getFeature(source, term.id, featureLoaded);
        function featureLoaded(err, features) {
            if (err) return callback(err);
            for (var id in features) {
                // To exclude false positives from feature hash collisions
                // check the feature center coord and ensure it is in the
                // coalesced result set.
                // @TODO for fully accurate results, iterate through
                // coalesced[coord] for a matching feature id.
                var feat = features[id];
                // filter out altnames, scored as -1
                if (typeof feat._score !== 'undefined' && feat._score < 0) continue;
                var bbox = sm.xyz([feat._center[0], feat._center[1], feat._center[0], feat._center[1]], source._geocoder.zoom);
                var coord = (source._geocoder.zoom * mp2_28) + (bbox.minX * mp2_14) + (bbox.minY);
                var checks = coalesced[coord];
                if (address && feat._rangetype && source._geocoder.geocoder_address) {
                    feat._address = address;
                    feat._geometry = applyAddress(feat, address);
                    feat._center = feat._geometry && feat._geometry.coordinates;
                    checks = checks && feat._geometry;
                }
                if (checks) cq.defer(function(feat, callback) {
                    if (!('_center' in feat)) return callback(new Error('No _center field in data'));
                    feat._extid = term.db + '.' + id;
                    feat._fhash = term.db + '.' + term.id;
                    context(geocoder, feat._center[0], feat._center[1], term.db, false, function(err, context) {
                        if (err) return callback(err);
                        // Push feature onto the top level.
                        context.unshift(feat);
                        return callback(null, context);
                    });
                }, feat);
            }
            cq.awaitAll(contextLoaded);
        }
        function contextLoaded(err, loaded) {
            if (err) return callback(err);
            contexts.push.apply(contexts, loaded);
            callback();
        }
    }
    function sortByProximity(a, b) {
        if (addridx[a.idx] && !addridx[b.idx]) return -1;
        else if (!addridx[a.idx] && addridx[b.idx]) return 1;
        else if (a.idx < b.idx) return -1;
        else if (a.idx > b.idx) return 1;
        else if (a.relev > b.relev) return -1;
        else if (a.relev < b.relev) return 1;
        else if (a.distance < b.distance) return -1;
        else if (a.distance > b.distance) return 1;
        else if (a.id < b.id) return -1;
        else if (a.id > b.id) return 1;
        return 0;
    }

    function sortRelevReason(a, b) {
        if (addridx[a.idx] && !addridx[b.idx]) return -1;
        else if (!addridx[a.idx] && addridx[b.idx]) return 1;
        else if (a.idx < b.idx) return -1;
        else if (a.idx > b.idx) return 1;
        else if (a.relev > b.relev) return -1;
        else if (a.relev < b.relev) return 1;
        else if (a.reason > b.reason) return -1;
        else if (a.reason < b.reason) return 1;
        else if (a.id < b.id) return -1;
        else if (a.id > b.id) return 1;
        return 0;
    }
}

function sortByRelev(a, b) {
    return a.relev > b.relev ? -1 :
        a.relev < b.relev ? 1 :
        a.tmpid < b.tmpid ? -1 :
        a.tmpid > b.tmpid ? 1 : 0;
}

function sortContext(a, b) {
    // First, compute the relevance of this query term against
    // each set.
    if (a._relevance > b._relevance) return -1;
    if (a._relevance < b._relevance) return 1;

    // primary sort by result's index.
    if (a._typeindex < b._typeindex) return -1;
    if (a._typeindex > b._typeindex) return 1;

    if (a[0]._distance && b[0]._distance) {
        if (a[0]._distance < b[0]._distance) return -1;
        if (a[0]._distance > b[0]._distance) return 1;  
    }
    
    // within results of equal relevance.
    a = a[0];
    b = b[0];

    // secondary sort by score key.
    var as = a._score || 0;
    var bs = b._score || 0;
    if (as > bs) return -1;
    if (as < bs) return 1;

    // last sort by id.
    if (a._id < b._id) return -1;
    if (a._id > b._id) return 1;
    return 0;
}
