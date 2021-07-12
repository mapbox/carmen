/* eslint-disable require-jsdoc */

'use strict';
const tape = require('tape');
const phrasematch = require('../../../lib/geocoder/phrasematch');
const termops = require('../../../lib/text-processing/termops');
const token = require('../../../lib/text-processing/token');
const ENDING_TYPE = require('@mapbox/carmen-core').ENDING_TYPE;

function bearablePermutations(permutations) {
    return permutations.map((v) => {
        return {
            phrase: Array.from(v[0]),
            mask: v[0].mask,
            ender: v[0].ender,
            ending_type: v[1],
            phrase_id_range: [0, 0]
        };
    });
}

function fakeFuzzyMatches(permutations) {
    return bearablePermutations(permutations).map((v) => {
        return  [{
            phrase: v.phrase,
            edit_distance: 0,
            ending_type: v.ending_type,
            phrase_id_range: [0, 0]
        }];
    });
}

function fakeCarmen(reader) {
    return {
        geocoder_universal_text: true,
        complex_query_replacer: [],
        _gridstore: {
            'reader': true
        },
        _fuzzyset: { reader }
    };
}

tape('findMaskBounds', (t) => {
    const findMaskBounds = phrasematch.findMaskBounds;
    t.deepEqual(findMaskBounds(0b0001, 20), [0,0]);
    t.deepEqual(findMaskBounds(0b0011, 20), [0,1]);
    t.deepEqual(findMaskBounds(0b0111, 20), [0,2]);
    t.deepEqual(findMaskBounds(0b1111, 20), [0,3]);
    t.deepEqual(findMaskBounds(0b0010, 20), [1,1]);
    t.deepEqual(findMaskBounds(0b0110, 20), [1,2]);
    t.deepEqual(findMaskBounds(0b1110, 20), [1,3]);
    t.deepEqual(findMaskBounds(0b0100, 20), [2,2]);
    t.deepEqual(findMaskBounds(0b1100, 20), [2,3]);
    t.deepEqual(findMaskBounds(0b1000, 20), [3,3]);

    // Doesn't bridge gaps
    t.deepEqual(findMaskBounds(0b1001, 20), [0,0]);
    t.deepEqual(findMaskBounds(0b0101, 20), [0,0]);

    // No bits set in mask return non mask
    t.deepEqual(findMaskBounds(0b0000, 20), [-1, -1]);

    t.end();
});

tape('requiredMasks', (t) => {
    const requiredMasks = phrasematch.requiredMasks;
    t.deepEqual(requiredMasks({ owner: [0,1,2,3,4] }), [], 'No masks for unaltered ownership');

    t.deepEqual(requiredMasks({ owner: [0,0,1,2,3] }), [3], 'replaced into 2 tokens');
    t.deepEqual(requiredMasks({ owner: [0,0,0,1,2] }), [7], 'replaced into 3 tokens');
    t.deepEqual(requiredMasks({ owner: [0,1,1,2,3] }), [6], 'replaced into 2 tokens, offset from start');
    t.deepEqual(requiredMasks({ owner: [0,1,2,3,3] }), [24], 'replaced into 2 tokens, at end');
    t.deepEqual(requiredMasks({ owner: [0,0,0,1,1] }), [7,24], '2 replacement expanded tokens');

    // Currently removed tokens don't put any special contraints on the results
    // but this may change in the future.
    t.deepEqual(requiredMasks({ owner: [0,1,3,4,5] }), []);
    t.deepEqual(requiredMasks({ owner: [0,0,2,3,4] }), [3]);
    t.deepEqual(requiredMasks({ owner: [0,0,0,3,4] }), [7]);
    t.deepEqual(requiredMasks({ owner: [0,2,2,2,4] }), [14]);
    t.deepEqual(requiredMasks({ owner: [0,3,4,5,8] }), []);

    t.end();
});

tape('gapMasks', (t) => {
    const gapMasks = phrasematch.gapMasks;
    t.deepEqual(gapMasks({ tokens: ['a','b','c','d','e'] }), [], 'No masks for no removals');
    t.deepEqual(gapMasks({ tokens: ['','b','c','d','e'] }), [3], 'First token removed');
    t.deepEqual(gapMasks({ tokens: ['a','b','c','d',''] }), [24], 'last token removed');
    t.deepEqual(gapMasks({ tokens: ['a','b','','d','e'] }), [6, 12], 'single middle token removed');
    t.deepEqual(gapMasks({ tokens: ['a','','','d','e'] }), [7, 14], 'two middle tokens removed');
    t.deepEqual(gapMasks({ tokens: ['a','','','','e'] }), [15, 30], 'three middle tokens removed');
    t.deepEqual(gapMasks({ tokens: ['a','','c','','e'] }), [3, 6, 12, 24], 'two gaps');
    t.deepEqual(gapMasks({ tokens: ['','','c','',''] }), [7, 28], 'two large gaps');
    t.end();

});

