// byId debug geocoding queries

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

var conf = {
    us: new mem({
        maxzoom: 6,
        geocoder_name: 'country',
        geocoder_stack: 'us'
    }, function() {}),
    ca: new mem({
        maxzoom: 6,
        geocoder_name: 'country',
        geocoder_stack: 'ca'
    }, function() {})
};
var c = new Carmen(conf);

tape('index country ca', function(t) {
    addFeature(conf.ca, {
        id:1,
        properties: {
            'carmen:text':'Canada',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});

tape('index country us', function(t) {
    addFeature(conf.us, {
        id:1,
        properties: {
            'carmen:text': 'United States',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0,0]
        }
    }, t.end);
});

tape('query filter', function(t) {
    c.geocode('0,0', { stack: 'ca' }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'Canada');
        t.end();
    });
});

tape('query filter', function(t) {
    c.geocode('United States', { stack: 'ca' }, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 0);
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});

