var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var country = new mem(null, function() {});
var conf = { country: country };
var a = new Carmen(conf);

tape('index country', function(t) {
    queueFeature(conf.country, {
        id:1,
        properties: {
            'carmen:text':'america',
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
tape('geocodes', function(t) {
    a.geocode('america', {}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'america');
        t.deepEqual(res.features[0].id, 'country.1');
        t.end();
    });
});
tape('sets cache/dictcache', function(t) {
    t.ok(country._geocoder, 'sets source._geocoder on original instance');
    t.ok(country._dictcache, 'sets source._dictcache on original instance');
    t.equal(country._geocoder, a.indexes.country._geocoder, 'clone cache === source cache');
    t.equal(country._dictcache, a.indexes.country._dictcache, 'clone dictcache === source dictcache');
    var b = new Carmen({ country: country });
    t.equal(b.indexes.country._geocoder, a.indexes.country._geocoder, 'a cache === b cache');
    t.equal(b.indexes.country._dictcache, a.indexes.country._dictcache, 'a dictcache === b dictcache');
    t.end();
});
tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});