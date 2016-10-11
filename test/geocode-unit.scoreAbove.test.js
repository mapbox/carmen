// Tests Eiffel Tower (landmark) vs Eiffel Tower (dry cleaners)
// Eiffel Tower should win via scoreAbove bonus.

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = {
        poi: new mem(null, function() {})
    };
    var c = new Carmen(conf);
    var tajMahalVarious = ['Taj Mahal', 'Taj Mahal Dry Cleaners', 'Taj Mahal Photos', 'Taj Mahal restaurant', 'Taj Mahal cafe'];

    //scorefactor classes
    // 1 - 39 - 1 * scorefactor
    // 40 - 79 - 2 * scorefactor
    // 80 - 119 - 3 * scorefactor
    // 120 - 159 - 4 * scorefactor
    // 160 - 199 - 5 * scorefactor
    // 200 - 239 - 6 * scorefactor
    // 240 - 279 - 7 * scorefactor
    var score = [275, 10, 70, 100, 140];

    
    tape('index insignificant Taj Mahal pois (noise)', function(t) {
        var q = queue(1);

        for (var i = 0; i < 5; i++) q.defer(function(i, done) {
            addFeature(conf.poi, {
                id:i+1,
                properties: {
                    'carmen:score':score[i],
                    'carmen:text': tajMahalVarious[i],
                    'carmen:zxy':['6/32/32'],
                    'carmen:center': (i === 1) ? [8.44, -2.81] : [i,0]
                }
            }, done);
        }, i);
        q.awaitAll(t.end);
    });
    
    tape('scoreAbove = 1', function(t) {
        c.geocode('Taj Mahal', { scoreAbove:1 }, function(err, res) {
            t.equal(res.features.length, 5);
            var ids = []
            res.features.forEach(function(feature) {
                ids.push(feature.id)
            });
            t.deepEqual(ids.sort(), ['poi.1', 'poi.2', 'poi.3', 'poi.4', 'poi.5']);
            t.end();
        });
    });
    tape('scoreAbove = 2', function(t) {
        c.geocode('Taj Mahal', { scoreAbove:2 }, function(err, res) {
            t.equal(res.features.length, 4);
            var ids = []
            res.features.forEach(function(feature) {
                ids.push(feature.id)
            });
            t.deepEqual(ids.sort(), ['poi.1', 'poi.3', 'poi.4', 'poi.5']);
            t.end();
        });
    });
    tape('scoreAbove = 3', function(t) {
        c.geocode('Taj Mahal', { scoreAbove:3 }, function(err, res) {
            t.equal(res.features.length, 3);
            var ids = []
            res.features.forEach(function(feature) {
                ids.push(feature.id)
            });
            t.deepEqual(ids.sort(), ['poi.1', 'poi.4','poi.5']);
            t.end();
        });
    });
    tape('scoreAbove = 4', function(t) {
        c.geocode('Taj Mahal', { scoreAbove:4 }, function(err, res) {
            t.equal(res.features.length, 2);
            var ids = []
            res.features.forEach(function(feature) {
                ids.push(feature.id)
            });
            t.deepEqual(ids.sort(), ['poi.1', 'poi.5']);
            t.end();
        });
    });
    tape('scoreAbove = 5', function(t) {
        c.geocode('Taj Mahal', { scoreAbove:5 }, function(err, res) {
            t.equal(res.features.length, 1);
            var ids = []
            res.features.forEach(function(feature) {
                ids.push(feature.id)
            });
            t.deepEqual(ids.sort(), ['poi.1']);
            t.end();
        });
    });
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

