//Ensure that results that have equal relev in phrasematch
//are matched against the 0.5 relev bar instead of 0.75

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var mem = require('../lib/api-mem');
var context = require('../lib/context');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = {
        country: new mem({ maxzoom:6, geocoder_name: 'country' }, function() {}),
        region: new mem({ maxzoom: 6, geocoder_name: 'region',
            geocoder_format_ru: '{country._name}, {region._name}',
            geocoder_format_zh: '{country._name}{region._name}',
            geocoder_format_es: '{region._name} {region._name} {country._name}'
        }, function() {}),
        place: new mem({ maxzoom:6, geocoder_name: 'place', geocoder_format_eo: '{country._name} {place._name} {region._name}' }, function() {}),
        place2: new mem({ maxzoom:6, geocoder_name: 'place', geocoder_format_zh: '{country._name}{region._name}{place._name}' }, function() {})
    };
    var c = new Carmen(conf);

    tape('index country', function(t) {
        var country = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text_es': null,
                'carmen:text_ru': 'Российская Федерация',
                'carmen:text': 'Russian Federation, Rossiyskaya Federatsiya'
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

    tape('index city', function(t) {
        var place = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text_ru': 'Санкт-Петербу́рг',
                'carmen:text': 'Saint Petersburg, St Petersburg'
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
        addFeature(conf.place, place, t.end);
    });

    tape('russia => Russian Federation', function(t) {
        c.geocode('russia', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Russian Federation');
            t.deepEqual(res.features[0].id, 'country.1');
            t.end();
        });
    });

    tape('Rossiyskaya => Russian Federation', function(t) {
        c.geocode('Rossiyskaya', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Russian Federation');
            t.deepEqual(res.features[0].id, 'country.1');
            t.end();
        });
    });

    tape('Rossiyskaya => Российская Федерация - {language: "ru"}', function(t) {
        c.geocode('Rossiyskaya', { limit_verify:1, language: 'ru' }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Российская Федерация');
            t.deepEqual(res.features[0].id, 'country.1');
            t.end();
        });
    });

    // 'fake' is not a valid language code
    tape('Rossiyskaya => Russian Federation - {language: "fake"}', function(t) {
        c.geocode('Rossiyskaya', { limit_verify:1, language: 'fake' }, function(err, res) {
            t.ok(err);
            t.deepEqual(err.message, '\'fake\' is not a valid language code');
            t.notOk(res);
            t.end();
        });
    });

    // no value for 'es'
    tape('Rossiyskaya => Russian Federation - {language: "es"}', function(t) {
        c.geocode('Rossiyskaya', { limit_verify:1, language: 'es' }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Russian Federation');
            t.deepEqual(res.features[0].id, 'country.1');
            t.end();
        });
    });

    // no value for 'fr'
    tape('Rossiyskaya => Russian Federation - {language: "fr"}', function(t) {
        c.geocode('Rossiyskaya', { limit_verify:1, language: 'fr' }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Russian Federation');
            t.deepEqual(res.features[0].id, 'country.1');
            t.end();
        });
    });

    // also 'translate' the context when available
    tape('St Petersburg => Санкт-Петербу́рг, Российская Федерация - {language: "ru"}', function(t) {
        c.geocode('St Petersburg', { language: 'ru'}, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Санкт-Петербу́рг, Российская Федерация');
            t.deepEqual(res.features[0].id, 'place.1');
            t.deepEqual(res.features[0].context[0].text, 'Российская Федерация');
            t.end();
        });
    });

    // no value for 'fr'
    tape('St Petersberg => Saint Petersburg - {language: "fr"}', function(t) {
        c.geocode('St Petersburg', { limit_verify:1, language: 'fr' }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Saint Petersburg, Russian Federation');
            t.deepEqual(res.features[0].id, 'place.1');
            t.deepEqual(res.features[0].context[0].text, 'Russian Federation');
            t.end();
        });
    });

    tape('index region', function(t) {
        var region = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text_zh': '西北部联邦管区',
                'carmen:text_ru': 'Северо-Западный федеральный округ',
                'carmen:text': 'Northwestern Federal District,  Severo-Zapadny federalny okrug',
                'carmen:text_eo': '!!!!'
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
        addFeature(conf.region, region, t.end);
    });

    // custom response format template
    tape('Northwestern Federal Distrct => Российская Федерация, Северо-Западный федеральный округ - {language: "ru"}', function(t) {
        c.geocode('Northwestern', { limit_verify:1, language: 'ru' }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Российская Федерация, Северо-Западный федеральный округ');
            t.deepEqual(res.features[0].id, 'region.1');
            t.deepEqual(res.features[0].context[0].text, 'Российская Федерация');
            t.end();
        });
    });

    // if the response and the context do not have values in the language queried,
    // but do have a template for that language, use the default template.
    tape('Northwestern Federal Distrct => Российская Федерация, Северо-Западный федеральный округ - {language: "ru"}', function(t) {
        c.geocode('Northwestern', { limit_verify:1, language: 'es' }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Northwestern Federal District, Russian Federation');
            t.deepEqual(res.features[0].id, 'region.1');
            t.deepEqual(res.features[0].context[0].text, 'Russian Federation');
            t.end();
        });
    });

    // if the first response does not have values in the language queried,
    // but does have a template for that language, and there is a value in that language
    // in the context, use the localized template.
    tape('Northwestern Federal Distrct => Российская Федерация, Северо-Западный федеральный округ - {language: "ru"}', function(t) {
        c.geocode('Saint Petersburg', { limit_verify:1, language: 'eo' }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Russian Federation Saint Petersburg !!!!');
            t.deepEqual(res.features[0].id, 'place.1');
            t.deepEqual(res.features[0].context[0].text, '!!!!');
            t.end();
        });
    });

    tape('index place2', function(t) {
        var place = {
            type: 'Feature',
            properties: {
                'carmen:center': [0,0],
                'carmen:zxy': ['6/31/31'],
                'carmen:text': 'Shenzhen',
                'carmen:text_zh': '深圳市'
            },
            id: 2,
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [[[-5.625,0],[-5.625,5.615985819155337],[0,5.615985819155337],[0,0],[-5.625,0]]]
                ]
            },
            bbox: [-5.625,0,0,5.615985819155337]
        };
        addFeature(conf.place2, place, t.end);
    });

    tape('西北部联邦管区 => Russian Federation西北部联邦管区', function(t) {
        c.geocode('西北部联邦管区', { limit_verify:1, language: 'zh' }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Russian Federation西北部联邦管区');
            t.deepEqual(res.features[0].id, 'region.1');
            t.deepEqual(res.features[0].context[0].text, 'Russian Federation');
            t.end();
        });
    });

    tape('Shenzhen => Shenzhen, Northwestern Federal District, Russian Federation', function(t) {
        c.geocode('Shenzhen', { limit_verify:1, language: 'en' }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Shenzhen, Northwestern Federal District, Russian Federation');
            t.deepEqual(res.features[0].id, 'place.2');
            t.deepEqual(res.features[0].context[0].text, 'Northwestern Federal District');
            t.end();
        });
    });

    tape('Shenzhen => Russian Federation西北部联邦管区深圳市', function(t) {
        c.geocode('Shenzhen', { limit_verify:1, language: 'zh' }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Russian Federation西北部联邦管区深圳市');
            t.deepEqual(res.features[0].id, 'place.2');
            t.deepEqual(res.features[0].context[0].text, '西北部联邦管区');
            t.end();
        });
    });

    tape('0,0 => Saint Petersburg, Northwestern Federal District, Russian Federation', function(t) {
        c.geocode('0,0', { limit_verify:1, language: 'en' }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Saint Petersburg, Northwestern Federal District, Russian Federation');
            t.deepEqual(res.features[0].id, 'place.1');
            t.deepEqual(res.features[0].context[0].text, 'Northwestern Federal District');
            t.end();
        });
    });

    // if the most granular result (St Petersburg) doesn't have a template for the language,
    // use the default. Templates can go from specific -> general but not the other way around.
    tape('0,0 => Saint Petersburg, 西北部联邦管区, Russian Federation - {language: "zh"}', function(t) {
        c.geocode('0,0', { limit_verify:1, language: 'zh' }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Saint Petersburg, 西北部联邦管区, Russian Federation');
            t.deepEqual(res.features[0].id, 'place.1');
            t.deepEqual(res.features[0].context[0].text, '西北部联邦管区');
            t.end();
        });
    });

    // if the most granular result (St Petersburg) doesn't have a template for the language,
    // use the default. Templates can go from specific -> general but not the other way around.
    tape('Saint Petersburg => Saint Petersburg, 西北部联邦管区, Russian Federation - {language: "zh"}', function(t) {
        c.geocode('Saint Petersburg', { limit_verify:1, language: 'zh' }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Saint Petersburg, 西北部联邦管区, Russian Federation');
            t.deepEqual(res.features[0].id, 'place.1');
            t.deepEqual(res.features[0].context[0].text, '西北部联邦管区');
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
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
