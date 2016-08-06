var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

var conf = {
    address: new mem({maxzoom: 6, geocoder_address: 1, geocoder_name:'address'}, function() {})
};
var c = new Carmen(conf);

tape('index featurecollection address', function(t) {
    var address = {
        type: "FeatureCollection",
        features: [{
            id: 1,
            type: "Feature",
            properties: {
                'carmen:text':'17th st',
                'carmen:center': [0,0],
                'carmen:rangetype': 'tiger',
                'carmen:parityl': 'E',
                'carmen:parityr': 'O',
                'carmen:rfromhn': 99,
                'carmen:rtohn': 101,
                'carmen:lfromhn': 98,
                'carmen:ltohn': 102
            },
            geometry: {
                type: 'LineString',
                coordinates: [[0,0], [1,1]]
            }
        },{
            id: 2,
            type: "Feature",
            properties: {
                'carmen:text':'17th st',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['100']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0]]
            }
        }]
    };
    addFeature(conf.address, address, t.end);
});

tape('104 17th st - no result', function(t) {
    c.geocode('104 17th st', {}, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 0);
        t.end();
    });
});

tape('100 17th st', function(t) {
    c.geocode('100 17th st', {}, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.equals(res.features[0].place_name, '100 17th st');
        t.equals(res.features[0].id, 'address.1');
        t.deepEquals(res.features[0].geometry.coordinates, [0, 0]);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

