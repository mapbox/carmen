//Test bitmask based address determination (See lib/verifymatch)

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
tape('index address', function(t) {
    var address = {
        id:1,
        properties: {
            'carmen:text': '1 test street',
            'carmen:center': [0,0],
            'carmen:addressnumber': ['100']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    };
    queueFeature(conf.address, address, t.end);
});
tape('index address', function(t) {
    var address = {
        id:2,
        properties: {
            'carmen:text': 'baker street',
            'carmen:center': [0,0],
            'carmen:addressnumber': ['500', '500b']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0], [0,0]]
        }
    };
    queueFeature(conf.address, address, t.end);
});
tape('index address', function(t) {
    var address = {
        id:3,
        properties: {
            'carmen:text': '15th street',
            'carmen:center': [0,0],
            'carmen:addressnumber': ['500', '500b']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0],[0,0]]
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

tape('full address', function(t) {
    c.geocode('500 baker street', { limit_verify: 2 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].address, '500', '500');
        t.end();
    });
});

tape('no address', function(t) {
    c.geocode('baker street', { limit_verify: 2 }, function(err, res) {
        t.ifError(err);
        t.notok(res.features[0].address);
        t.end();
    });
});

tape('only number', function(t) {
    c.geocode('500', { limit_verify: 2 }, function(err, res) {
        t.ifError(err);
        t.notok(res.features.length);
        t.end();
    });
});

tape('lettered address', function(t) {
    c.geocode('500b baker street', { limit_verify: 2 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].address, '500b');
        t.end();
    });
});

tape('lettered address', function(t) {
    c.geocode('baker street 500b', { limit_verify: 2 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].address, '500b');
        t.end();
    });
});

tape('numbered street address', function(t) {
    c.geocode('15th street 500b', { limit_verify: 2 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].address, '500b');
        t.end();
    });
});
tape('numbered street address', function(t) {
    c.geocode('15th street 500b', { limit_verify: 2 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].address, '500b');
        t.end();
    });
});

// @TODO maskAddress needs to select multiple candidate addresses now...
tape.skip('test de - number street with address', function(t) {
    c.geocode('1 test street 100', { limit_verify: 2 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, '100 1 test street', '100 1 test street');
        t.equals(res.features[0].address, '100');
        t.end();
    });
});

tape('test us number street with address', function(t) {
    c.geocode('100 1 test street', { limit_verify: 2 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, '100 1 test street', '100 1 test street');
        t.equals(res.features[0].address, '100');
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});