var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

// Test that geocoder returns index names for context
(function() {
    var conf = {
        country: new mem({ maxzoom:6 }, function() {}),
        region: new mem({maxzoom: 6 }, function() {}),
        postcode: new mem({maxzoom: 6 }, function() {}),
        place: new mem({maxzoom: 6 }, function() {}),
        address: new mem({maxzoom: 6 }, function() {})
    };
    var c = new Carmen(conf);
    tape('index country', function(t) {
        var country = {
            id:1,
            properties: {
                'carmen:text': 'united states',
                'carmen:center': [0,0],
                'carmen:zxy':['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        addFeature(conf.country, country, t.end);
    });

    tape('index region', function(t) {
        var region = {
            id:1,
            properties: {
                'carmen:text': 'maine',
                'carmen:center': [0,0],
                'carmen:zxy':['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        addFeature(conf.region, region, t.end);
    });

    tape('index place', function(t) {
        var place = {
            id:1,
            properties: {
                'carmen:text': 'springfield',
                'carmen:center': [0,0],
                'carmen:zxy':['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        addFeature(conf.place, place, t.end);
    });

    tape('index postcode', function(t) {
        var postcode = {
            id:1,
            properties: {
                'carmen:text': '12345',
                'carmen:center': [0,0],
                'carmen:zxy':['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        addFeature(conf.postcode, postcode, t.end);
    });

    tape('index address', function(t) {
        var address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['9','10','7']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[0,0],[0,0]]
            }
        };
        addFeature(conf.address, address, t.end);
    });

    tape('Search for an address & check indexes', function(t) {
        c.geocode('9 fake street', { limit_verify: 1, indexes: true }, function(err, res) {
            t.ifError(err);
            t.deepEquals(res.indexes, [ 'address', 'place', 'postcode', 'region', 'country' ]);
            t.end();
        });
    });
    tape('Search for a point & check indexes', function(t) {
        c.geocode('0,0', { limit_verify: 1, indexes: true }, function(err, res) {
            t.ifError(err);
            t.deepEquals(res.indexes, [ 'address', 'place', 'postcode', 'region', 'country' ]);
            t.end();
        });
    });
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
