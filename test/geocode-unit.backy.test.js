// Unit tests for backy stacking of features ("lessingstrasse 50825 koln vs lessingstrasse koln 50825")

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    postcode: new mem(null, function() {}),
    city: new mem(null, function() {}),
    street: new mem({ maxzoom:6, geocoder_address:1 }, function() {})
};
var c = new Carmen(conf);
tape('index postcode', function(t) {
    var doc = {
        id:1,
        properties: {
            'carmen:text': '50825',
            'carmen:zxy': ['6/32/32','6/33/32'],
            'carmen:center': [0,0]
        }
    };
    addFeature(conf.postcode, doc, t.end);
});
tape('index city', function(t) {
    var city = {
        id:1,
        properties: {
            'carmen:text':'koln',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.city, city, t.end);
});
tape('index street 1', function(t) {
    var street = {
        id:1,
        properties: {
            'carmen:text': 'lessingstrasse',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0,0]
        }
    };
    addFeature(conf.street, street, t.end);
});
tape('index street 2', function(t) {
    var street = {
        id:2,
        properties: {
            'carmen:text': 'lessingstrasse',
            'carmen:zxy': ['6/33/32'],
            'carmen:center': [360/64+0.001,0]
        }
    };
    addFeature(conf.street, street, t.end);
});
tape('lessingstrasse koln 50825', function(t) {
    c.geocode('lessingstrasse koln 50825', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'lessingstrasse, koln, 50825');
        t.deepEqual(res.features[0].id, 'street.1');
        t.deepEqual(res.features[0].relevance, 1);
        t.end();
    });
});
tape('lessingstrasse 50825 koln', function(t) {
    c.geocode('lessingstrasse 50825 koln', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'lessingstrasse, koln, 50825');
        t.deepEqual(res.features[0].id, 'street.1');
        t.deepEqual(res.features[0].relevance, 0.8333333333333333);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