tape('fuzzyMatchWindows', (t) => {
    const c = fakeCarmen({
        fuzzyMatchWindows: (a, b, c, d) => {
            t.deepEqual(a, ['100', 'main', 'street']);
            t.deepEqual(b, 0);
            t.deepEqual(c, 0);
            t.deepEqual(c, ENDING_TYPE.nonPrefix);
            return [];
        }
    });
    phrasematch(c, termops.tokenize('100 Main Street'), {}, (err, results, source) => {
        t.error(err);
        t.end();
    });
});

tape('fuzzyMatchWindows - autocomplete sets word_boundary', (t) => {
    const c = fakeCarmen({
        fuzzyMatchWindows: (a, b, c, d) => {
            t.deepEqual(a, ['100', 'main', 'st'], 'Got replaced query');
            t.deepEqual(d, ENDING_TYPE.wordBoundaryPrefix, 'Query has expected prefix scan type');
            return [];
        }
    });
    c.complex_query_replacer = token.createComplexReplacer([
        { from:'street', to: 'st' } // Not actually complex, won't be seen in the wild
    ]);
    phrasematch(c, termops.tokenize('100 Main Street'), {
        autocomplete: true
    }, (err, results, source) => {
        t.error(err);
        t.end();
    });
});

tape('fuzzyMatchWindows - autocomplete sets enabled', (t) => {
    const c = fakeCarmen({
        fuzzyMatchWindows: (a, b, c, d) => {
            t.deepEqual(a, ['100', 'main', 'st', 'ohio'], 'Got replaced query');
            t.deepEqual(d, ENDING_TYPE.anyPrefix, 'Query has expected prefix scan type');
            return [];
        }
    });
    c.complex_query_replacer = token.createComplexReplacer([
        { from:'street', to: 'st' } // Not actually complex, won't be seen in the wild
    ]);
    phrasematch(c, termops.tokenize('100 Main Street Ohio'), {
        autocomplete: true
    }, (err, results, source) => {
        t.error(err);
        t.end();
    });
});

tape('fuzzyMatchWindows - expanded tokens', (t) => {
    const c = fakeCarmen({
        fuzzyMatchWindows: (a, b, c, d) => {
            t.deepEqual(a, ['100', 'herman', 'str']);
            const expected = [
                { start_position: 0, phrase: ['100', 'herman', 'str'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] },
                { start_position: 0, phrase: ['100', 'herman'], edit_distance: 0, ending_type: 0, phrase_id_range: [1, 1] },
                { start_position: 1, phrase: ['herman', 'str'], edit_distance: 0, ending_type: 0, phrase_id_range: [2, 2] },
                { start_position: 1, phrase: ['herman'], edit_distance: 0, ending_type: 0, phrase_id_range: [3, 3] },
                { start_position: 2, phrase: ['str'], edit_distance: 0, ending_type: 0, phrase_id_range: [4, 4] },
                { start_position: 0, phrase: ['100'], edit_distance: 0, ending_type: 0, phrase_id_range: [5, 5] }
            ];
            return expected;
        }
    });
    c.complex_query_replacer = token.createComplexReplacer([
        {
            from:'([^ ]+)(strasse|str|straße)',
            to: { text: '$1 str', regex: true, skipDiacriticStripping: true, spanBoundaries: 0 }
        }
    ]);
    phrasematch(c, termops.tokenize('100 hermanstrasse'), {}, (err, results, source) => {
        t.error(err);
        t.equal(results.length, 3);
        const expected = {
            '100 herman str': { mask: 3, weight: 1 },
            'herman str': { mask: 2, weight: 0.5 },
            '100': { mask: 1, weight: 0.5 },
        };
        results.forEach((v) => {
            t.equal(v.mask, expected[v.phrase].mask, `Correct mask for "${v.phrase}"`);
            t.equal(v.weight, expected[v.phrase].weight, `Correct weight for "${v.phrase}"`);
        });
    });
    t.end();
});

