// Test geocoder_name overlapping feature context prioritization

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    place_a: new mem({maxzoom:6, geocoder_name:'place'}, function() {}),
    place_b: new mem({maxzoom:6, geocoder_name:'place'}, function() {}),
    street_a: new mem({maxzoom:6, geocoder_name:'street'}, function() {}),
    street_b: new mem({maxzoom:6, geocoder_name:'street'}, function() {})
};
var c = new Carmen(conf);
tape('index place_a', function(t) {
    addFeature(conf.place_a, {
        id:1,
        properties: {
            'carmen:text': 'sadtown',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0,0]
        }
    }, t.end);
});
tape('index place_b', function(t) {
    addFeature(conf.place_b, {
        id:2,
        properties: {
            'carmen:text':'funtown',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index street_a', function(t) {
    addFeature(conf.street_a, {
        id:2,
        properties: {
            'carmen:text':'wall street',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index street_b', function(t) {
    addFeature(conf.street_b, {
        id:1,
        properties: {
            'carmen:text':'main street',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('geocoder_name dedupe', function(t) {
    c.geocode('main street', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'main street, funtown');
        t.deepEqual(res.features[0].id, 'street.1');
        t.deepEqual(res.features[0].context.length, 1);
        t.deepEqual(res.features[0].context.map(function(c) { return c.text }), ['funtown']);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

