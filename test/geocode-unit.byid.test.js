// byId debug geocoding queries

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var conf = {
    country: new mem(null, function() {}),
    place: new mem(null, function() {})
};
var c = new Carmen(conf);

tape('index country', function(t) {
    queueFeature(conf.country, {
        id:1,
        properties: {
            'carmen:text': 'china',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0,0]
        }
    }, t.end);
});

tape('index place', function(t) {
    queueFeature(conf.place, {
        id:1,
        properties: {
            'carmen:text':'chicago',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('build queued features', function(t) {
    var q = queue();
    Object.keys(conf).forEach(function(c) {
        q.defer(function(cb) {
            buildQueued(conf[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('query byid', function(t) {
    c.geocode('country.1', {}, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.equals(res.features[0].place_name, 'china', 'found by id');
        t.equals(res.features[0].id, 'country.1', 'found by id');
        t.end();
    });
});

tape('query byid', function(t) {
    c.geocode('place.1', {}, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.equals(res.features[0].place_name, 'chicago', 'found by id');
        t.equals(res.features[0].id, 'place.1', 'found by id');
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});