// Test that a feature at a tile's edge can be found.

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var conf = {
    test: new mem({maxzoom:14}, function() {})
};
var c = new Carmen(conf);

tape('index test', function(t) {
    var feature = {
        id:1,
        properties: {
            'carmen:text':'test',
            'carmen:zxy':['14/8093/5301'],
            'carmen:center':[-2.17405858745506,53.4619151830114]
        }
    };
    queueFeature(conf.test, feature, function() { buildQueued(conf.test, t.end) });
});

tape('forward between tiles', function(t) {
    c.geocode('test', { limit_verify: 1, }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'test', 'found feature');
        t.equals(res.features[0].id, 'test.1', 'found feature');
        t.equals(res.features[0].relevance, 0.99);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

