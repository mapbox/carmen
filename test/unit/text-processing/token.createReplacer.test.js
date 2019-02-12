'use strict';
const token = require('../../../lib/text-processing/token.js');
const termops = require('../../../lib/text-processing/termops.js');
const test = require('tape');

// From https://stackoverflow.com/a/10776635
function regexEqual(x, y) {
    return (x instanceof RegExp) && (y instanceof RegExp) &&
       (x.source === y.source) && (x.global === y.global) &&
       (x.ignoreCase === y.ignoreCase) && (x.multiline === y.multiline);
}

test('createReplacer: simple token replacements', (t) => {
    const replacer = token.createSimpleReplacer({
        'Street': 'St',
        'Road': 'Rd',
        'Maréchal': 'Mal'
    });

    t.ok(replacer.tokens instanceof Map);
    t.equal(typeof replacer.replacer, 'function');

    t.deepEqual(replacer.replacer(['Fake', 'Street']), ['Fake', 'Street'], 'Requires input be lowercase');
    t.deepEqual(replacer.replacer(['fake', 'street']), ['fake', 'st'], 'fake street => fake St');
    t.end();
});

test('createReplacer: includeUnambiguous', (t) => {
    const replacer = token.createComplexReplacer({
        'Street': 'St'
    }, { includeUnambiguous: true });

    const expected =  [{
        from: new RegExp('Street$', 'iuy'),
        fromLastWord: false,
        to: 'St',
        inverse: false,
        spanBoundaries: 0,
        _from: 'Street'
    }, {
        from: new RegExp('St$', 'iuy'),
        fromLastWord: false,
        to: 'Street',
        inverse: true,
        spanBoundaries: 0,
        _from: 'St'
    }];

    for (const i in replacer) {
        t.ok(regexEqual(replacer[i].from, expected[i].from), 'from regexps match');
        if (replacer[i].fromLastWord) {
            t.ok(regexEqual(replacer[i].fromLastWord, expected[i].fromLastWord), 'fromLastWord regexps match');
        } else t.equal(replacer[i].fromLastWord, expected[i].fromLastWord, 'fromLastWord is false');
    }
    t.deepEqual(replacer, expected, 'created a regex');
    t.end();
});

test('createReplacer: substring complex token replacement + diacritics', (t) => {
    const replacer = token.createComplexReplacer({
        'ä': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ae' },
        'ö': { skipBoundaries: true, skipDiacriticStripping: true, text: 'oe' },
        'ü': { skipBoundaries: true, skipDiacriticStripping: true, text: 'ue' }
    }, { includeUnambiguous: true });
    const expected = [
        { from: /ä/giu, fromLastWord: false, to: 'ae', inverse: false, _from: 'ä' },
        { from: /ö/giu, fromLastWord: false, to: 'oe', inverse: false, _from: 'ö' },
        { from: /ü/giu, fromLastWord: false, to: 'ue', inverse: false, _from: 'ü' },
        { from: /ae/giu, fromLastWord: false, to: 'ä', inverse: true, _from: 'ae' },
        { from: /oe/giu, fromLastWord: false, to: 'ö', inverse: true, _from: 'oe' },
        { from: /ue/giu, fromLastWord: false, to: 'ü', inverse: true, _from: 'ue' }
    ];
    for (const i in replacer) {
        t.ok(regexEqual(replacer[i].from, expected[i].from), 'from regexps match');
        if (replacer[i].fromLastWord) {
            t.ok(regexEqual(replacer[i].fromLastWord, expected[i].fromLastWord), 'fromLastWord regexps match');
        } else t.equal(replacer[i].fromLastWord, expected[i].fromLastWord, 'fromLastWord is false');
    }
    t.deepEqual(replacer, expected, 'created a regex');
    t.end();
});

test('createReplacer: subword complex token replacement', (t) => {
    const replacer = token.createComplexReplacer({
        '([a-z]+)gatan': '$1g'
    });
    const expected = [{
        from: new RegExp('([a-z]+)gatan$', 'iuy'),
        fromLastWord: false,
        to: '$1g',
        inverse: false,
        spanBoundaries: 0,
        _from: '([a-z]+)gatan'
    }];
    for (const i in replacer) {
        t.ok(regexEqual(replacer[i].from, expected[i].from), 'from regexps match');
        if (replacer[i].fromLastWord) {
            t.ok(regexEqual(replacer[i].fromLastWord, expected[i].fromLastWord), 'fromLastWord regexps match');
        } else t.equal(replacer[i].fromLastWord, expected[i].fromLastWord, 'fromLastWord is false');
    }

    t.deepEqual(replacer, expected, 'created a regex');
    t.deepEqual(
        token.replaceToken(replacer, termops.tokenize('Mäster Samuelsgatan')),
        {
            tokens: ['mäster', 'samuelsg'],
            separators: [' ', ''],
            owner: [0, 1],
            lastWord: true
        }, 'Mäster Samuelsgatan => mäster samuelsg');
    t.end();
});

test('createReplacer: subword complex token replacement + diacritics', (t) => {
    const replacer = token.createComplexReplacer({
        '([a-z]+)vägen': {
            'text': '$1v'
        }
    });
    const expected = [{
        from: new RegExp('([a-z]+)vägen$', 'iuy'),
        fromLastWord: false,
        to: '$1v',
        inverse: false,
        spanBoundaries: 0,
        _from: '([a-z]+)vägen'
    }, {
        from: new RegExp('([a-z]+)vagen$', 'iuy'),
        fromLastWord: false,
        to: '$1v',
        inverse: false,
        spanBoundaries: 0,
        _from: '([a-z]+)vagen'
    }];

    for (const i in replacer) {
        t.ok(regexEqual(replacer[i].from, expected[i].from), 'from regexps match');
        if (replacer[i].fromLastWord) {
            t.ok(regexEqual(replacer[i].fromLastWord, expected[i].fromLastWord), 'fromLastWord regexps match');
        } else t.equal(replacer[i].fromLastWord, expected[i].fromLastWord, 'fromLastWord is false');
    }
    t.deepEqual(replacer, expected, 'created a regex');
    t.deepEqual(
        token.replaceToken(replacer, termops.tokenize('Samuelsvägen')),
        {
            tokens: ['samuelsv'],
            separators: [''],
            owner: [0],
            lastWord: true
        },
        'Samuelsvägen => samuelsv'
    );
    t.deepEqual(
        token.replaceToken(replacer, termops.tokenize('Samuelsvagen')),
        {
            tokens: ['samuelsv'],
            separators: [''],
            owner: [0],
            lastWord: true
        },
        'Samuelsvagen => samuelsv'
    );
    t.end();
});
