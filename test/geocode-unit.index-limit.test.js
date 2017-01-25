// Test that up to 128 indexes are supported.

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {};
for (var i = 0; i < 127; i++) {
    conf['country' + i] = new mem({maxzoom: 6, geocoder_name:'country'}, function() {});
}
conf['place'] = new mem({maxzoom: 6, geocoder_name:'place'}, function() {});

var c = new Carmen(conf);
tape('index place', function(assert) {
    assert.deepEqual(Object.keys(conf).length, 128, '128 indexes configured');
    addFeature(conf.place, {
        id:1,
        properties: {
            'carmen:text':'Chicago',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, assert.end);
});
tape('query place', function(t) {
    c.geocode('Chicago', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'Chicago', 'found Chicago');
        t.equals(res.features[0].relevance, 0.99);
        t.end();
    });
});
tape('reverse place', function(t) {
    c.geocode('0,0', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'Chicago', 'found Chicago');
        t.equals(res.features[0].relevance, 1);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

