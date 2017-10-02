const stackable = require('../lib/spatialmatch.js').stackable;
const sortByRelevLengthIdx = require('../lib/spatialmatch.js')
    .sortByRelevLengthIdx;
const sortByZoomIdx = require('../lib/spatialmatch.js').sortByZoomIdx;
const phrasematch = require('../lib/phrasematch');
const Phrasematch = phrasematch.Phrasematch;
const PhrasematchResult = phrasematch.PhrasematchResult;
const test = require('tape');

test('stackable simple', t => {
    let a1 = new Phrasematch(
        ['a1'],
        0.5,
        parseInt('10', 2),
        null,
        null,
        0,
        null,
        0
    );
    let b1 = new Phrasematch(
        ['b1'],
        0.5,
        parseInt('1', 2),
        null,
        null,
        1,
        null,
        1
    );
    let b2 = new Phrasematch(
        ['b2'],
        0.5,
        parseInt('1', 2),
        null,
        null,
        1,
        null,
        1
    );
    let debug = stackable([
        new PhrasematchResult([a1], { idx: 0, bmask: {}, ndx: 0 }),
        new PhrasematchResult([b1, b2], { idx: 1, bmask: {}, ndx: 1 })
    ]);

    debug.forEach(stack => {
        stack.sort(sortByZoomIdx);
    });
    debug.sort(sortByRelevLengthIdx);
    debug = debug.map(stack => {
        return stack.map(s => {
            return s.subquery.join(' ');
        });
    });

    t.deepEqual(debug, [['a1', 'b1'], ['a1', 'b2']]);
    t.end();
});

test('stackable nmask', t => {
    let a1 = new Phrasematch(
        ['a1'],
        0.33,
        parseInt('100', 2),
        null,
        null,
        0,
        null,
        1
    );
    let b1 = new Phrasematch(
        ['b1'],
        0.33,
        parseInt('10', 2),
        null,
        null,
        1,
        null,
        1
    );
    let c1 = new Phrasematch(
        ['c1'],
        0.33,
        parseInt('1', 2),
        null,
        null,
        2,
        null,
        1
    );
    let debug = stackable([
        new PhrasematchResult([a1], { idx: 0, bmask: {}, ndx: 0 }),
        new PhrasematchResult([b1], { idx: 1, bmask: {}, ndx: 1 }),
        new PhrasematchResult([c1], { idx: 2, bmask: {}, ndx: 1 })
    ]);

    debug.forEach(stack => {
        stack.sort(sortByZoomIdx);
    });
    debug.sort(sortByRelevLengthIdx);
    debug = debug.map(stack => {
        return stack.map(s => {
            return s.subquery.join(' ');
        });
    });

    t.deepEqual(
        debug,
        [['a1', 'b1'], ['a1', 'c1']],
        'b1 and c1 do not stack (nmask: same geocoder_name)'
    );
    t.end();
});

test('stackable bmask', t => {
    let a1 = new Phrasematch(
        ['a1'],
        0.66,
        parseInt('100', 2),
        null,
        null,
        0,
        null,
        1
    );
    let b1 = new Phrasematch(
        ['b1'],
        0.66,
        parseInt('10', 2),
        null,
        null,
        1,
        null,
        1
    );
    let debug = stackable([
        new PhrasematchResult([a1], { idx: 0, bmask: [0, 1], ndx: 0 }),
        new PhrasematchResult([b1], { idx: 1, bmask: [1, 0], ndx: 1 })
    ]);

    debug.forEach(stack => {
        stack.sort(sortByZoomIdx);
    });
    debug.sort(sortByRelevLengthIdx);
    debug = debug.map(stack => {
        return stack.map(s => {
            return s.subquery.join(' ');
        });
    });

    t.deepEqual(
        debug,
        [['a1'], ['b1']],
        'a1 and b1 do not stack (bmask: exclusive bounds)'
    );
    t.end();
});

