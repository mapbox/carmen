var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    street: new mem(null, function() {})
};

var c = new Carmen(conf);

tape('index feature', function(t) {
    var range = [];
    for (var i = 1; i < 100; i++) range.push(i);
    range.forEach(function(i) {
        t.test('addFeature', function(tt) {
            addFeature(conf.street, {
                id:i,
                properties: {
                    'carmen:text':'Main Street',
                    'carmen:zxy':['6/14/18'],
                    'carmen:center':[-100,60],
                    'carmen:score': 2
                }
            }, function() {
                tt.end();
            });
        });
    });
    t.end();
});

tape('index feature', function(t) {
    var feature = {
        id:102,
        properties: {
            'carmen:text':'Main Street',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:score': 1,
        }
    };
    addFeature(conf.street, feature, t.end);
});

tape('index feature', function(t) {
    var feature = {
        id:103,
        properties: {
            'carmen:text':'Date Line Street',
            'carmen:zxy':['2/0/1'],
            'carmen:center':[-180,40],
            'carmen:score': 1,
        }
    };
    addFeature(conf.street, feature, t.end);
});

// run query with invalid bbox, expect error
tape('fake bbox', function(t) {
    c.geocode('Main St', {bbox: [-1.0, -1.0, 1.0], allow_dupes: true}, function(err, res) {
        t.equal(err && err.code, 'EINVALID', 'bbox array length = 3');
    });
    c.geocode('Main St', {bbox: [-1.0, -1.0, 1.0, 'a'], allow_dupes: true}, function(err, res) {
        t.equal(err && err.code, 'EINVALID', 'non-numeric bbox param');
    });
    c.geocode('Main St', {bbox: [-180, -90, 180, 91], allow_dupes: true}, function(err, res) {
        t.equal(err && err.code, 'EINVALID', 'maxY out-of-bounds');
    });
    t.end();
});

// run query without bbox filter, expect both features back
tape('no bbox', function(t) {
    c.geocode('Main St', { allow_dupes: true }, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 5);
        t.end();
    });
});

// run query with bbox fitler, expect only one feature back
tape('with bbox', function(t) {
    c.geocode('Main St', { bbox: [-1.0, -1.0, 1.0, 1.0], allow_dupes: true}, function(err, res) {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
