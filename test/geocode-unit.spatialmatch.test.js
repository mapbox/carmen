// spatialmatch test to ensure the highest relev for a stacked zxy cell
// is used, disallowing a lower scoring cell from overwriting a previous
// entry.

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var conf = {
    place: new mem({maxzoom: 6}, function() {}),
    address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
};
var c = new Carmen(conf);
tape('index place', function(t) {
    var feature = {
        id:1,
        properties: {
            'carmen:text':'fakecity',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
        }
    };
    queueFeature(conf.place, feature, t.end);
});
tape('index matching address', function(t) {
    var feature = {
        id:2,
        properties: {
            'carmen:text':'fake street',
            'carmen:zxy':['6/32/32','6/32/33'],
            'carmen:center':[0,0],
            'carmen:addressnumber': ['1']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    };
    queueFeature(conf.address, feature, t.end);
});
tape('index other address', function(t) {
    var feature = {
        id:3,
        properties: {
            'carmen:text':'fake street',
            'carmen:zxy':['6/32/32'],
            'carmen:center': [0,0],
            'carmen:addressnumber': ['2']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    };
    queueFeature(conf.address, feature, t.end);
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
tape('test spatialmatch relev', function(t) {
    c.geocode('1 fake street fakecity', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.equals(res.features[0].relevance, 1);
        t.equals(res.features[0].id, 'address.2');
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

