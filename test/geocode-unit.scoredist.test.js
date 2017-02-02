// scoredist unit test

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');
var queue = require('d3-queue').queue;

(function() {

    var conf = {
        address: new mem(null, function() {}),
    };
    var c = new Carmen(conf);
    tape('index address (signal 1)', function(t) {
        addFeature(conf.address, {
            id:200,
            properties: {
                'carmen:text':'main st',
                'carmen:zxy':['6/0/0'],
                'carmen:score':1000,
                'carmen:center':[-179.99,85]
            }
        }, t.end);
    });
    tape('index address (signal 2)', function(t) {
        addFeature(conf.address, {
            id:201,
            properties: {
                'carmen:text':'main st',
                'carmen:zxy':['6/35/32'],
                'carmen:score':1000,
                'carmen:center':[20,0]
            }
        }, t.end);
    });
    tape('index address (noise)', function(t) {
        var q = queue(1);
        for (var i = 1; i < 100; i++) q.defer(function(i, done) {
            addFeature(conf.address, {
                id:i,
                properties: {
                    'carmen:text':'main st',
                    'carmen:zxy':['6/32/32'],
                    'carmen:scorei':50,
                    'carmen:center':[0,0]
                }
            }, done);
        }, i);
        q.awaitAll(t.end);
    });
    tape('geocode proximity=10,10 => superscored', function(t) {
        c.geocode('main st', { proximity:[10,10] }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].id, 'address.200', 'found address.200');
            t.end();
        });
    });
    tape('geocode proximity=20,0 => nearest', function(t) {
        c.geocode('main st', { proximity:[20,0] }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].id, 'address.201', 'found address.201');
            t.end();
        });
    });
    tape('teardown', function(assert) {
        context.getTile.cache.reset();
        assert.end();
    });

})();
