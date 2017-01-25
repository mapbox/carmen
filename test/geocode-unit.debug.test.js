var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

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
        id:2,
        properties: {
            'carmen:text':'new york, ny',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }
    addFeature(conf.city, city, t.end);
});
tape('index city 2', function(t) {
    var city = {
        id:3,
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
        id:4,
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
        id:5,
        properties: {
            'carmen:text':'west st',
            'carmen:zxy':['6/34/32'],
            'carmen:center':[14.0625, -2.8079929095776683]
        }
    };
    addFeature(conf.street, street, t.end);
});
tape('west st, tonawanda, ny', function(t) {
    c.geocode('west st tonawanda ny', { limit_verify:1, debug:4 }, function(err, res) {
        t.ifError(err);
        t.equal(res.debug.id, 4, 'debugs id');
        t.equal(res.debug.extid, 4, 'debugs extid');

        t.deepEqual(Object.keys(res.debug), [
            'id',
            'extid',
            'phrasematch',
            'spatialmatch',
            'spatialmatch_position',
            'verifymatch'
        ], 'debug keys');

        t.deepEqual(res.debug.phrasematch, {
            'province': { ny: 0.25 },
            'city': { ny: 0.25, tonawanda: 0.25 },
            'street': { 'west st': 0.5 }
        }, 'debugs matched phrases');

        // Found debug feature in spatialmatch results @ position 1
        t.deepEqual(res.debug.spatialmatch.covers[0].text, 'west st');
        t.deepEqual(res.debug.spatialmatch.covers[0].relev, 0.3333333333333333);
        t.deepEqual(res.debug.spatialmatch.covers[1].text, 'ny');
        t.deepEqual(res.debug.spatialmatch.covers[1].relev, 0.3333333333333333);
        t.deepEqual(res.debug.spatialmatch_position, 1);

        // Debug feature not found in verifymatch
        t.deepEqual(res.debug.verifymatch, null);
        t.end();
    });
});
tape('west st, tonawanda, ny', function(t) {
    c.geocode('west st tonawanda ny', { limit_verify:1, debug:5 }, function(err, res) {
        t.ifError(err);
        t.equal(res.debug.id, 5, 'debugs id');
        t.equal(res.debug.extid, 5, 'debugs extid');

        t.deepEqual(Object.keys(res.debug), [
            'id',
            'extid',
            'phrasematch',
            'spatialmatch',
            'spatialmatch_position',
            'verifymatch',
            'verifymatch_position'
        ], 'debug keys');

        t.deepEqual(res.debug.phrasematch, {
            'province': { ny: 0.25 },
            'city': { ny: 0.25, tonawanda: 0.25 },
            'street': { 'west st': 0.5 }
        }, 'debugs matched phrases');

        // Found debug feature in spatialmatch results @ position 1
        t.deepEqual(res.debug.spatialmatch.covers[0].id, 5);
        t.deepEqual(res.debug.spatialmatch.covers[0].text, 'west st');
        t.deepEqual(res.debug.spatialmatch.covers[0].relev, 0.3333333333333333);
        t.deepEqual(res.debug.spatialmatch.covers[1].text, 'ny');
        t.deepEqual(res.debug.spatialmatch.covers[1].relev, 0.3333333333333333);
        t.deepEqual(res.debug.spatialmatch.covers[2].text, 'tonawanda');
        t.deepEqual(res.debug.spatialmatch.covers[2].relev, 0.3333333333333333);
        t.deepEqual(res.debug.spatialmatch_position, 0);

        // Debug feature not found in verifymatch
        t.deepEqual(res.debug.verifymatch[0].id, 5);
        t.deepEqual(res.debug.verifymatch[0].properties['carmen:text'], 'west st');
        t.deepEqual(res.debug.verifymatch_position, 0);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});