test('stackable complex', t => {
    let a1 = new Phrasematch(
        ['a1'],
        0.33,
        parseInt('10', 2),
        null,
        null,
        0,
        null,
        0
    );
    let a2 = new Phrasematch(
        ['a2'],
        0.66,
        parseInt('110', 2),
        null,
        null,
        0,
        null,
        0
    );
    let b1 = new Phrasematch(
        ['b1'],
        0.33,
        parseInt('1', 2),
        null,
        null,
        1,
        null,
        1
    );
    let b2 = new Phrasematch(
        ['b2'],
        0.33,
        parseInt('100', 2),
        null,
        null,
        1,
        null,
        1
    );
    let c1 = new Phrasematch(
        ['c1'],
        0.33,
        parseInt('1', 2),
        null,
        null,
        1,
        null,
        1
    );
    let c2 = new Phrasematch(
        ['c2'],
        0.33,
        parseInt('100', 2),
        null,
        null,
        1,
        null,
        1
    );
    let debug = stackable([
        new PhrasematchResult([a1, a2], { idx: 0, bmask: [], ndx: 0 }),
        new PhrasematchResult([b1, b2], { idx: 1, bmask: [], ndx: 1 }),
        new PhrasematchResult([c1, c2], { idx: 1, bmask: [], ndx: 2 })
    ]);

    debug.forEach(stack => {
        stack.sort(sortByZoomIdx);
    });
    debug.sort(sortByRelevLengthIdx);
    debug = debug.map(stack => {
        return (
            stack.relev.toFixed(2) +
            ' - ' +
            stack
                .map(s => {
                    return s.subquery.join(' ');
                })
                .join(', ')
        );
    });

    t.deepEqual(debug, [
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
    t.end();
});

test('stackable direction change', t => {
    let a1 = new Phrasematch(
        ['a1'],
        0.25,
        parseInt('0001', 2),
        null,
        null,
        0,
        null,
        0
    );
    let a2 = new Phrasematch(
        ['a2'],
        0.25,
        parseInt('1000', 2),
        null,
        null,
        0,
        null,
        0
    );
    let b1 = new Phrasematch(
        ['b1'],
        0.25,
        parseInt('0010', 2),
        null,
        null,
        1,
        null,
        1
    );
    let b2 = new Phrasematch(
        ['b2'],
        0.25,
        parseInt('0100', 2),
        null,
        null,
        1,
        null,
        1
    );
    let c1 = new Phrasematch(
        ['c1'],
        0.25,
        parseInt('0100', 2),
        null,
        null,
        2,
        null,
        2
    );
    let c2 = new Phrasematch(
        ['c2'],
        0.25,
        parseInt('0010', 2),
        null,
        null,
        2,
        null,
        2
    );
    let d1 = new Phrasematch(
        ['d1'],
        0.25,
        parseInt('1000', 2),
        null,
        null,
        3,
        null,
        3
    );
    let d2 = new Phrasematch(
        ['d2'],
        0.25,
        parseInt('0001', 2),
        null,
        null,
        3,
        null,
        4
    );
    let debug = stackable([
        new PhrasematchResult([a1, a2], { idx: 0, bmask: [], ndx: 0 }),
        new PhrasematchResult([b1, b2], { idx: 1, bmask: [], ndx: 1 }),
        new PhrasematchResult([c1, c2], { idx: 2, bmask: [], ndx: 2 }),
        new PhrasematchResult([d1, d2], { idx: 3, bmask: [], ndx: 3 })
    ]);

    debug.forEach(stack => {
        stack.sort(sortByZoomIdx);
    });
    debug.sort(sortByRelevLengthIdx);
    debug = debug.map(stack => {
        return stack.map(s => {
            return s.subquery.join(' ');
        });
    });

    t.deepEqual(debug, [
        ['a2', 'b2', 'c2', 'd2'],
        ['a2', 'b1', 'c1', 'd2'],
        ['a1', 'b2', 'c2', 'd1'],
        ['a1', 'b1', 'c1', 'd1'],
        ['a2', 'b1', 'c1'],
        ['a2', 'b2', 'c2'],
        ['a1', 'b1', 'c1'],
        ['a1', 'b2', 'c2'],
        ['a1', 'b2', 'd1'],
        ['a2', 'b2', 'd2'],
        ['a2', 'b1', 'd2'],
        ['a1', 'b1', 'd1'],
        ['a1', 'c1', 'd1'],
        ['a1', 'c2', 'd1'],
        ['a2', 'c2', 'd2'],
        ['a2', 'c1', 'd2'],
        ['b2', 'c2', 'd2'],
        ['b1', 'c1', 'd2'],
        ['b1', 'c1', 'd1'],
        ['b2', 'c2', 'd1']
    ]);
    t.end();
});

test('stackable bench', t => {
    runBench(5, 10);
    runBench(6, 10);
    runBench(7, 10);
    runBench(8, 10);
    runBench(9, 10);
    runBench(10, 10);

    function runBench(indexCount, termCount) {
        let time = 0;
        let runs = 5;
        for (let i = 0; i < runs; i++) time += bench(indexCount, termCount);
        t.comment(
            'bench x' +
                runs +
                ' (indexCount=' +
                indexCount +
                ', termCount=' +
                termCount +
                ')'
        );
        t.ok(true, 'avg time ' + Math.round(time / runs) + 'ms');
    }

    // Suppose each index matches each term
    function bench(indexCount, termCount) {
        let phraseMatches = [];
        for (let i = 0; i < indexCount; i++) {
            for (let t = 0; t < termCount; t++) {
                let matchingTerms = Math.round(Math.random() * termCount * 0.5);
                let offset = Math.floor(
                    Math.random() * (termCount - matchingTerms)
                );
                let mask = 0;
                for (let o = 0; o < matchingTerms; o++) {
                    mask = mask | (1 << (offset + o));
                }
                phraseMatches[i] =
                    phraseMatches[i] ||
                    new PhrasematchResult([], { idx: i, bmask: [], ndx: i });
                let weight = matchingTerms / termCount;
                phraseMatches[i].phrasematches.push(
                    new Phrasematch(
                        [t + '-' + i],
                        weight,
                        mask,
                        null,
                        null,
                        i,
                        null,
                        0
                    )
                );
            }
        }
        let start = +new Date();
        stackable(phraseMatches);
        return +new Date() - start;
    }
    t.end();
});
