// Confirm that translations are not included in the autocomplete index

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = { region: new mem(null, function() {}) };
    var c = new Carmen(conf);
    tape('index first region', function(t) {
        addFeature(conf.region, {
            id:1,
            properties: {
                'carmen:text':'South Carolina',
                'carmen:text_hu':'Dél-Karolina',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, t.end);
    });
    tape('index second region', function(t) {
        addFeature(conf.region, {
            id:2,
            properties: {
                'carmen:text':'Delaware',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, t.end);
    });
    tape('de', function(t) {
        c.geocode('de', {}, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features.length, 1, '1 result');
            t.deepEqual(res.features[0].place_name, 'Delaware', 'found: Delaware');
            t.deepEqual(res.features[0].id, 'region.2');
            t.end();
        });
    });
    tape('delaware', function(t) {
        c.geocode('delaware', {}, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features.length, 1, '1 result');
            t.deepEqual(res.features[0].place_name, 'Delaware', 'found: Delaware');
            t.deepEqual(res.features[0].id, 'region.2');
            t.end();
        });
    });
    tape('sou', function(t) {
        c.geocode('sou', {}, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features.length, 1, '1 result');
            t.deepEqual(res.features[0].place_name, 'South Carolina', 'found: South Carolina');
            t.deepEqual(res.features[0].id, 'region.1');
            t.end();
        });
    });
    tape('south carolina', function(t) {
        c.geocode('south carolina', {}, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features.length, 1, '1 result');
            t.deepEqual(res.features[0].place_name, 'South Carolina', 'found: South Carolina');
            t.deepEqual(res.features[0].id, 'region.1');
            t.end();
        });
    });
    tape('del karolina', function(t) {
        c.geocode('del karolina', {}, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features.length, 1, '1 result');
            t.deepEqual(res.features[0].place_name, 'South Carolina', 'found: South Carolina');
            t.deepEqual(res.features[0].id, 'region.1');
            t.end();
        });
    });
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

