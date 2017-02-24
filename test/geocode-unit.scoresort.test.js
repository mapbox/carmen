// scoredist unit test

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;
var queue = require('d3-queue').queue;

(function() {

    var conf = {
        region: new mem(null, function() {}),
        place: new mem(null, function() {}),
        lamplace: new mem(null, function() {}),
        namplace: new mem(null, function() {}),
        locality: new mem(null, function() {})
    };
    var c = new Carmen(conf);
    // very high max score in region index
    tape('index region (high score)', function(t) {
        queueFeature(conf.region, {
            id:1,
            properties: {
                'carmen:text':'bigtown',
                'carmen:zxy':['6/32/32'],
                'carmen:score':160000,
                'carmen:center':[0,0]
            }
        }, t.end);
    });

    // Many low-scored features in region index
    tape('index region (low score)', function(t) {
        var q = queue(1);
        for (var i =2; i < 25; i++) q.defer(function(i, done) {
            queueFeature(conf.region, {
                id:i,
                properties: {
                    'carmen:text':'smallville' + i,
                    'carmen:zxy':['6/32/32'],
                    'carmen:score':1,
                    'carmen:center':[0,0]
                }
            }, done);
        }, i);
        q.awaitAll(t.end);
    });

    // Many medium-scored features in region index
    tape('index region (medium score)', function(t) {
        var q = queue(1);
        for (var i =25; i < 50; i++) q.defer(function(i, done) {
            queueFeature(conf.region, {
                id:i,
                properties: {
                    'carmen:text':'smallville' + i,
                    'carmen:zxy':['6/32/32'],
                    'carmen:score':3000,
                    'carmen:center':[0,0]
                }
            }, done);
        }, i);
        q.awaitAll(t.end);
    });

    // Feature is scored higher than all but one region
    tape('index place (high score)', function(t) {
        queueFeature(conf.place, {
            id:1,
            properties: {
                'carmen:text':'smallville1',
                'carmen:zxy':['6/32/32'],
                'carmen:score':10000,
                'carmen:center':[0,0]
            }
        }, t.end);
    });

    tape('index lamplace (high score)', function(t) {
        queueFeature(conf.lamplace, {
            id:1,
            properties: {
                'carmen:text':'smallville1',
                'carmen:zxy':['6/32/32'],
                'carmen:score':36500,
                'carmen:center':[0,0]
            }
        }, t.end);
    });

    // Many medium-scored features in region index
    tape('index lamplace (medium score)', function(t) {
        var q = queue(1);
        for (var i =2; i < 25; i++) q.defer(function(i, done) {
            queueFeature(conf.lamplace, {
                id:i,
                properties: {
                    'carmen:text':'smallville' + i,
                    'carmen:zxy':['6/32/32'],
                    'carmen:score':6000,
                    'carmen:center':[0,0]
                }
            }, done);
        }, i);
        q.awaitAll(t.end);
    });

    tape('index namplace (high score)', function(t) {
        queueFeature(conf.namplace, {
            id:1,
            properties: {
                'carmen:text':'smallville1',
                'carmen:zxy':['6/32/32'],
                'carmen:score':16000,
                'carmen:center':[0,0]
            }
        }, t.end);
    });

    tape('index locality (low score)', function(t) {
        queueFeature(conf.locality, {
            id:1,
            properties: {
                'carmen:text':'smallville1',
                'carmen:zxy':['6/32/32'],
                'carmen:score':1000,
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

    // High-scored feature wins over low-scored features in index with high max score
    tape('high score beats low score + high scorefactor', function(t) {
        c.geocode('smallville', null, function(err, res) {
            t.ifError(err);
            t.equal(res.features[0].id, "lamplace.1", "Place (high score) is first result")
            t.equal(res.features[1].id, "namplace.1", "Place (high score) is second result")
            t.end();
        });
    });
    tape('teardown', function(assert) {
        context.getTile.cache.reset();
        assert.end();
    });

})();

