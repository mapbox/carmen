var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var conf = {
    address: new mem({maxzoom: 6, geocoder_address: 1, geocoder_name:'address'}, function() {})
};
var c = new Carmen(conf);

tape('index address (noise)', function(t) {
    var q = queue(1);
    for (var i = 1; i < 41; i++) q.defer(function(i, done) {
        var address = {
            id:i,
            properties: {
                'carmen:text':'fake street',
                'carmen:center':[0,0],
                'carmen:addressnumber': ['600']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        };
        queueFeature(conf.address, address, done);
    }, i);
    q.awaitAll(t.end);
});

tape('index address (signal)', function(t) {
    var address = {
        id:101,
        properties: {
            'carmen:text':'fake street',
            'carmen:center':[0,0],
            'carmen:addressnumber': ['1500']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    };
    queueFeature(conf.address, address, t.end);
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

tape('test address', function(t) {
    c.geocode('1500 fake street', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, '1500 fake street', 'found 1500 fake street');
        t.equals(res.features[0].relevance, 0.99);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});