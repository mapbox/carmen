'use strict';
const termops = require('../../../lib/text-processing/termops');
const test = require('tape');

test('termops.getIndexablePhrases', (t) => {
    const tokens = ['main', 'st'];
    const freq = {};
    freq['__COUNT__'] = [101];
    freq[tokens[0]] = [1];
    freq[tokens[1]] = [100];

    t.deepEqual(termops.getIndexablePhrases({ hash: 0, tokens } , freq), [
        {
            'relev': 1,
            'phrase': 'main st',
            'hash': 0
        },
        {
            'relev': 0.8,
            'phrase': 'main',
            'hash': 0
        }
    ]);
    t.end();
});

test('termops.getIndexablePhrases', (t) => {
    const tokens =
        {
            tokens: ['4', 'st', 'nw'],
            languages: ['default'],
            reduceRelevance: true
        };

    const freq = {};
    freq['__COUNT__'] = [101];
    freq[tokens.tokens[0]] = [1];
    freq[tokens.tokens[1]] = [1];
    freq[tokens.tokens[2]] = [1];

    t.deepEqual(termops.getIndexablePhrases(tokens , freq), [{ relev: 0.8, text: '4 st nw', phrase: '4 st nw' }]);
    t.end();
});

test('termops.getIndexablePhrases - frequentWords', (t) => {
    const tokens = ['main', 'st', 'nw'];
    const frequentWords = new Set(['st', 'nw']);
    const freq = {};
    freq['__COUNT__'] = [10];

    t.deepEqual(termops.getIndexablePhrases({ hash: 0, tokens } , freq, frequentWords), [
        {
            'relev': 1,
            'phrase': 'main st nw',
            'hash': 0
        },
        {
            'relev': 0.8,
            'phrase': 'main st',
            'hash': 0
        },
        {
            'relev': 0.8,
            'phrase': 'main nw',
            'hash': 0
        }
    ]);

    t.end();
});

test('termops.getIndexablePhrases (weight sieve)', (t) => {
    const tokens = ['jose', 'de', 'la', 'casa'];
    const freq = {};
    freq['__COUNT__'] = [202];
    freq[tokens[0]] = [1];
    freq[tokens[1]] = [100];
    freq[tokens[2]] = [100];
    freq[tokens[3]] = [1];

    t.deepEqual(termops.getIndexablePhrases({ hash: 0, tokens }, freq).map((p) => {
        return (p.relev) + '-1-' + p.phrase;
    }), [
        '1-1-jose de la casa',
        '1-1-jose de casa',
        '1-1-jose la casa',
        '0.8-1-jose casa'
    ]);

    t.end();
});

test('termops.getIndexablePhrases (京都市)', (t) => {
    const tokens = ['京都市'];
    const freq = {};
    freq['__COUNT__'] = [1];
    freq[tokens[0]] = [1];

    t.deepEqual(termops.getIndexablePhrases({ hash: 0, tokens }, freq), [
        { hash: 0, phrase: '京都市', relev: 1 }
    ]);

    t.end();
});

test('termops.getIndexablePhrases (москва)', (t) => {
    const tokens = ['москва'];
    const freq = {};
    freq['__COUNT__'] = [1];
    freq[tokens[0]] = [1];

    t.deepEqual(termops.getIndexablePhrases({ hash: 0, tokens }, freq), [
        { hash: 0, phrase: 'москва', relev: 1 }
    ]);

    t.end();
});

test('termops.getIndexablePhrases (josé)', (t) => {
    const tokens = ['josé'];
    const freq = {};
    freq['__COUNT__'] = [1];
    freq[tokens[0]] = [1];

    t.deepEqual(termops.getIndexablePhrases({ hash: 0, tokens }, freq), [
        { hash: 0, phrase: 'jose', relev: 1 }
    ]);

    t.end();
});

// TODO is this text just a duplicate?
test('termops.getIndexablePhrases (josé, no degens)', (t) => {
    const tokens = ['josé'];
    const freq = {};
    freq['__COUNT__'] = [1];
    freq[tokens[0]] = [1];

    t.deepEqual(termops.getIndexablePhrases({ hash: 0, tokens }, freq), [
        { hash: 0, phrase: 'jose', relev: 1 }
    ]);

    t.end();
});
