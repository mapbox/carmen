var fnv1a = require('../lib/util/termops').fnv1a;
var test = require('tape');

test('termops.fnv1a', function(t) {
    t.deepEqual(fnv1a('foo'), 2851307223);
    t.deepEqual(fnv1a('foo bar'), 1170285226);
    t.deepEqual(fnv1a('foo').toString(2), '10101001111100110111111011010111');
    t.deepEqual(fnv1a(''), 2166136261);
    t.end();
});
