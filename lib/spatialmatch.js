var proximity = require('./util/proximity.js');
var queue = require('d3-queue').queue;
var coalesce = require('carmen-cache').Cache.coalesce;
var uniq = require('./util/uniq');
var bbox = require('./util/bbox.js');

module.exports = spatialmatch;
module.exports.stackable = stackable;
module.exports.rebalance = rebalance;

function spatialmatch(query, phrasematches, options, callback) {
    var stacks = stackable(phrasematches);
    stacks = allowed(stacks, options);
    stacks = stacks.slice(0,30);
    // Rebalance weights, relevs of stacks here.
    for (var i = 0; i < stacks.length; i++) {
        stacks[i] = rebalance(query, stacks[i]);
    }

    var waste = [];

    coalesceLoad();

    // Load grid indexes necessary for coalesce.
    function coalesceLoad() {
        // First make a pass where phrase IDs to load are grouped by idx.
        var loadables = {};
        var idx;
        for (var i = 0; i < stacks.length; i++) {
            var stack = stacks[i];
            for (var j = 0; j < stack.length; j++) {
                idx = stack[j].idx;
                loadables[idx] = loadables[idx] || {
                    loadall: stack[j].loadall,
                    getter: stack[j].getter,
                    ids: []
                };
                loadables[idx].ids.push(stack[j].phrase);
            }
        }

        // Then queue loading in a single pass deduping ids.
        var q = queue();
        for (idx in loadables) {
            q.defer(loadables[idx].loadall, loadables[idx].getter, 'grid', uniq(loadables[idx].ids));
        }
        q.awaitAll(coalesceStacks);
    }

    // Shards are loaded, now coalesce all stacks.
    function coalesceStacks(err) {
        if (err) return callback(err);
        var q = queue();
        for (var i = 0; i < stacks.length; i++) q.defer(coalesceStack, stacks[i]);
        q.awaitAll(coalesceFinalize);
    }

    // Coalesce a single stack, add debugging info.
    function coalesceStack(stack, callback) {
        // Proximity option is set.
        // Convert proximity to xy @ highest zoom level for this stack
        var coalesceOpts = {};
        if (options && options.proximity) {
            var l = stack.length;
            var maxZoom = 0;
            while (l--) maxZoom = Math.max(maxZoom, stack[l].zoom);
            coalesceOpts.centerzxy = proximity.center2zxy(
                options.proximity,
                maxZoom
            );
        }

        if (options && options.bbox) {
            coalesceOpts.bboxzxy = bbox.insideTile(options.bbox, stack[0].zoom);
        }

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
                    feature[m].scorefactor = byIdx[feature[m].idx].scorefactor;
                    feature[m].score = feature[m].score * byIdx[feature[m].idx].scorefactor;
                    feature[m].scoredist = feature[m].scoredist * byIdx[feature[m].idx].scorefactor;
                }
            }

            if (features.length == 0) {
                waste.push(Object.keys(byIdx));
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
        var doneAscending = {};
        var doneDescending = {};
        var doneSingle = {};
        var features = [];
        for (var i = 0; i < combined.length; i++) {
            var feature = combined[i];
            for (var j = 0; j < feature.length; j++) {
                sets[feature[j].tmpid] = feature[j];
            }
            // only allow one result in each direction
            if (feature.length > 1 && feature[0].idx > feature[1].idx && !doneDescending[feature[0].tmpid]) {
                doneDescending[feature[0].tmpid] = true;
                features.push(feature);
            } else if (feature.length > 1 && feature[0].idx < feature[1].idx && !doneAscending[feature[0].tmpid]) {
                doneAscending[feature[0].tmpid] = true;
                features.push(feature);
            } else if (feature.length === 1 && !doneAscending[feature[0].tmpid] && !doneDescending[feature[0].tmpid] && !doneSingle[feature[0].tmpid]) {
                doneSingle[feature[0].tmpid] = true;
                features.push(feature);
            }
        }

        return callback(null, { results: features, sets: sets, waste: waste });
    }
}

// Filter an array of stacks down to only those whose maxidx is allowed
// by a passed in allowed_idx filter.
function allowed(stacks, options) {
    if (!options.allowed_idx) return stacks;
    var filtered = [];
    for (var i = 0; i < stacks.length; i++) {
        var stack_maxidx = 0;
        for (var j = 0; j < stacks[i].length; j++) {
            stack_maxidx = Math.max(stack_maxidx, stacks[i][j].idx);
        }
        if (options.allowed_idx[stack_maxidx]) {
            filtered.push(stacks[i]);
        }
    }
    return filtered;
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
        var direction;
        targetStack.relev = relev;

        if (targetMask & next.mask) continue;
        if (targetNmask & next.nmask) continue;

        // sort by order of input query
        targetStack.sort(sortByMask);
        // compare index order to input order to determine direction
        if (targetStack.length) {
            direction = targetStack[0].idx < next.idx ? "descending" : "ascending";
        }

        if (direction === "ascending" && targetMask && targetMask < next.mask) continue;

        // For each stacked item check the next bmask for its idx.
        // If the bmask includes the idx these indexes cannot stack
        // (their geocoder_stack do not intersect at all).
        var stackFail = 0;
        if (next.bmask) for (var j = 0; j < stack.length; j++) {
            stackFail = stackFail || (next.bmask[stack[j].idx]);
        }
        if (stackFail) continue;

        targetMask = targetMask | next.mask;
        targetNmask = targetNmask | next.nmask;
        targetStack.push(next);
        targetStack.relev += next.weight;

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

function sortByMask(a, b) {
    if (!b) return 1;
    if (!a) return 0;
    return (a.mask - b.mask);
}

function rebalance(query, stack) {
    var stackMask = 0;
    var stackClone = [];

    //shallow copy stack into stackClone to prevent cases where a stack's
    //index gets overwritten in deep copies.
    for (var m = 0; m < stack.length; m++) {
        stackClone[m] = stack[m].slice();
        for (var key in stack[m]) {
            stackClone[m][key] = stack[m][key];
        }
    }

    for (var i = 0; i < stackClone.length; i++) {
        stackMask |= stackClone[i].mask;
    }

    var garbage = (query.length === (stackMask.toString(2).split(1).length -1)) ? 0 : 1;
    var weight = 1/(garbage + stackClone.length);

    //recompute total relevance from scratch
    stackClone.relev = 0;

    for (var k = 0; k < stackClone.length; k++) {
        stackClone[k].weight = weight;
        stackClone.relev += stackClone[k].weight;
    }

    return stackClone;
}
