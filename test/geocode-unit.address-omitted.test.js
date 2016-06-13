// Interpolation between range feature gaps.

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    tape('index address', function(t) {
        var address = {
            id:1,
            properties: {
                'carmen:text':'fake street',
                'carmen:center':[0,0],
                'carmen:rangetype':'tiger',
                'carmen:lfromhn': '0',
                'carmen:ltohn': '100',
            },
            geometry: {
                type:'LineString',
                coordinates:[[0,0],[0,100]]
            }
        };
        addFeature(conf.address, address, t.end);
    });
    tape('test address query with address range', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9 fake street', 'found 9 fake street');
            t.equals(res.features[0].relevance, 0.99);
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    tape('tiger, between the lines', function(t) {
        var address = {
            id:1,
            properties: {
                'carmen:text':'fake street',
                'carmen:center':[0,0],
                'carmen:rangetype':'tiger',
                'carmen:lfromhn': ['0','104'],
                'carmen:ltohn': ['100','200'],
            },
            geometry: {
                type:'MultiLineString',
                coordinates:
                    [
                        [
                        [0,0],
                        [0,10]
                        ],
                        [
                        [0,11],
                        [0,20]
                        ],
                    ]
            }
        };
        addFeature(conf.address, address, t.end);
    });

    tape('test tiger interpolation house number', function(t) {
        c.geocode('102 fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '102 fake street', 'found 102 fake street');
            t.equals(res.features[0].relevance, 0.99);
            t.end();
        });
    });
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

