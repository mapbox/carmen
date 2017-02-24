var tape = require('tape');
var Carmen = require('..');
var mem = require('../lib/api-mem');
var context = require('../lib/context');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

(function() {
    var conf = {
        country: new mem({ maxzoom:6 }, function() {}),
        postcode: new mem({ maxzoom:6, geocoder_universal_text: true }, function() {})
    };
    var c = new Carmen(conf);

    tape('index country', function(assert) {
        queueFeature(conf.country, {
            type: 'Feature',
            id: 1,
            properties: {
                'carmen:center': [1,1],
                'carmen:text_es': 'Estados Unidos',
                'carmen:text': 'United States'
            },
            geometry: {
                type: 'Point',
                coordinates: [1,1]
            }
        }, assert.end);
    });

    tape('index postcode', function(assert) {
        queueFeature(conf.postcode, {
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:center': [1,1],
                'carmen:text': '10000'
            },
            geometry: {
                type: 'Point',
                coordinates: [1,1]
            }
        }, assert.end);
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

    tape('query: 10000', function(assert) {
        c.geocode('10000', {}, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features[0].place_name, '10000, United States');
            assert.end();
        });
    });

    tape('query: 10000, language: es', function(assert) {
        c.geocode('10000', { language: 'es' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features[0].place_name, '10000, Estados Unidos');
            assert.end();
        });
    });

    tape('query: 10000, language: es, languageMode: strict', function(assert) {
        c.geocode('10000', { language: 'es', languageMode: 'strict' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features[0].place_name, '10000, Estados Unidos');
            assert.end();
        });
    });

    tape('query: 1,1', function(assert) {
        c.geocode('1,1', {}, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features[0].place_name, '10000, United States');
            assert.end();
        });
    });

    tape('query: 1,1, language: es', function(assert) {
        c.geocode('1,1', { language: 'es' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features[0].place_name, '10000, Estados Unidos');
            assert.end();
        });
    });

    tape('query: 1,1, language: es, languageMode: strict', function(assert) {
        c.geocode('1,1', { language: 'es', languageMode: 'strict' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features[0].place_name, '10000, Estados Unidos');
            assert.end();
        });
    });

    tape('teardown', function(assert) {
        context.getTile.cache.reset();
        assert.end();
    });
})();