tape('fuzzyMatchWindows - removed term', (t) => {
    const c = fakeCarmen({
        fuzzyMatchWindows: (a, b, c, d) => {
            t.deepEqual(a, ['100', 'main', 'springfield']);
            const expected = [
                { start_position: 0, phrase: ['100', 'main', 'springfield'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] },
                { start_position: 0, phrase: ['100', 'main'], edit_distance: 0, ending_type: 0, phrase_id_range: [1, 1] },
                { start_position: 1, phrase: ['main', 'springfield'], edit_distance: 0, ending_type: 0, phrase_id_range: [2, 2] },
                { start_position: 2, phrase: ['springfield'], edit_distance: 0, ending_type: 0, phrase_id_range: [3, 3] },
                { start_position: 1, phrase: ['main'], edit_distance: 0, ending_type: 0, phrase_id_range: [4, 4] },
                { start_position: 0, phrase: ['100'], edit_distance: 0, ending_type: 0, phrase_id_range: [5, 5] }
            ];
            return expected;
        }
    });
    c.complex_query_replacer = token.createComplexReplacer([
        {
            from:'unit [0-9]+',
            to: { text: '', regex: true, spanBoundaries: 1 }
        }
    ]);
    const query = termops.tokenize('100 Main Unit 2 Springfield');
    const clone = JSON.parse(JSON.stringify(query));
    phrasematch(c, query, {}, (err, results, source) => {
        t.error(err);
        t.equal(results.length, 9);
        const expected = new Set([
            '100 main springfield - 31 - 1',
            'main springfield - 30 - 0.8',
            '100 main - 3 - 0.4',
            '100 main - 15 - 0.8',
            'main - 2 - 0.2',
            'main - 14 - 0.6',
            '100 - 1 - 0.2',
            'springfield - 16 - 0.2',
            'springfield - 28 - 0.6'
        ]);
        results.forEach((v) => {
            const k = `${v.phrase} - ${v.mask} - ${v.weight}`;
            t.ok(expected.has(k), `has "${k}"`);
        });
        t.deepEqual(query, clone, 'replacements did not altery query');

        t.deepEqual(results[0], results[0].clone(), 'phrasematch clone works');

        t.end();
    });
});

