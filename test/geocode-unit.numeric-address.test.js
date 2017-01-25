var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    address: new mem({maxzoom: 6, geocoder_address: 1, geocoder_name:'address'}, function() {})
};
var c = new Carmen(conf);

tape('index address', function(t) {
    var address = {
        id:100,
        properties: {
            'carmen:text':'17th st',
            'carmen:center':[0,0],
            'carmen:addressnumber': ['100']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    };
    addFeature(conf.address, address, t.end);
});

tape('100 17th', function(t) {
    c.geocode('100 17th', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.end();
    });
});

tape('100 17t', function(t) {
    c.geocode('100 17t', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.end();
    });
});

tape('100 17', function(t) {
    c.geocode('100 17', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

