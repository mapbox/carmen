var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');
var queue = require('d3-queue').queue;

var conf = {
    country: new mem(null, function() {}),
    region: new mem(null, function() {}),
    postcode: new mem(null, function() {}),
    place: new mem(null, function() {}),
    neighborhood: new mem(null, function() {}),
    address: new mem({
        maxzoom: 6,
        geocoder_name: 'address',
        geocoder_type: 'address',
        geocoder_address: 1
    }, function() {}),
    poi: new mem({
        maxzoom:6,
        geocoder_name: 'address',
        geocoder_type: 'poi'
    }, function() {})
};
var c = new Carmen(conf);

tape('index country', function(t) {
    var country = {
        id:1,
        properties: {
            'carmen:text':'Canada',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.country, country, t.end);
});

tape('index region', function(t) {
    var region = {
        id:1,
        properties: {
            'carmen:text':'Newfoundland and Labrador',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.region, region, t.end);
});

tape('index postcode', function(t) {
    var postcode = {
        id:1,
        properties: {
            'carmen:text':'A1N 4Y1',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.postcode, postcode, t.end);
});

tape('index place', function(t) {
    var place = {
        id:1,
        properties: {
            'carmen:text':'Mount Pearl',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.place, place, t.end);
});

tape('index neighborhood', function(t) {
    var neighborhood = {
        id:1,
        properties: {
            'carmen:text':'Waterford Valley',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.neighborhood, neighborhood, t.end);
});

tape('index poi', function(t) {
    var q = queue(1);
    for (var i = 1; i < 20; i++) q.defer(function(i, done) {
        addFeature(conf.poi, {
            id:i,
            properties: {
                'carmen:text':'Canada Post ' + i + 'a',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, done);
    }, i);
    q.awaitAll(t.end);
});

tape('Descending Gappy', function(t) {
    c.geocode('Waterford Valley Canada', {}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].id, "neighborhood.1");
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});