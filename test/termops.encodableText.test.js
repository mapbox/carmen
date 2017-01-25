var termops = require('../lib/util/termops');
var test = require('tape');

test('termops.encodableText', function(assert) {
    assert.deepEqual(termops.encodableText('New York'), 'xnew york', 'encodes latin range');
    assert.deepEqual(termops.encodableText('京都市'), 'zjing du shi', 'encodes CJK range');
    assert.deepEqual(termops.encodableText(decodeURIComponent('%E2%98%BA')) === '', true, 'encodes an emoji to an actually empty string');
    assert.deepEqual(termops.encodableText(decodeURIComponent('%E2%98%BA %E2%98%BA')) === '', true, 'encodes an emoji phrase to an actually empty string');
    assert.end();
});
