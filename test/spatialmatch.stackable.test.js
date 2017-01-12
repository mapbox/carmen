var stackable = require('../lib/spatialmatch.js').stackable;
var sortByRelevLengthIdx = require('../lib/spatialmatch.js').sortByRelevLengthIdx;
var sortByZoomIdx = require('../lib/spatialmatch.js').sortByZoomIdx;
var phrasematch = require('../lib/phrasematch');
var Phrasematch = phrasematch.Phrasematch;
var PhrasematchResult = phrasematch.PhrasematchResult;
var test = require('tape');

test('stackable simple', function(assert) {
    var a1 = new Phrasematch(['a1'], 0.5, parseInt('10', 2), null, null, 0, null, 0);
    var b1 = new Phrasematch(['b1'], 0.5, parseInt('1', 2), null, null, 1, null, 1);
    var b2 = new Phrasematch(['b2'], 0.5, parseInt('1', 2), null, null, 1, null, 1);
    var debug = stackable([
        new PhrasematchResult([a1], null, null, { idx: 0, bmask: {}, ndx: 0 }),
        new PhrasematchResult([b1, b2], null, null, { idx: 1, bmask: {}, ndx: 1 })
    ]);

    debug.forEach(function(stack) { stack.sort(sortByZoomIdx); });
    debug.sort(sortByRelevLengthIdx);
    debug = debug.map(function(stack) {
        return stack.map(function(s) { return s.subquery.join(' '); });
    });

    assert.deepEqual(debug, [
        [ 'a1', 'b1' ],
        [ 'a1', 'b2' ]
    ]);
    assert.end();
});

test('stackable nmask', function(assert) {
    var a1 = new Phrasematch(['a1'], 0.33, parseInt('100', 2), null, null, 0, null, 1);
    var b1 = new Phrasematch(['b1'], 0.33, parseInt('10', 2), null, null, 1, null, 1);
    var c1 = new Phrasematch(['c1'], 0.33, parseInt('1', 2), null, null, 2, null, 1);
    var debug = stackable([
        new PhrasematchResult([a1], null, null, { idx: 0, bmask: {}, ndx: 0 }),
        new PhrasematchResult([b1], null, null, { idx: 1, bmask: {}, ndx: 1 }),
        new PhrasematchResult([c1], null, null, { idx: 2, bmask: {}, ndx: 1 })
    ]);

    debug.forEach(function(stack) { stack.sort(sortByZoomIdx); });
    debug.sort(sortByRelevLengthIdx);
    debug = debug.map(function(stack) {
        return stack.map(function(s) { return s.subquery.join(' '); });
    });

    assert.deepEqual(debug, [
        [ 'a1', 'b1' ],
        [ 'a1', 'c1' ],
    ], 'b1 and c1 do not stack (nmask: same geocoder_name)');
    assert.end();
});

test('stackable bmask', function(assert) {
    var a1 = new Phrasematch(['a1'], 0.66, parseInt('100', 2), null, null, 0, null, 1);
    var b1 = new Phrasematch(['b1'], 0.66, parseInt('10', 2), null, null, 1, null, 1);
    var debug = stackable([
        new PhrasematchResult([a1], null, null, { idx: 0, bmask: [0, 1], ndx: 0 }),
        new PhrasematchResult([b1], null, null, { idx: 1, bmask: [1, 0], ndx: 1 })
    ]);

    debug.forEach(function(stack) { stack.sort(sortByZoomIdx); });
    debug.sort(sortByRelevLengthIdx);
    debug = debug.map(function(stack) {
        return stack.map(function(s) { return s.subquery.join(' '); });
    });

    assert.deepEqual(debug, [
        [ 'a1' ],
        [ 'b1' ],
    ], 'a1 and b1 do not stack (bmask: exclusive bounds)');
    assert.end();
});

test('stackable complex', function(assert) {
    var a1 = new Phrasematch(['a1'], 0.33, parseInt('10', 2), null, null, 0, null, 0);
    var a2 = new Phrasematch(['a2'], 0.66, parseInt('110', 2), null, null, 0, null, 0);
    var b1 = new Phrasematch(['b1'], 0.33, parseInt('1', 2), null, null, 1, null, 1);
    var b2 = new Phrasematch(['b2'], 0.33, parseInt('100', 2), null, null, 1, null, 1);
    var c1 = new Phrasematch(['c1'], 0.33, parseInt('1', 2), null, null, 1, null, 1);
    var c2 = new Phrasematch(['c2'], 0.33, parseInt('100', 2), null, null, 1, null, 1);
    var debug = stackable([
        new PhrasematchResult([a1, a2], null, null, { idx: 0, bmask: [], ndx: 0 }),
        new PhrasematchResult([b1, b2], null, null, { idx: 1, bmask: [], ndx: 1 }),
        new PhrasematchResult([c1, c2], null, null, { idx: 1, bmask: [], ndx: 2 }),
    ]);

    debug.forEach(function(stack) { stack.sort(sortByZoomIdx); });
    debug.sort(sortByRelevLengthIdx);
    debug = debug.map(function(stack) {
        return stack.relev.toFixed(2) + ' - ' + stack.map(function(s) { return s.subquery.join(' ')}).join(', ');
    });

    assert.deepEqual(debug, [
        '0.99 - a2, c1',
        '0.99 - a2, b1',
        '0.99 - a1, b2, c1',
        '0.66 - a2',
        '0.66 - a1, c1',
        '0.66 - a1, c2',
        '0.66 - a1, b1',
        '0.66 - a1, b2',
        '0.66 - b2, c1'
    ]);
    assert.end();
});

