// Test that cluster results are prioritized over itp results when
// present and otherwise equal.

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    addressitp: new mem({maxzoom: 6, geocoder_address: 1, geocoder_name:'address'}, function() {}),
    address: new mem({maxzoom: 6, geocoder_address: 1, geocoder_name:'address'}, function() {})
};
var c = new Carmen(conf);
tape('index address', function(t) {
    var address = {
        id:1,
        properties: {
            'carmen:text': 'fake street',
            'carmen:center': [0,0],
            'carmen:addressnumber': ['100']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    };
    addFeature(conf.address, address, t.end);
});
tape('index addressitp', function(t) {
    var addressitp = {
        id:1,
        properties: {
            'carmen:text': 'fake street',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0,0],
            'carmen:rangetype' :'tiger',
            'carmen:parityr': 'O',
            'carmen:rfromhn': '1',
            'carmen:rtohn': '91',
            'carmen:parityl': 'E',
            'carmen:lfromhn': '0',
            'carmen:ltohn': '90',
        },
        geometry: {
            type:'LineString',
            coordinates:[[0,0],[0,1]]
        }
    };
    addFeature(conf.addressitp, addressitp, t.end);
});
tape('test address query with address range', function(t) {
    c.geocode('100 fake street', { limit_verify: 2 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, '100 fake street', 'found 100 fake street');
        t.equals(res.features[0].relevance, 0.99);
        t.end();
    });
});

//Reverse geocode will return a pt since it is futher down in the stack than itp
tape('test reverse address query with address range', function(t) {
    c.geocode('0,0', { limit_verify: 2 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0].place_name, '100 fake street', 'found 100 fake street');
        t.equals(res.features[0].relevance, 1);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

