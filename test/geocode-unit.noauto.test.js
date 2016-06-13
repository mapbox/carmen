// Test score handling across indexes

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

// Confirm that disabling autocomplete works, and that in situations where an autocomplete
// result scores highest, the winner changes depending on whether or not autocomplete is enabled
(function() {
    var conf = { place: new mem(null, function() {}) };
    var c = new Carmen(conf);
    tape('index first place', function(t) {
        var place = {
            id:1,
            properties: {
                'carmen:score': 100,
                'carmen:text':'abcde',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        };
        addFeature(conf.place, place, t.end);
    });
    tape('index second place', function(t) {
        var place = {
            id:2,
            properties: {
                'carmen:score': 10,
                'carmen:text':'abc',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        };
        addFeature(conf.place, place, t.end);
    });
    tape('abc - with autocomplete', function(t) {
        c.geocode('abc', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'abcde', 'abcde wins for abc with autocomplete');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('abc - no autocomplete', function(t) {
        c.geocode('abc', { limit_verify:1, autocomplete: 0 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'abc', 'abc wins for abc without autocomplete');
            t.deepEqual(res.features[0].id, 'place.2');
            t.end();
        });
    });
    tape('abcde - with autocomplete', function(t) {
        c.geocode('abcde', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'abcde', 'abcde wins for abcde with autocomplete');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('abcde - no autocomplete', function(t) {
        c.geocode('abcde', { limit_verify:1, autocomplete: 0 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'abcde', 'abcde wins for abcde without autocomplete');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('ab - with autocomplete', function(t) {
        c.geocode('ab', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'abcde', 'abcde wins for ab with autocomplete');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('ab - no autocomplete', function(t) {
        c.geocode('ab', { limit_verify:1, autocomplete: 0 }, function(err, res) {
            t.ifError(err);
            t.equal(res.features.length, 0, 'ab matches nothing without autocomplete');
            t.end();
        });
    });
})();

// test autocomplete where tokenization is implicated
(function() {
    var conf = { place: new mem(null, function() {}) };
    var c = new Carmen(conf);
    tape('index place', function(t) {
        var place = {
            id:1,
            properties: {
                'carmen:score': 100,
                'carmen:text':'place one',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        };
        addFeature(conf.place, place, t.end);
    });
    tape('place - with autocomplete', function(t) {
        c.geocode('place', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'place one', 'place matches with autocomplete');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('place - no autocomplete', function(t) {
        c.geocode('place', { limit_verify:1, autocomplete: 0 }, function(err, res) {
            t.ifError(err);
            t.equal(res.features.length, 0, 'place matches nothing without autocomplete');
            t.end();
        });
    });
    tape('one - with autocomplete', function(t) {
        c.geocode('one', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.equal(res.features.length, 0, 'one matches nothing with autocomplete');
            t.end();
        });
    });
    tape('one - no autocomplete', function(t) {
        c.geocode('one', { limit_verify:1, autocomplete: 0 }, function(err, res) {
            t.ifError(err);
            t.equal(res.features.length, 0, 'one matches nothing without autocomplete');
            t.end();
        });
    });
    tape('place o - with autocomplete', function(t) {
        c.geocode('place o', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'place one', 'abcde wins for abc with autocomplete');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('place o - no autocomplete', function(t) {
        c.geocode('place o', { limit_verify:1, autocomplete: 0 }, function(err, res) {
            t.ifError(err);
            t.equal(res.features.length, 0, 'place o matches nothing without autocomplete');
            t.end();
        });
    });
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