tape('fuzzyMatchWindows - expanded & removed term', (t) => {
    const c = fakeCarmen({
        fuzzyMatchWindows: (a, b, c, d) => {
            t.deepEqual(a, ['herman', 'str', '100', 'berlin']);
            const expected = [
                { start_position: 0, phrase: ['herman', 'str', '100', 'berlin'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] },
                { start_position: 0, phrase: ['herman', 'str', '100'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] },
                { start_position: 0, phrase: ['herman', 'str'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] },
                { start_position: 2, phrase: ['100', 'berlin'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] },
                { start_position: 3, phrase: ['berlin'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] },
                { start_position: 0, phrase: ['herman'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] },
                { start_position: 1, phrase: ['str'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] },
                { start_position: 2, phrase: ['100'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }
            ];
            return expected;
        }
    });
    c.complex_query_replacer = token.createComplexReplacer([
        {
            from:'junk',
            to: { text: '', spanBoundaries: 0 }
        },
        {
            from:'([^ ]+)(strasse|str|straße)',
            to: { text: '$1 str', regex: true, skipDiacriticStripping: true, spanBoundaries: 0 }
        }
    ]);
    const query = termops.tokenize('hermanstrasse 100 junk berlin');
    const clone = JSON.parse(JSON.stringify(query));
    phrasematch(c, query, {}, (err, results, source) => {
        t.error(err);
        // t.equal(results.length, 9);
        const expected = new Set([
            'herman str 100 berlin - 15 - 1',
            'herman str 100 - 7 - 0.75',
            'herman str 100 - 3 - 0.5',
            'herman str - 1 - 0.25',
            '100 berlin - 14 - 0.75',
            'berlin - 12 - 0.5',
            'berlin - 8 - 0.25',
            '100 - 6 - 0.5',
            '100 - 2 - 0.25'
        ]);
        results.forEach((v) => {
            const k = `${v.phrase} - ${v.mask} - ${v.weight}`;
            t.ok(expected.has(k), `has "${k}"`);
        });
        t.deepEqual(query, clone, 'replacements did not alter query');
        t.end();
    });
});

tape('fuzzyMatchWindows - removed term at the end of a query', (t) => {
    const c = fakeCarmen({
        fuzzyMatchWindows: (a, b, c, d) => {
            t.deepEqual(a, ['roma', 'termini', 'rs']);
            const expected = [
                { start_position: 0, 'phrase':['roma','termini','rs'],'edit_distance':0,'ending_type':0, phrase_id_range: [0, 0] },
                { start_position: 0, 'phrase':['roma','termini'],'edit_distance':0,'ending_type':0, phrase_id_range: [0, 0] },
                { start_position: 2, 'phrase':['termini','rs'],'edit_distance':0,'ending_type':0, phrase_id_range: [0, 0] },
                { start_position: 0, 'phrase':['roma'],'edit_distance':0,'ending_type':0, phrase_id_range: [0, 0] },
                { start_position: 1, 'phrase':['termini'],'edit_distance':0,'ending_type':0, phrase_id_range: [0, 0] },
                { start_position: 2, 'phrase':['rs'],'edit_distance':0,'ending_type':0, phrase_id_range: [0, 0] }
            ];
            return expected;
        }
    });
    c.complex_query_replacer = token.createComplexReplacer([
        {
            from:'railway station',
            to: { text: 'rs', spanBoundaries: 1 }
        }
    ]);
    const query = termops.tokenize('Roma Termini Railway Station');
    const clone = JSON.parse(JSON.stringify(query));
    phrasematch(c, query, {}, (err, results, source) => {
        t.error(err);
        t.equal(results.length, 5);
        const expected = {
            'roma termini rs': { mask: 15, weight: 1 },
            'roma termini': { mask: 3, weight: 0.5 },
            'termini rs': { mask: 14, weight: 0.75 },
            'rs': { mask: 12, weight: 0.5 },
            'termini': { mask: 2, weight: 0.25 },
            'roma': { mask: 1, weight: 0.25 },
        };
        results.forEach((v) => {
            t.equal(v.mask, expected[v.phrase].mask, `Correct mask for "${v.phrase}"`);
            t.equal(v.weight, expected[v.phrase].weight, `Correct weight for "${v.phrase}"`);
        });
        t.deepEqual(query, clone, 'replacements did not altery query');
        t.end();
    });
});

tape('fuzzyMatchMulti - correct address permutations', (t) => {
    const c = fakeCarmen({
        fuzzyMatchMulti: (a, b, c, d) => {
            const expected = [
                { phrase: ['100','main','street'], mask: 7, ender: true, ending_type: 0, phrase_id_range: [0, 0] },
                { phrase: ['1##','main','street'], mask: 7, ender: true, ending_type: 0, phrase_id_range: [0, 0] },
                { phrase: ['100','main'], mask: 3, ender: false, ending_type: 0, phrase_id_range: [0, 0] },
                { phrase: ['main','street'], mask: 6, ender: true, ending_type: 0, phrase_id_range: [0, 0] },
                { phrase: ['1##','main'], mask: 3, ender: false, ending_type: 0, phrase_id_range: [0, 0] },
                { phrase: ['main'], mask: 2, ender: false, ending_type: 0, phrase_id_range: [0, 0] },
                { phrase: ['street'], mask: 4, ender: true, ending_type: 0, phrase_id_range: [0, 0] },
            ];
            const actual = bearablePermutations(a);
            t.deepEqual(actual, expected);
            return new Array(a.length).fill([]);
        }
    });
    c.geocoder_address = true;

    phrasematch(c, termops.tokenize('100 Main Street'), {}, (err, results, source) => {
        t.error(err);
        t.end();
    });
});

tape('fuzzyMatchMulti - correct address permutations: all numbers', (t) => {
    const c = fakeCarmen({
        fuzzyMatchMulti: (a, b, c, d) => {
            const expected = [
                { phrase: ['100', '200', '300'], mask: 7, ender: true, ending_type: 0, phrase_id_range: [0, 0] },
                { phrase: ['1##', '200', '300'], mask: 7, ender: true, ending_type: 0, phrase_id_range: [0, 0] },
                { phrase: ['3##', '100', '200'], mask: 7, ender: false, ending_type: 0, phrase_id_range: [0, 0] },
                { phrase: ['100', '200'], mask: 3, ender: false, ending_type: 0, phrase_id_range: [0, 0] },
                { phrase: ['200', '300'], mask: 6, ender: true, ending_type: 0, phrase_id_range: [0, 0] },
                { phrase: ['1##', '200'], mask: 3, ender: false, ending_type: 0, phrase_id_range: [0, 0] },
                { phrase: ['2##', '100'], mask: 3, ender: false, ending_type: 0, phrase_id_range: [0, 0] },
                { phrase: ['2##', '300'], mask: 6, ender: true, ending_type: 0, phrase_id_range: [0, 0] },
                { phrase: ['3##', '200'], mask: 6, ender: false, ending_type: 0, phrase_id_range: [0, 0] },
            ];
            const actual = bearablePermutations(a);
            t.deepEqual(actual, expected);
            return new Array(a.length).fill([]);
        }
    });
    c.geocoder_address = true;

    phrasematch(c, termops.tokenize('100 200 300'), {}, (err, results, source) => {
        t.error(err);
        t.end();
    });
});

tape('fuzzyMatchMulti - autocomplete sets word_boundary', (t) => {
    const c = fakeCarmen({
        fuzzyMatchMulti: (a, b, c, d) => {
            const results = fakeFuzzyMatches(a);
            const expected = [
                [{ phrase: ['st'], edit_distance: 0, ending_type: 2, phrase_id_range: [0, 0] }]
            ];
            t.deepEqual(results, expected);
            return results;
        }
    });
    c.geocoder_address = true;
    c.complex_query_replacer = token.createComplexReplacer([
        { from:'street', to: 'st' } // Not actually complex, won't be seen in the wild
    ]);

    phrasematch(c, termops.tokenize('street'), {
        autocomplete: true
    }, (err, results, source) => {
        t.error(err);
        t.end();
    });
});

tape('fuzzyMatchMulti - autocomplete sets enabled', (t) => {
    const c = fakeCarmen({
        fuzzyMatchMulti: (a, b, c, d) => {
            const results = fakeFuzzyMatches(a);
            const expected = [
                [{ phrase: ['st'], edit_distance: 0, ending_type: 1, phrase_id_range: [0, 0] }]
            ];
            t.deepEqual(results, expected);
            return results;
        }
    });
    c.geocoder_address = true;
    c.complex_query_replacer = token.createComplexReplacer([
        { from:'street', to: 'st' } // Not actually complex, won't be seen in the wild
    ]);

    phrasematch(c, termops.tokenize('st'), {
        autocomplete: true
    }, (err, results, source) => {
        t.error(err);
        t.end();
    });
});

tape('fuzzyMatchMulti - single term', (t) => {
    const c = fakeCarmen({
        fuzzyMatchMulti: (a, b, c, d) => {
            const results = fakeFuzzyMatches(a);
            const expected = [
                [{ phrase: ['baltimore'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }]
            ];
            t.deepEqual(results, expected);
            return results;
        }
    });
    c.geocoder_address = true;

    phrasematch(c, termops.tokenize('baltimore'), {}, (err, results, source) => {
        t.error(err);
        t.equal(results.length, 1);
        const expected = {
            'baltimore': { mask: 1, weight: 1 },
        };
        results.forEach((v) => {
            t.equal(v.mask, expected[v.phrase].mask, `Correct mask for "${v.phrase}"`);
            t.equal(v.weight, expected[v.phrase].weight, `Correct weight for "${v.phrase}"`);
        });
        t.end();
    });
});

tape('fuzzyMatchMulti - basic masks', (t) => {
    const c = fakeCarmen({
        fuzzyMatchMulti: (a, b, c, d) => {
            const results = fakeFuzzyMatches(a);
            const expected = [
                [{ phrase: ['100', 'main'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
                [{ phrase: ['1##', 'main'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
                [{ phrase: ['main'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
            ];
            t.deepEqual(results, expected);
            return results;
        }
    });
    c.geocoder_address = true;

    phrasematch(c, termops.tokenize('100 main'), {}, (err, results, source) => {
        t.error(err);
        t.equal(results.length, 3);
        const expected = {
            'main': { mask: 2, weight: 0.5 },
            '100 main': { mask: 3, weight: 1 },
            '1## main': { mask: 3, weight: 1 }
        };
        results.forEach((v) => {
            t.equal(v.mask, expected[v.phrase].mask, `Correct mask for "${v.phrase}"`);
            t.equal(v.weight, expected[v.phrase].weight, `Correct weight for "${v.phrase}"`);
        });
        t.end();
    });
});

tape('fuzzyMatchMulti - masks for expanded terms', (t) => {
    const c = fakeCarmen({
        fuzzyMatchMulti: (a, b, c, d) => {
            const results = fakeFuzzyMatches(a);
            const expected = [
                [{ phrase: ['herman', 'str', '100'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
                [{ phrase: ['1##', 'herman', 'str'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
                [{ phrase: ['herman', 'str'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
            ];
            t.deepEqual(results, expected);
            return results;
        }
    });
    c.geocoder_address = true;
    c.complex_query_replacer = token.createComplexReplacer([
        {
            from:'([^ ]+)(strasse|str|straße)',
            to: { text: '$1 str', regex: true, skipDiacriticStripping: true, spanBoundaries: 0 }
        }
    ]);

    const query = termops.tokenize('hermanstrasse 100');
    const clone = JSON.parse(JSON.stringify(query));
    phrasematch(c, query, {}, (err, results, source) => {
        t.error(err);
        t.equal(results.length, 3);
        const expected = {
            'herman str 100': { mask: 3, weight: 1 },
            '1## herman str': { mask: 3, weight: 1 },
            'herman str': { mask: 1, weight: 0.5 },
        };
        results.forEach((v) => {
            t.equal(v.mask, expected[v.phrase].mask, `Correct mask for "${v.phrase}"`);
            t.equal(v.weight, expected[v.phrase].weight, `Correct weight for "${v.phrase}"`);
        });
        t.deepEqual(query, clone, 'replacements did not altery query');
        t.end();
    });
});

tape('fuzzyMatchMulti - masks for removed terms', (t) => {
    const c = fakeCarmen({
        fuzzyMatchMulti: (a, b, c, d) => {
            const results = fakeFuzzyMatches(a);
            const expected = [
                [{ phrase: ['100', 'main', 'springfield'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
                [{ phrase: ['1##', 'main', 'springfield'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
                [{ phrase: ['100', 'main'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
                [{ phrase: ['main', 'springfield'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
                [{ phrase: ['1##', 'main'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
                [{ phrase: ['main'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
                [{ phrase: ['springfield'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
            ];
            t.deepEqual(results, expected);
            return results;
        }
    });
    c.geocoder_address = true;
    c.complex_query_replacer = token.createComplexReplacer([
        {
            from:'unit [0-9]+',
            to: { text: '', regex: true, spanBoundaries: 1 }
        }
    ]);

    const query = termops.tokenize('100 Main Unit 2 Springfield');
    const clone = JSON.parse(JSON.stringify(query));
    phrasematch(c, query, {}, (err, results, source) => {
        t.error(err);
        t.equal(results.length, 11);
        const expected = new Set([
            '100 main springfield - 31 - 1',
            '1## main springfield - 31 - 1',
            '100 main - 3 - 0.4',
            '100 main - 15 - 0.8',
            '1## main - 3 - 0.4',
            '1## main - 15 - 0.8',
            'main springfield - 30 - 0.8',
            'main - 2 - 0.2',
            'main - 14 - 0.6',
            'springfield - 16 - 0.2',
            'springfield - 28 - 0.6',
        ]);
        results.forEach((v) => {
            const k = `${v.phrase} - ${v.mask} - ${v.weight}`;
            t.ok(expected.has(k), `has "${k}"`);
        });
        t.deepEqual(query, clone, 'replacements did not altery query');
        t.end();
    });
});

tape('fuzzyMatchMulti - masks for removed terms at the end of a query', (t) => {
    const c = fakeCarmen({
        fuzzyMatchMulti: (a, b, c, d) => {
            const results = fakeFuzzyMatches(a);
            const expected = [
                [{ 'phrase':['roma','termini','rs'],'edit_distance':0,'ending_type':0,'phrase_id_range':[0, 0] }],
                [{ 'phrase':['roma','termini'],'edit_distance':0,'ending_type':0,'phrase_id_range':[0, 0] }],
                [{ 'phrase':['termini','rs'],'edit_distance':0,'ending_type':0,'phrase_id_range':[0, 0] }],
                [{ 'phrase':['roma'],'edit_distance':0,'ending_type':0,'phrase_id_range':[0, 0] }],
                [{ 'phrase':['termini'],'edit_distance':0,'ending_type':0,'phrase_id_range':[0, 0] }],
                [{ 'phrase':['rs'],'edit_distance':0,'ending_type':0,'phrase_id_range':[0, 0] }]
            ];
            t.deepEqual(results, expected);
            return results;
        }
    });
    c.geocoder_address = true;
    c.complex_query_replacer = token.createComplexReplacer([
        {
            from:'railway station',
            to: { text: 'rs', spanBoundaries: 1 }
        }
    ]);

    const query = termops.tokenize('Roma Termini Railway Station');
    const clone = JSON.parse(JSON.stringify(query));
    phrasematch(c, query, {}, (err, results, source) => {
        t.error(err);
        t.equal(results.length, 6);
        const expected = new Set([
            'roma termini rs - 15 - 1',
            'roma termini - 3 - 0.5',
            'termini rs - 14 - 0.75',
            'roma - 1 - 0.25',
            'termini - 2 - 0.25',
            'rs - 12 - 0.5'
        ]);
        results.forEach((v) => {
            const k = `${v.phrase} - ${v.mask} - ${v.weight}`;
            t.ok(expected.has(k), `has "${k}"`);
        });
        t.deepEqual(query, clone, 'replacements did not altery query');
        t.end();
    });
});

tape('fuzzyMatchMulti - masks for intersection queries', (t) => {
    const c = fakeCarmen({
        fuzzyMatchMulti: (a, b, c, d) => {
            const results = fakeFuzzyMatches(a);
            const expected = [
                [{ phrase: ['1st', 'and', 'main', 'st'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
                [{ phrase: ['1st', 'and', 'main'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
                [{ phrase: ['st'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
                [{ phrase: ['+intersection', '1st', ',', 'main'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }],
                [{ phrase: ['+intersection', '1st', ',', 'main', 'st'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }]
            ];
            t.deepEqual(results, expected);
            return results;
        }
    });
    c.geocoder_address = true;
    c.geocoder_intersection_token = 'and';
    c.complex_query_replacer = token.createComplexReplacer([
        {
            from: '(.+) & (.+)',
            to: { regex: true, spanBoundaries: 1, text: '$1 and $2' }
        }
    ]);

    const query = termops.tokenize('1st & main st');
    const clone = JSON.parse(JSON.stringify(query));
    phrasematch(c, query, {}, (err, results, source) => {
        t.error(err);
        t.equal(results.length, 8);
        const expected = new Set([
            'st - 4 - 0.3333333333333333',
            'st - 6 - 0.6666666666666666',
            '1st and main - 1 - 0.3333333333333333',
            '1st and main - 3 - 0.6666666666666666',
            '1st and main st - 7 - 1',
            '+intersection 1st , main - 1 - 0.3333333333333333',
            '+intersection 1st , main - 3 - 0.6666666666666666',
            '+intersection 1st , main st - 7 - 1'
        ]);
        results.forEach((v) => {
            const k = `${v.phrase} - ${v.mask} - ${v.weight}`;
            t.ok(expected.has(k), `has "${k}"`);
        });
        t.deepEqual(query, clone, 'replacements did not altery query');
        t.end();
    });
});

tape('stackBounds', (t) => {
    const c = fakeCarmen({
        fuzzyMatchWindows: (a, b, c, d) => {
            return [
                { start_position: 0, phrase: ['query'], edit_distance: 0, ending_type: 0, phrase_id_range: [0, 0] }
            ];
        }
    });
    c.geocoder_stack_bounds = {
        at: [9.530734, 46.372056, 17.158411, 49.020374],
        ch: [5.955907, 45.817981, 10.492063, 47.808454]
    };
    c.geocoder_stack = ['at', 'ch'];

    t.plan(8);
    phrasematch(c, termops.tokenize('query'), { stacks: ['at', 'ch'] }, (err, results, source) => {
        t.deepEquals(results[0].bounds, [5.955907, 45.817981, 17.158411, 49.020374]);
        t.error(err);
    });

    phrasematch(c, termops.tokenize('query'), { stacks: ['at'] }, (err, results, source) => {
        t.deepEquals(results[0].bounds, [9.530734, 46.372056, 17.158411, 49.020374]);
        t.error(err);
    });

    phrasematch(c, termops.tokenize('query'), { stacks: ['ch', 'zz'] }, (err, results, source) => {
        t.deepEquals(results[0].bounds, [5.955907, 45.817981, 10.492063, 47.808454]);
        t.error(err);
    });

    phrasematch(c, termops.tokenize('query'), { stacks: ['aa', 'zz'] }, (err, results, source) => {
        t.deepEquals(results[0].bounds, undefined);
        t.error(err);
    });
});
