var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    address: new mem({maxzoom: 6, geocoder_address: 1, geocoder_format: '{address._name} {address._number}', geocoder_name:'address'}, function() {})
};
var c = new Carmen(conf);

tape('index address', function(t) {
    var address = {
        id:1,
        properties: {
            'carmen:text':'Brehmestraße',
            'carmen:center':[0,0],
            'carmen:addressnumber': ['56']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    };
    addFeature(conf.address, address, t.end);
});

tape('test address', function(t) {
    c.geocode('56 Brehmestr.', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0] && res.features[0].place_name, 'Brehmestraße 56');
        t.end();
    });
});

// Real solution here is regex token for *strasse => *str
tape.skip('test address', function(t) {
    c.geocode('Brehmestr. 56', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        t.equals(res.features[0] && res.features[0].place_name, 'Brehmestraße 56');
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
