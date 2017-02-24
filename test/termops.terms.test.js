var termops = require('../lib/util/termops');
var test = require('tape');

test('terms - tokenizes and hashes values', function(assert) {
    assert.deepEqual(termops.terms(['foo','bar']), [ 'foo', 'bar' ]);
    assert.end();
});

