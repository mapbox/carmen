var termops = require('../lib/util/termops');
var test = require('tape');

test('tokenizes Japanese strings containing CJK characters', function(assert) {
    assert.deepEqual(termops.segmentWords('岐阜県中津川市馬籠'), ['岐阜県', '中津', '川市', '馬', '籠']);
    assert.end();
});

test('edge case - empty string', function(assert) {
    assert.deepEqual(termops.segmentWords(''), []);
    assert.end();
});

test('edge case - short strings', function(assert) {
    assert.deepEqual(termops.segmentWords('馬'), ['馬']);
    assert.deepEqual(termops.segmentWords('馬籠'), ['馬', '籠']);
    assert.end();
});
