var termops = require('../lib/util/termops');
var test = require('tape');

test('termops.getIndexablePhrases', function(assert) {
    var tokens;
    var freq;

    tokens = ['main', 'st'];
    tokens.indexDegens = true;
    freq = {};
    freq[0] = [101];
    freq[termops.encodeTerm(tokens[0])] = [1];
    freq[termops.encodeTerm(tokens[1])] = [100];

    assert.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        {
            "degen": true,
            "relev": 1,
            "text": "xm",
            "phrase": termops.encodePhrase('m', true),
        },
        {
            "degen": true,
            "relev": 1,
            "text": "xma",
            "phrase": termops.encodePhrase('ma', true),
        },
        {
            "degen": true,
            "relev": 1,
            "text": "xmai",
            "phrase": termops.encodePhrase('mai', true),
        },
        {
            "degen": true,
            "relev": 1,
            "text": "xmain",
            "phrase": termops.encodePhrase('main', true),
        },
        {
            "degen": true,
            "relev": 1,
            "text": "xmain s",
            "phrase": termops.encodePhrase('main s', true),
        },
        {
            "degen": true,
            "relev": 1,
            "text": "xmain st",
            "phrase": termops.encodePhrase('main st', true),
        },
        {
            "degen": false,
            "relev": 1,
            "text": "xmain st",
            "phrase": termops.encodePhrase('main st', false),
        },
        {
            "degen": false,
            "relev": 0.8,
            "text": "xmain",
            "phrase": termops.encodePhrase('main', false),
        }
    ]);

    assert.end();
});


test('termops.getIndexablePhrases (weight sieve)', function(assert) {
    var tokens;
    var freq;

    tokens = ['jose', 'de', 'la', 'casa'];
    tokens.indexDegens = true;
    freq = {};
    freq[0] = [202];
    freq[termops.encodeTerm(tokens[0])] = [1];
    freq[termops.encodeTerm(tokens[1])] = [100];
    freq[termops.encodeTerm(tokens[2])] = [100];
    freq[termops.encodeTerm(tokens[3])] = [1];

    assert.deepEqual(termops.getIndexablePhrases(tokens, freq).map(function(p) {
        return (p.relev) + '-' + (p.degen ? 1 : 0) + '-' + p.text;
    }), [
        '1-1-xj',
        '1-1-xjo',
        '1-1-xjos',
        '1-1-xjose',
        '1-1-xjose d',
        '1-1-xjose de',
        '1-1-xjose de l',
        '1-1-xjose de la',
        '1-1-xjose de la c',
        '1-1-xjose de la ca',
        '1-1-xjose de la cas',
        '1-1-xjose de la casa',
        '1-0-xjose de la casa',
        '1-1-xjose de c',
        '1-1-xjose de ca',
        '1-1-xjose de cas',
        '1-1-xjose de casa',
        '1-0-xjose de casa',
        '1-1-xjose l',
        '1-1-xjose la',
        '1-1-xjose la c',
        '1-1-xjose la ca',
        '1-1-xjose la cas',
        '1-1-xjose la casa',
        '1-0-xjose la casa',
        '0.8-1-xjose c',
        '0.8-1-xjose ca',
        '0.8-1-xjose cas',
        '0.8-1-xjose casa',
        '0.8-0-xjose casa'
    ]);

    assert.end();
});

test('termops.getIndexablePhrases (京都市)', function(assert) {
    var tokens;
    var freq;

    tokens = ['京都市'];
    tokens.indexDegens = true;
    freq = {};
    freq[0] = [1];
    freq[termops.encodeTerm(tokens[0])] = [1];

    assert.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        { degen: true, phrase: termops.encodePhrase('京', true), relev: 1, text: 'zjing' },
        { degen: true, phrase: termops.encodePhrase('京都', true), relev: 1, text: 'zjing du' },
        { degen: true, phrase: termops.encodePhrase('京都市', true), relev: 1, text: 'zjing du shi' },
        { degen: false, phrase: termops.encodePhrase('京都市', false), relev: 1, text: 'zjing du shi' }
    ]);

    assert.end();
});

test('termops.getIndexablePhrases (москва)', function(assert) {
    var tokens;
    var freq;

    tokens = ['москва'];
    tokens.indexDegens = true;
    freq = {};
    freq[0] = [1];
    freq[termops.encodeTerm(tokens[0])] = [1];

    assert.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        { degen: true, phrase: termops.encodePhrase('м', true), relev: 1, text: 'xm' },
        { degen: true, phrase: termops.encodePhrase('мо', true), relev: 1, text: 'xmo' },
        { degen: true, phrase: termops.encodePhrase('мос', true), relev: 1, text: 'xmos' },
        { degen: true, phrase: termops.encodePhrase('моск', true), relev: 1, text: 'xmosk' },
        { degen: true, phrase: termops.encodePhrase('москв', true), relev: 1, text: 'xmoskv' },
        { degen: true, phrase: termops.encodePhrase('москва', true), relev: 1, text: 'xmoskva' },
        { degen: false, phrase: termops.encodePhrase('москва', false), relev: 1, text: 'xmoskva' }
    ]);

    assert.end();
});

test('termops.getIndexablePhrases (josé)', function(assert) {
    var tokens;
    var freq;

    tokens = ['josé'];
    tokens.indexDegens = true;
    freq = {};
    freq[0] = [1];
    freq[termops.encodeTerm(tokens[0])] = [1];

    assert.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        { degen: true, phrase: termops.encodePhrase('j',true), relev: 1, text: 'xj' },
        { degen: true, phrase: termops.encodePhrase('jo',true), relev: 1, text: 'xjo' },
        { degen: true, phrase: termops.encodePhrase('jos',true), relev: 1, text: 'xjos' },
        { degen: true, phrase: termops.encodePhrase('josé',true), relev: 1, text: 'xjose' },
        { degen: false, phrase: termops.encodePhrase('josé',false), relev: 1, text: 'xjose' }
    ]);

    assert.end();
});

test('termops.getIndexablePhrases (josé, no degens)', function(assert) {
    var tokens;
    var freq;

    tokens = ['josé'];
    tokens.indexDegens = false;
    freq = {};
    freq[0] = [1];
    freq[termops.encodeTerm(tokens[0])] = [1];

    assert.deepEqual(termops.getIndexablePhrases(tokens, freq), [
        { degen: true, phrase: termops.encodePhrase('josé',true), relev: 1, text: 'xjose' },
        { degen: false, phrase: termops.encodePhrase('josé',false), relev: 1, text: 'xjose' }
    ]);

    assert.end();
});
