var decode = require('./util/grid.js').decode;
var proximity = require('./util/proximity.js');
var queue = require('queue-async');
var coalesce = require('carmen-cache').Cache.coalesce;

module.exports = spatialmatch;
module.exports.stackable = stackable;

function spatialmatch(query, phrasematches, options, callback) {
    var stacks = stackable(phrasematches);
    stacks = stacks.slice(0,30);

    var relevMax = 0;
    var features = [];
    var sets = {};

    var q = queue();

    for (var i = 0; i < stacks.length; i++) {
        var stack = stacks[i];
        var l = 0;
        var m = 0;

        // Proximity option is set.
        // Convert proximity to xy @ highest zoom level for this stack
        var coalesceOpts = {};
        if (options && options.proximity) {
            l = stack.length;
            var maxZoom = 0;
            while (l--) maxZoom = Math.max(maxZoom, stack[l].zoom);
            coalesceOpts.centerzxy = proximity.center2zxy(
                options.proximity[0],
                options.proximity[1],
                maxZoom
            );
        }

        q.defer(coalesceLoad, stack, coalesceOpts);
    }

    q.awaitAll(coalesceFinalize);

    // Load grid indexes necessary for coalesce.
    function coalesceLoad(stack, coalesceOpts, callback) {
        var q = queue();
        for (var i = 0; i < stack.length; i++) {
            q.defer(stack[i].loadall, stack[i].getter, 'grid', [stack[i].phrase]);
        }
        q.awaitAll(function(err) {
            if (err) return callback(err);
            coalesceStack(stack, coalesceOpts, callback);
        });
    }

    // Coalesce stack, add debugging info.
    function coalesceStack(stack, coalesceOpts, callback) {
        coalesce(stack, coalesceOpts, function(err, features) {
            // Include text for debugging with each matched feature.
            var byIdx = stackByIdx(stack);
            var l = features.length;
            while (l--) {
                var feature = features[l];
                var m = feature.length;
                while (m--) {
                    feature[m].mask = byIdx[feature[m].idx].mask;
                    feature[m].text = byIdx[feature[m].idx].text;
                    feature[m].score = feature[m].score * byIdx[feature[m].idx].scorefactor;
                    feature[m].scoredist = feature[m].scoredist * byIdx[feature[m].idx].scorefactor;
                }
            }
            callback(null, features);
        });
    }

    // Final feature collection and sort.
    function coalesceFinalize(err, results) {
        if (err) return callback(err);

        var combined = [];
        combined = combined.concat.apply(combined, results);
        combined.sort(sortByRelev);

        var sets = {};
        var done = {};
        var features = [];
        for (var i = 0; i < combined.length; i++) {
            var feature = combined[i];
            for (var j = 0; j < feature.length; j++) {
                sets[feature[j].tmpid] = feature[j];
            }
            if (!done[feature[0].tmpid]) {
                done[feature[0].tmpid] = true;
                features.push(feature);
            }
        }

        return callback(null, { results: features, sets: sets });
    }
}

function stackByIdx(stack) {
    var byIdx = {};
    var l = stack.length;
    while (l--) byIdx[stack[l].idx] = {
        scorefactor: stack[l].scorefactor,
        mask: stack[l].mask,
        text: stack[l].join(' ')
    };
    return byIdx;
}

// For a given set of phrasematch results across multiple indexes,
// provide all relevant stacking combinations using phrase masks to
// exclude colliding matches.
function stackable(phrasematches, idx, mask, nmask, stack, relev) {
    idx = idx || 0;
    mask = mask || 0;
    nmask = nmask || 0;
    stack = stack || [];
    relev = relev || 0;

    var stacks = [];

    if (!phrasematches[idx]) return stacks;

    // Recurse, skipping this level
    stacks.push.apply(stacks, stackable(phrasematches, idx+1, mask, nmask, stack, relev));

    // Recurse, including this level
    for (var i = 0; i < phrasematches[idx].length; i++) {
        var targetStack = stack.slice(0);
        var targetMask = mask;
        var targetNmask = nmask;
        var next = phrasematches[idx][i];
        targetStack.relev = relev;

        if (targetMask & next.mask) continue;
        if (targetNmask & next.nmask) continue;
        if (targetMask && targetMask < next.mask) continue;

        // For each stacked item check the next bmask for its idx.
        // If the bmask includes the idx these indexes cannot stack
        // (their bounds do not intersect at all).
        var boundsFail = 0;
        if (next.bmask) for (var j = 0; j < stack.length; j++) {
            boundsFail = boundsFail || (next.bmask[stack[j].idx]);
        }
        if (boundsFail) continue;

        targetMask = targetMask | next.mask;
        targetNmask = targetNmask | next.nmask;
        targetStack.push(next);
        targetStack.relev += next.weight;
        //targetStack.relev += targetStack.length == 2 ? 0.01 : 0;

        if (targetStack.relev > 0.5) {
            targetStack.sort(sortByZoomIdx);
            stacks.push(targetStack);
        }

        stacks.push.apply(stacks, stackable(phrasematches, idx+1, targetMask, targetNmask, targetStack, targetStack.relev));
    }

    if (idx === 0) stacks.sort(sortByRelevLengthIdx);

    return stacks;
}

function sortByRelevLengthIdx(a, b) {
    return (b.relev - a.relev) ||
        (a.length - b.length) ||
        (b[b.length-1].scorefactor - a[a.length-1].scorefactor) ||
        (a[a.length-1].idx - b[b.length-1].idx);
}

function sortByZoomIdx(a, b) {
    return (a.zoom - b.zoom) || (b.idx - a.idx);
}

function sortByRelev(a, b) {
    return (b.relev - a.relev) ||
        (b[0].scoredist - a[0].scoredist) ||
        (a[0].idx - b[0].idx);
}

