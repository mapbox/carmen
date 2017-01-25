var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem(null, function() {}),
    region: new mem(null, function() {}),
    place: new mem(null, function() {}),
    address: new mem({maxzoom: 6, geocoder_address: 1, geocoder_address_order: 'descending', geocoder_format: '{country._name}, {region._name}{place._name}{address._name}{address._number}'}, function() {})
};
var c = new Carmen(conf);

tape('index country', function(t) {
    var country = {
        id:1,
        properties: {
            'carmen:text':'Japan',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.country, country, t.end);
});

tape('index region', function(t) {
    var region = {
        id:2,
        properties: {
            'carmen:text':'和歌山県',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.region, region, t.end);
});

tape('index place 1', function(t) {
    var place = {
        id:3,
        properties: {
            'carmen:text':'岩出市',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.place, place, t.end);
});

tape('index address 1', function(t) {
    var address = {
        id:4,
        properties: {
            'carmen:text':'中黒',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:addressnumber': ['632']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    };
    addFeature(conf.address, address, t.end);
});

tape('Check order, 岩出市中黒632', function(t) {
    c.geocode('岩出市中黒632', { limit_verify: 1}, function(err, res) {
        t.ifError(err);
        t.equal(res.features.length, 1, "Descending order doesn't lower relevance");
        t.end();
    });
});

tape('Check order, 632 中黒 岩出市', function(t) {
    c.geocode('632 中黒 岩出市', { limit_verify: 1}, function(err, res) {
        t.ifError(err);
        t.equal(res.features[0].address, '632', "Gets correct address");
        t.equal(res.features[0].relevance, 0.99, "Unexpected ascending lowers relevance")
        t.end();
    });
});

tape('Check order, 632 中黒 Japan 岩出市', function(t) {
    c.geocode('632 中黒 Japan 岩出市', { limit_verify: 1}, function(err, res) {
        t.ifError(err);
        t.equal(res.features[0].address, '632', "Gets correct address");
        t.equal(res.features[0].relevance, 0.8223333333333333, "Mixed-up order lowers relevance")
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

