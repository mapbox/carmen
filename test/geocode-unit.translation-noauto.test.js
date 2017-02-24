// Confirm that translations are not included in the autocomplete index

var tape = require('tape');
var Carmen = require('..');
var cxxcache = require('../lib/util/cxxcache');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var runTests = function(mode) {
    var conf = { region: new mem(null, function() {}) };
    var c = new Carmen(conf);
    tape('index first region', function(t) {
        queueFeature(conf.region, {
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
        queueFeature(conf.region, {
            id:2,
            properties: {
                'carmen:text':'Delaware',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, t.end);
    });
    tape('build queued features', function(t) {
        var q = queue();
        Object.keys(conf).forEach(function(c) {
            q.defer(function(cb) {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });

    if (mode == "lazy") {
        // on the second run through the tests, force carmen-cache to use lazy
        // instead of in-memory caching
        tape('reload cache', function(t) {
            var cache = c.byidx[0]._geocoder;

            ['freq', 'grid'].forEach(function(type) {
                var rocksdb = c.byidx[0].getBaseFilename() + '.' + type + '.rocksdb';

                cache[type].pack(rocksdb);
                cache[type] = new cxxcache.RocksDBCache(cache[type].id, rocksdb)
            });

            t.end();
        });
    }

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

    if (mode == "memory_cache") runTests("lazy");
};

runTests("memory_cache");

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

