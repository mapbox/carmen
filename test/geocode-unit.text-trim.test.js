var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = {
        country: new mem({ maxzoom: 6 }, function() {}), 
        region: new mem({ maxzoom: 6, geocoder_format: '{region._name}, {country._name}'}, function() {}),
    };
    var c = new Carmen(conf);
    tape('index country', function(t) {
        addFeature(conf.country, {
            id:1,
            properties: {
                'carmen:text': '  Colombia\n',
                'carmen:text_en': ' Colombia\n',
                'carmen:text_zh': ' 哥伦比亚\n',
                'carmen:center': [0,0]
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        }, t.end);
    });
    tape('index region', function(t) {
        addFeature(conf.region, {
            id:1,
            properties: {
                'carmen:text': ' Bogotá ',
                'carmen:text_en': ' Bogota ',
                'carmen:text_zh': ' 波哥大 ',
                'carmen:center': [0,0]
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        }, t.end);
    });
    tape('trims text (forward)', function(t) {
        c.geocode('Bogota', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Bogotá, Colombia');
            t.equals(res.features[0].text, 'Bogotá');
            t.equals(res.features[0].context[0].text, 'Colombia');
            t.end();
        });
    });
    tape('trims text (reverse)', function(t) {
        c.geocode('0,0', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Bogotá, Colombia');
            t.equals(res.features[0].text, 'Bogotá');
            t.equals(res.features[0].context[0].text, 'Colombia');
            t.end();
        });
    });
    tape('trims text (forward, ?language=en)', function(t) {
        c.geocode('Bogota', { limit_verify: 1, language: 'en' }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Bogota, Colombia');
            t.equals(res.features[0].text, 'Bogota');
            t.equals(res.features[0].context[0].text, 'Colombia');
            t.end();
        });
    });
    tape('trims text (reverse, ?language=en)', function(t) {
        c.geocode('0,0', { limit_verify: 1, language: 'en' }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Bogota, Colombia');
            t.equals(res.features[0].text, 'Bogota');
            t.equals(res.features[0].context[0].text, 'Colombia');
            t.end();
        });
    });
    tape('trims text (forward, ?language=zh)', function(t) {
        c.geocode('Bogota', { limit_verify: 1, language: 'zh' }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '波哥大, 哥伦比亚');
            t.equals(res.features[0].text, '波哥大');
            t.equals(res.features[0].context[0].text, '哥伦比亚');
            t.end();
        });
    });
    tape('trims text (reverse, ?language=en)', function(t) {
        c.geocode('0,0', { limit_verify: 1, language: 'zh' }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '波哥大, 哥伦比亚');
            t.equals(res.features[0].text, '波哥大');
            t.equals(res.features[0].context[0].text, '哥伦比亚');
            t.end();
        });
    });
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
