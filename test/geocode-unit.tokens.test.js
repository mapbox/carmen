// Test geocoder_tokens

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
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
            _id:1,
            _text:'fake street',
            _zxy:['6/32/32'],
            _center:[0,0],
            _geometry: {
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
            maxzoom: 6,
            geocoder_tokens: {"Lot [0-9]+": ""},
            geocoder_address: 1
        }, function() {})
    };
    var c = new Carmen(conf);
    tape('geocoder token test', function(t) {
        var address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0],
                'carmen:addressnumber': [12]
            },
            geometry: {
                type: "MultiPoint",
                coordinates: [[0,0]]
            }
        };
        addFeature(conf.address, address, t.end);
    });
    tape('test address index for relev', function(t) {
        c.geocode('12 Lot 34 fake street', { limit_verify: 1, debug: 1 }, function(err, res) {
            t.ifError(err, 'no errors');
            t.deepEquals(res.query, ['12', 'fake', 'street'], 'query removed lot');
            t.equals(res.features[0].relevance, 0.99, 'token replacement test, fake st');
            t.equals(res.features[0].place_name, '12 fake street');
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {"East Street": "West Road"}
        }, function() {})
    };
    var c = new Carmen(conf);
    tape('geocoder token test', function(t) {
        var address = {
            _id:1,
            _text:'East Street',
            _zxy:['6/32/32'],
            _center:[0,0],
            _geometry: {
                type: "Point",
                coordinates: [0,0]
            }
        };
        addFeature(conf.address, address, t.end);
    });
    tape('test address index for relev', function(t) {
        c.geocode('West Road', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.deepEquals(res.query,  ['west', 'road']);
            t.equals(res.features[0].place_name, 'East Street');
            t.equals(res.features[0].relevance, 0.99, 'token replacement test, west road');
            t.end();
        });
    });
    tape('test address index for relev', function(t) {
        c.geocode('East Street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.deepEquals(res.query,  ['west', 'road']);
            t.equals(res.features[0].place_name, 'East Street');
            t.equals(res.features[0].relevance, 0.99, 'token replacement test, east street');
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {"dix-huitième": "18e"}
        }, function() {})
    };
    var c = new Carmen(conf);
    tape('geocoder token test', function(t) {
        var address = {
            _id:1,
            _text:'avenue du 18e régiment',
            _zxy:['6/32/32'],
            _center:[0,0],
            _geometry: {
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
            _id:1,
            _text:'cba',
            _zxy:['6/32/32'],
            _center:[0,0],
            _geometry: {
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

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});
