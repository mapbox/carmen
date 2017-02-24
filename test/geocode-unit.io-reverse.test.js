// Unit tests for reverse geocoding IO. Confirms type filters restrict loading
// tiles for excluded indexes.

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// Setup includes the api-mem `timeout` option to simulate asynchronous I/O.
var conf = {
    country: new mem({ maxzoom:6, timeout:10 }, function() {}),
    region: new mem({ maxzoom:6, timeout:10 }, function() {}),
    place: new mem({ maxzoom:6, timeout:10 }, function() {}),
    street: new mem({ maxzoom:6, timeout:10, geocoder_address:1 }, function() {})
};
var c = new Carmen(conf);

tape('ready', function(assert) {
    c._open(assert.end);
});

tape('index country', function(t) {
    queueFeature(conf.country, {
        id:1,
        properties: {
            'carmen:text':'us',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index region', function(t) {
    queueFeature(conf.region, {
        id:1,
        properties: {
            'carmen:text':'ohio',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index place', function(t) {
    queueFeature(conf.place, {
        id:1,
        properties: {
            'carmen:text':'springfield',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index street', function(t) {
    queueFeature(conf.street, {
        id:1,
        properties: {
            'carmen:text':'river rd',
            'carmen:zxy':['6/32/32'],
            'carmen:center': [0,0]
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

function resetLogs() {
    context.getTile.cache.reset();
    conf.country._original.logs.getGeocoderData = [];
    conf.country._original.logs.getTile = [];
    conf.region._original.logs.getGeocoderData = [];
    conf.region._original.logs.getTile = [];
    conf.place._original.logs.getGeocoderData = [];
    conf.place._original.logs.getTile = [];
    conf.street._original.logs.getGeocoderData = [];
    conf.street._original.logs.getTile = [];
}

tape('reverse 0,0', function(t) {
    resetLogs();
    c.geocode('0,0', {}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'river rd, springfield, ohio, us');
        t.deepEqual(c.indexes.country._original.logs.getGeocoderData, ['feature,1'], 'country: loads 1 feature');
        t.deepEqual(c.indexes.country._original.logs.getTile, ['6,32,32'], 'country: loads 1 tile');
        t.deepEqual(c.indexes.region._original.logs.getGeocoderData, ['feature,1'], 'region: loads 1 feature');
        t.deepEqual(c.indexes.region._original.logs.getTile, ['6,32,32'], 'region: loads 1 tile');
        t.deepEqual(c.indexes.place._original.logs.getGeocoderData, ['feature,1'], 'place: loads 1 feature');
        t.deepEqual(c.indexes.place._original.logs.getTile, ['6,32,32'], 'place: loads 1 tile');
        t.deepEqual(c.indexes.street._original.logs.getGeocoderData, ['feature,1'], 'street: loads 1 feature');
        t.deepEqual(c.indexes.street._original.logs.getTile, ['6,32,32'], 'street: loads 1 tile');
        t.end();
    });
});

tape('reverse 0,0, types=region', function(t) {
    resetLogs();
    c.geocode('0,0', { types:['region'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'ohio, us');
        t.deepEqual(c.indexes.country._original.logs.getGeocoderData, ['feature,1'], 'country: loads 1 feature');
        t.deepEqual(c.indexes.country._original.logs.getTile, ['6,32,32'], 'country: loads 1 tile');
        t.deepEqual(c.indexes.region._original.logs.getGeocoderData, ['feature,1'], 'region: loads 1 feature');
        t.deepEqual(c.indexes.region._original.logs.getTile, ['6,32,32'], 'region: loads 1 tile');
        t.deepEqual(c.indexes.place._original.logs.getGeocoderData, [], 'place: no i/o');
        t.deepEqual(c.indexes.place._original.logs.getTile, [], 'place: no i/o');
        t.deepEqual(c.indexes.street._original.logs.getGeocoderData, [], 'street: no i/o');
        t.deepEqual(c.indexes.street._original.logs.getTile, [], 'street: no i/o');
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});