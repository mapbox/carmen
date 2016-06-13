// Test geocoder_tokens

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {"Street": "St"}
        }, function() {})
    };
    var c = new Carmen(conf);
    tape('geocoder token test', function(t) {
        var address = {
            id:1,
            properties: {
                'carmen:text':'fake street',
                'carmen:center':[0,0],
            },
            geometry: {
                type: "Point",
                coordinates: [0,0]
            }
        };
        addFeature(conf.address, address, t.end);
    });
    tape('test address index for relev', function(t) {
        c.geocode('fake st', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.99, 'token replacement test, fake st');
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({
            maxzoom: 6
        }, function() {})
    };
    var opts = {
        tokens: {"dix-huitième": "18e"}
    };
    var c = new Carmen(conf, opts);
    tape('geocoder token test', function(t) {
        var address = {
            id:1,
            properties: {
                'carmen:text':'avenue du 18e régiment',
                'carmen:center':[0,0],
            },
            geometry: {
                type: "Point",
                coordinates: [0,0]
            }
        };
        addFeature(conf.address, address, t.end);
    });
    tape('test address index for relev', function(t) {
        c.geocode('avenue du 18e régiment', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.99, 'avenue du 18e');
            t.end();
        });
    });
    tape('test address index for relev', function(t) {
        c.geocode('avenue du dix-huitième régiment', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.99, 'avenue du dix-huitième régiment');
            t.end();
        });
    });
})();

// RegExp captures have been put on hiatus per https://github.com/mapbox/carmen/pull/283.
(function() {
    var conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {'q([a-z])([a-z])([a-z])': "$3$2$1"}
        }, function() {})
    };
    var c = new Carmen(conf);
    tape('geocoder token test', function(t) {
        var address = {
            id:1,
            properties: {
                'carmen:text':'cba',
                'carmen:center':[0,0],
            },
            geometry: {
                type: "Point",
                coordinates: [0,0]
            }
        };
        addFeature(conf.address, address, t.end);
    });
    tape('test token replacement', function(t) {
        c.geocode('qabc', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.99, 'token regex numbered group test, qabc => qcba');
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {
                "Road": "Rd",
                "Street": "St"
            }
        }, function() {})
    };
    var opts = {
        tokens: {
            'Suite [0-9]+': '',
            'Lot [0-9]+': ''
        }
    }
    var c = new Carmen(conf, opts);
    addFeature.setOptions(opts);
    tape('geocoder token test', function(t) {
        var address = {
            id:1,
            properties: {
                'carmen:text':'fake street',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0],
            },
            geometry: {
                type: "Point",
                coordinates: [0,0]
            }
        };
        addFeature(conf.address, address, t.end);
    });
    tape('geocoder token test', function(t) {
        var address = {
            id:2,
            properties: {
                'carmen:text':'main road lot 42 suite 432',
                'carmen:center':[0,0],
            },
            geometry: {
                type: "Point",
                coordinates: [0,0]
            }
        };
        addFeature(conf.address, address, t.end);
    });
    tape('test address index for relev', function(t) {
        c.geocode('fake st lot 34 Suite 43', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.deepEquals(res.query, ['fake', 'st'], 'global tokens removed');
            t.equals(res.features[0].place_name, 'fake street');
            t.end();
        });
    });
    tape('test address index for relev', function(t) {
        c.geocode('main road lot 34 Suite 43', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.deepEquals(res.query, ['main', 'road'], 'global tokens removed');
            t.equals(res.features[0].place_name, 'main road lot 42 suite 432');
            t.end();
        });
    });
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
