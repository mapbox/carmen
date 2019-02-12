'use strict';
const termops = require('../../../lib/text-processing/termops');
const test = require('tape');

test('termops.encodableText', (t) => {
    let r;

    r = termops.encodableText(termops.tokenize('New York'));
    t.deepEqual(r.normalized, ['new', 'york'], 'encodes latin range');

    r = termops.encodableText(termops.tokenize('Ciudad Juárez'));
    t.deepEqual(r.normalized, ['ciudad', 'juarez'], 'encodes latin range w/ accents');

    r = termops.encodableText(termops.tokenize('京都市'));
    t.deepEqual(r.normalized, ['京', '都', '市'], 'encodes CJK range');

    // TODO is this an untracked cardinality change?
    r = termops.encodableText(termops.tokenize(decodeURIComponent('%E2%98%BA')));
    t.deepEqual(r.normalized, [], 'encodes an emoji to an actually empty string');

    // TODO is this an untracked cardinality change?
    r = termops.encodableText(termops.tokenize(decodeURIComponent('%E2%98%BA %E2%98%BA')));
    t.deepEqual(r.normalized, [], 'encodes an emoji to an actually empty string');
    t.end();
});
