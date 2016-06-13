// Tests Windsor CT (city) vs Windsor Ct (street name)
// Windsor CT should win via stacky bonus.

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem(null, function() {}),
    region: new mem(null, function() {}),
    place: new mem(null, function() {})
};
var c = new Carmen(conf);
tape('index country', function(t) {
    addFeature(conf.country, {
        id:1,
        properties: {
            'carmen:text':'china',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index region', function(t) {
    addFeature(conf.region, {
        id:1,
        properties: {
            'carmen:text':'china',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index place', function(t) {
    addFeature(conf.place, {
        id:1,
        properties: {
            'carmen:text':'china',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
// invalid options.types type
tape('china', function(t) {
    c.geocode('china', { types: 'asdf' }, function(err, res) {
        t.equal(err && err.toString(), 'Error: options.types must be an array with at least 1 type');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});
// invalid options.types length
tape('china', function(t) {
    c.geocode('china', { types: [] }, function(err, res) {
        t.equal(err && err.toString(), 'Error: options.types must be an array with at least 1 type');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});
// invalid options.types[0] value
tape('china', function(t) {
    c.geocode('china', { types: ['asdf'] }, function(err, res) {
        t.equal(err && err.toString(), 'Error: Type "asdf" is not a known type. Must be one of: country, region, place');
        t.equal(err && err.code, 'EINVALID');
        t.end();
    });
});
// country wins without type filter
tape('china', function(t) {
    c.geocode('china', { limit_verify:3 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 3, '3 results');
        t.deepEqual(res.features[0].id, 'country.1', 'country wins');
        t.end();
    });
});
// types: place
tape('china', function(t) {
    c.geocode('china', { limit_verify:3, types:['place'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.deepEqual(res.features[0].id, 'place.1', 'place wins');
        t.end();
    });
});
// types: region, place
tape('china', function(t) {
    c.geocode('china', { limit_verify:3, types:['region','place'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 2, '2 results');
        t.deepEqual(res.features[0].id, 'region.1', 'region #1');
        t.deepEqual(res.features[1].id, 'place.1', 'place #2');
        t.end();
    });
});

// reverse without type filter
tape('reverse', function(t) {
    c.geocode('0,0', {}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 3, '3 results');
        t.deepEqual(res.features[0].id, 'place.1', 'place wins');
        t.end();
    });
});
tape('reverse: country', function(t) {
    c.geocode('0,0', { types:['country'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.deepEqual(res.features[0].id, 'country.1', 'country wins');
        t.end();
    });
});
tape('reverse: country,place', function(t) {
    c.geocode('0,0', { types:['country','place'] }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 2, '2 results');
        t.deepEqual(res.features[0].id, 'place.1', '1: place');
        t.deepEqual(res.features[0].context, [
            { id:'region.1', text:'china' },
            { id:'country.1', text:'china' },
        ], 'preserves full context of place result (including region)');
        t.deepEqual(res.features[1].id, 'country.1', '2: country');
        t.deepEqual(res.features[1].context, undefined);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

