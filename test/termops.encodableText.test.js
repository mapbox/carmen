const termops = require('../lib/util/termops');
const test = require('tape');

test('termops.encodableText', t => {
    t.deepEqual(
        termops.encodableText('New York'),
        'new york',
        'encodes latin range'
    );
    t.deepEqual(termops.encodableText('京都市'), '京都市', 'encodes CJK range');
    t.deepEqual(
        termops.encodableText(decodeURIComponent('%E2%98%BA')) === '',
        true,
        'encodes an emoji to an actually empty string'
    );
    t.deepEqual(
        termops.encodableText(decodeURIComponent('%E2%98%BA %E2%98%BA')) === '',
        true,
        'encodes an emoji phrase to an actually empty string'
    );
    t.end();
});
