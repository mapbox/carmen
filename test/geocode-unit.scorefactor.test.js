// Test that score is multiplied by the index scorefactor so that
// cross-index comparisons make sense.

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = {
        country: new mem(null, function() {}),
        place: new mem(null, function() {})
    };
    var c = new Carmen(conf);
    tape('index small score (noise)', function(t) {
        var q = queue(1);
        for (var i = 1; i < 41; i++) q.defer(function(i, done) {
            addFeature(conf.place, {
                id:i,
                properties: {
                    'carmen:score':10,
                    'carmen:text':'testplace',
                    'carmen:zxy':['6/32/32'],
                    'carmen:center':[0,0]
                }
            }, done);
        }, i);
        q.awaitAll(t.end);
    });
    tape('index big score (noise)', function(t) {
        addFeature(conf.country, {
            id:1,
            properties: {
                'carmen:score': 1e9,
                'carmen:text':'ignoreme',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, t.end);
    });
    tape('index big score (signal)', function(t) {
        addFeature(conf.country, {
            id:2,
            properties: {
                'carmen:score': 1e6,
                'carmen:text': 'testplace',
                'carmen:zxy': ['6/33/32'],
                'carmen:center': [360/64+0.001,0]
            }
        }, t.end);
    });
    tape('query', function(t) {
        c.geocode('testplace', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'testplace');
            t.deepEqual(res.features[0].id, 'country.2');
            t.end();
        });
    });
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

