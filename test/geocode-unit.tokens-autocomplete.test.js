// Ensures that token replacement casts a wide (unidecoded) net for
// left-hand side of token mapping.

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

var conf = {
    test: new mem({
        geocoder_tokens: {
            'Street' : 'St'
        },
        maxzoom:6
    }, function() {})
};
var c = new Carmen(conf);
tape('index Main Street', function(t) {
    addFeature(conf.test, {
        id:1,
        properties: {
            'carmen:text':'Main Street',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('Main St => Main Street', function(t) {
    c.geocode('Main St', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, 'Main Street');
        t.end();
    });
});
tape('Main Street => Main Street', function(t) {
    c.geocode('Main Street', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, 'Main Street');
        t.end();
    });
});
tape('Main Stree => Main Street', function(t) {
    c.geocode('Main Stree', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, 'Main Street');
        t.end();
    });
});
tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});