test('stackable direction change', function(assert) {
    var a1 = new Phrasematch(['a1'], 0.25, parseInt('0001', 2), null, null, 0, null, 0);
    var a2 = new Phrasematch(['a2'], 0.25, parseInt('1000', 2), null, null, 0, null, 0);
    var b1 = new Phrasematch(['b1'], 0.25, parseInt('0010', 2), null, null, 1, null, 1);
    var b2 = new Phrasematch(['b2'], 0.25, parseInt('0100', 2), null, null, 1, null, 1);
    var c1 = new Phrasematch(['c1'], 0.25, parseInt('0100', 2), null, null, 2, null, 2);
    var c2 = new Phrasematch(['c2'], 0.25, parseInt('0010', 2), null, null, 2, null, 2);
    var d1 = new Phrasematch(['d1'], 0.25, parseInt('1000', 2), null, null, 3, null, 3);
    var d2 = new Phrasematch(['d2'], 0.25, parseInt('0001', 2), null, null, 3, null, 4);
    var debug = stackable([
        new PhrasematchResult([a1, a2], null, null, { idx: 0, bmask: [], ndx: 0 }),
        new PhrasematchResult([b1, b2], null, null, { idx: 1, bmask: [], ndx: 1 }),
        new PhrasematchResult([c1, c2], null, null, { idx: 2, bmask: [], ndx: 2 }),
        new PhrasematchResult([d1, d2], null, null, { idx: 3, bmask: [], ndx: 3 }),
    ]);

    debug.forEach(function(stack) { stack.sort(sortByZoomIdx); });
    debug.sort(sortByRelevLengthIdx);
    debug = debug.map(function(stack) {
        return stack.map(function(s) { return s.subquery.join(' ')});
    });

    assert.deepEqual(debug, [
        [ 'a2', 'b2', 'c2', 'd2' ],
        [ 'a2', 'b1', 'c1', 'd2' ],
        [ 'a1', 'b2', 'c2', 'd1' ],
        [ 'a1', 'b1', 'c1', 'd1' ],
        [ 'a2', 'b1', 'c1' ],
        [ 'a2', 'b2', 'c2' ],
        [ 'a1', 'b1', 'c1' ],
        [ 'a1', 'b2', 'c2' ],
        [ 'a1', 'b2', 'd1' ],
        [ 'a2', 'b2', 'd2' ],
        [ 'a2', 'b1', 'd2' ],
        [ 'a1', 'b1', 'd1' ],
        [ 'a1', 'c1', 'd1' ],
        [ 'a1', 'c2', 'd1' ],
        [ 'a2', 'c2', 'd2' ],
        [ 'a2', 'c1', 'd2' ],
        [ 'b2', 'c2', 'd2' ],
        [ 'b1', 'c1', 'd2' ],
        [ 'b1', 'c1', 'd1' ],
        [ 'b2', 'c2', 'd1' ]
    ]);
    assert.end();
});

test('stackable bench', function(assert) {
    runBench(5, 10);
    runBench(6, 10);
    runBench(7, 10);
    runBench(8, 10);
    runBench(9, 10);
    runBench(10, 10);

    function runBench(indexCount, termCount) {
        var time = 0;
        var runs = 5;
        for (var i = 0; i < runs; i++) time += bench(indexCount, termCount);
        assert.comment('bench x' + runs + ' (indexCount=' + indexCount + ', termCount=' + termCount + ')');
        assert.ok(true, 'avg time ' + Math.round(time/runs) + 'ms');
    }

    // Suppose each index matches each term
    function bench(indexCount, termCount) {
        var phraseMatches = [];
        for (var i = 0; i < indexCount; i++) {
            for (var t = 0; t < termCount; t++) {
                var matchingTerms = Math.round(Math.random() * termCount * 0.5);
                var offset = Math.floor(Math.random() * (termCount - matchingTerms));
                var mask = 0;
                for (var o = 0; o < matchingTerms; o++) {
                    mask = mask | (1 << (offset + o));
                }
                phraseMatches[i] = phraseMatches[i] || new PhrasematchResult([], null, null, { idx: i, bmask: [], ndx: i });
                var weight = matchingTerms / termCount;
                phraseMatches[i].phrasematches.push(new Phrasematch([t + '-' + i], weight, mask, null, null, i, null, 0));
            }
        }
        var start = +new Date;
        stackable(phraseMatches);
        return (+new Date) - start;
    }
    assert.end();
});

