// Test geocoder_tokens

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
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
        c.geocode('fake st', { limit_verify: 1 }, function (err, res) {
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
        c.geocode('avenue du 18e régiment', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.99, 'avenue du 18e');
            t.end();
        });
    });
    tape('test address index for relev', function(t) {
        c.geocode('avenue du dix-huitième régiment', { limit_verify: 1 }, function (err, res) {
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
        c.geocode('qabc', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.99, 'token regex numbered group test, qabc => qcba');
            t.end();
        });
    });
})();

tape('index.teardown', function(assert) {
    index.teardown();
    assert.end();
});
