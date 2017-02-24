//Ensure that results that have equal relev in phrasematch
//are matched against the 0.5 relev bar instead of 0.75

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var conf = {
    country: new mem({ maxzoom:6 }, function() {})
};
var c = new Carmen(conf);
tape('index country', function(t) {
    var country = {
        id:1,
        properties: {
            'carmen:text':'czech republic',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.country, country, t.end);
});
tape('index country2', function(t) {
    var country = {
        id:2,
        properties: {
            'carmen:text':'fake country two',
            'carmen:zxy':['7/32/32'],
            'carmen:center':[0,0]
        }
    };
    queueFeature(conf.country, country, t.end);
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
tape('czech => czech republic', function(t) {
    c.geocode('czech', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'czech republic');
        t.deepEqual(res.features[0].id, 'country.1');
        t.end();
    });
});

//Is not above 0.5 relev so should fail.
tape('fake blah blah => [fail]', function(t) {
    c.geocode('fake blah blah', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.notOk(res.features[0]);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});