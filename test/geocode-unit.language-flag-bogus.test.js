//Ensure that results that have equal relev in phrasematch
//are matched against the 0.5 relev bar instead of 0.75

var tape = require('tape');
var Carmen = require('..');
var mem = require('../lib/api-mem');
var context = require('../lib/context');
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = {
        country: new mem({ maxzoom:6, geocoder_name: 'country' }, function() {})
    };
    var c = new Carmen(conf);

    tape('index country', function(t) {
        var country = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text_es': 'Estados Unidos',
                'carmen:text_en': 'United States',
                'carmen:text': 'United States'
            },
            id: 1,
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [[[0,-5.615985819155337],[0,0],[5.625,0],[5.625,-5.615985819155337],[0,-5.615985819155337]]]
                ]
            },
            bbox: [0,-5.615985819155337,5.625,0]
        };
        addFeature(conf.country, country, t.end);
    });

    tape('0,0 ?language=en', function(t) {
        c.geocode('0,0', { language:'en', limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'United States');
            t.equal(res.features[0].id, 'country.1');
            t.equal(res.features[0].language, 'en', 'language set to "en"');
            t.end();
        });
    });

    tape('0,0 ?language=es', function(t) {
        c.geocode('0,0', { language:'es', limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'Estados Unidos');
            t.equal(res.features[0].id, 'country.1');
            t.equal(res.features[0].language, 'es', 'language set to "es"');
            t.end();
        });
    });

    tape('0,0 ?language=es-XX', function(t) {
        c.geocode('0,0', { language:'es-XX', limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'Estados Unidos');
            t.equal(res.features[0].id, 'country.1');
            t.equal(res.features[0].language, 'es', 'language set to "es"');
            t.end();
        });
    });

    tape('0,0 ?language=en-XX', function(t) {
        c.geocode('0,0', { language:'en-XX', limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'United States');
            t.equal(res.features[0].id, 'country.1');
            t.equal(res.features[0].language, 'en', 'language set to "en"');
            t.end();
        });
    });

})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
