// Unit tests for gappy stacking of features ("west st new york")

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

// limit_verify 1 implies that the correct result must be the very top
// result prior to context verification. It means even with a long list
// of competing results the correct candidate is sorted to the top.

// limit_verify 2 implies that there is some ambiguity prior to context
// verification (e.g. new york (city) vs new york (province)) that is sorted
// into the correct order after context verification occurs.

var conf = {
    province: new mem(null, function() {}),
    city: new mem(null, function() {}),
    street: new mem({ maxzoom:6, geocoder_address:1 }, function() {})
};
var c = new Carmen(conf);
tape('index province', function(t) {
    var province = {
        id:1,
        properties: {
            'carmen:text':'new york, ny',
            'carmen:zxy':['6/32/32','6/34/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.province, province, t.end);
});
tape('index city 1', function(t) {
    var city = {
        id:1,
        properties: {
            'carmen:text':'new york, ny',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.city, city, t.end);
});
tape('index city 2', function(t) {
    var city = {
        id:2,
        properties: {
            'carmen:text':'tonawanda',
            'carmen:zxy':['6/34/32'],
            'carmen:center':[14.0625, -2.8079929095776683]
        }
    };
    addFeature(conf.city, city, t.end);
});
tape('index street 1', function(t) {
    var street = {
        id:1,
        properties: {
            'carmen:text':'west st',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.street, street, t.end);
});
tape('index street 2', function(t) {
    var street = {
        id:2,
        properties: {
            'carmen:text':'west st',
            'carmen:zxy':['6/34/32'],
            'carmen:center':[14.0625, -2.8079929095776683]
        }
    };
    addFeature(conf.street, street, t.end);
});
tape('west st, tonawanda, ny', function(t) {
    c.geocode('west st tonawanda ny', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'west st, tonawanda, new york');
        t.end();
    });
});
tape('west st, new york, ny', function(t) {
    c.geocode('west st new york ny', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'west st, new york, new york');
        t.end();
    });
});
tape('new york', function(t) {
    c.geocode('new york', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'new york');
        t.deepEqual(res.features[0].id, 'province.1');
        t.end();
    });
});
tape('new york new york', function(t) {
    c.geocode('new york new york', { limit_verify:2 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'new york, new york');
        t.deepEqual(res.features[0].id, 'city.1');
        t.end();
    });
});
tape('ny ny', function(t) {
    c.geocode('ny ny', { limit_verify:2 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'new york, new york');
        t.deepEqual(res.features[0].id, 'city.1');
        t.end();
    });
});
tape('new york ny', function(t) {
    c.geocode('new york ny', { limit_verify:2 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'new york, new york');
        t.deepEqual(res.features[0].id, 'city.1');
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

