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
        country: new mem({ maxzoom:6, geocoder_name: 'country' }, function() {})
    };
    var c = new Carmen(conf);

    tape('index country', function(assert) {
        queueFeature(conf.country, {
            type: 'Feature',
            id: 1,
            properties: {
                'carmen:center': [1,1],
                'carmen:text_zh': '中国',
                'carmen:text_en': 'China',
                'carmen:text': 'China'
            },
            geometry: {
                type: 'Point',
                coordinates: [1,1]
            }
        }, assert.end);
    });

    tape('index country', function(assert) {
        queueFeature(conf.country, {
            id: 2,
            type: 'Feature',
            properties: {
                'carmen:center': [1,1],
                'carmen:text_en': 'Canada',
                'carmen:text': 'Canada'
            },
            geometry: {
                type: 'Point',
                coordinates: [1,1]
            }
        }, assert.end);
    });

    tape('index country', function(assert) {
        queueFeature(conf.country, {
            id: 3,
            type: 'Feature',
            properties: {
                'carmen:center': [1,1],
                'carmen:text': 'Cambodia'
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

    tape('query: c, language: zh, languageMode: strict', function(assert) {
        c.geocode('c', { language: 'zh', languageMode: 'strict' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 1, 'filters features to just those with "zh" (x1)');
            assert.equal(res.features[0].place_name, '中国', '0 - China');
            assert.end();
        });
    });

    tape('query: c, language: en, languageMode: strict', function(assert) {
        c.geocode('c', { language: 'en', languageMode: 'strict' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 2, 'filters features to just those with "en" (x2)');
            assert.equal(res.features[0].place_name, 'China', '0 - China');
            assert.equal(res.features[1].place_name, 'Canada', '1 - Canada');
            assert.end();
        });
    });

    tape('query: c, languageMode: strict', function(assert) {
        c.geocode('c', { languageMode: 'strict' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 3, 'does nothing without language code');
            assert.equal(res.features[0].place_name, 'China', '0 - China');
            assert.equal(res.features[1].place_name, 'Canada', '1 - Canada');
            assert.equal(res.features[2].place_name, 'Cambodia', '2 - Cambodia');
            assert.end();
        });
    });

    tape('query: c, language: en, languageMode: bogus', function(assert) {
        c.geocode('c', { language: 'en', languageMode: 'bogus' }, function(err, res) {
            assert.equal(err && err.toString(), 'Error: \'bogus\' is not a valid language mode');
            assert.end();
        });
    });

    tape('query: 1,1, language: zh, languageMode: strict', function(assert) {
        c.geocode('1,1', { language: 'zh', languageMode: 'strict', types: ['country'], limit: 5 }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 1, 'filters features to just those with "zh" (x1)');
            assert.equal(res.features[0].place_name, '中国', '0 - China');
            assert.end();
        });
    });

    tape('query: 1,1, language: en, languageMode: strict', function(assert) {
        c.geocode('1,1', { language: 'en', languageMode: 'strict', types: ['country'], limit: 5 }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 2, 'filters features to just those with "en" (x2)');
            assert.equal(res.features[0].place_name, 'China', '0 - China');
            assert.equal(res.features[1].place_name, 'Canada', '1 - Canada');
            assert.end();
        });
    });

    tape('query: 1,1, languageMode: strict', function(assert) {
        c.geocode('1,1', { languageMode: 'strict', types: ['country'], limit: 5 }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 3, 'does nothing without language code');
            assert.equal(res.features[0].place_name, 'China', '0 - China');
            assert.equal(res.features[1].place_name, 'Canada', '1 - Canada');
            assert.equal(res.features[2].place_name, 'Cambodia', '2 - Cambodia');
            assert.end();
        });
    });

    tape('query: 1,1, language: en, languageMode: bogus', function(assert) {
        c.geocode('1,1', { language: 'en', languageMode: 'bogus', types: ['country'], limit: 5 }, function(err, res) {
            assert.equal(err && err.toString(), 'Error: \'bogus\' is not a valid language mode');
            assert.end();
        });
    });

    tape('teardown', function(assert) {
        context.getTile.cache.reset();
        assert.end();
    });
})();

// Separate context (non-limit) test
(function() {
    var conf = {
        country: new mem({ maxzoom:6, geocoder_name: 'country' }, function() {}),
        region: new mem({ maxzoom:6, geocoder_name: 'region' }, function() {}),
        place: new mem({ maxzoom:6, geocoder_name: 'place' }, function() {})
    };
    var c = new Carmen(conf);

    tape('index country', function(assert) {
        queueFeature(conf.country, {
            type: 'Feature',
            id: 1,
            properties: {
                'carmen:center': [1,1],
                'carmen:text_zh': '美国',
                'carmen:text_en': 'United States',
                'carmen:text': 'United States'
            },
            geometry: {
                type: 'Point',
                coordinates: [1,1]
            }
        }, assert.end);
    });

    tape('index region', function(assert) {
        queueFeature(conf.region, {
            type: 'Feature',
            id: 1,
            properties: {
                'carmen:center': [1,1],
                'carmen:text_en': 'Illinois',
                'carmen:text': 'Illinois'
            },
            geometry: {
                type: 'Point',
                coordinates: [1,1]
            }
        }, assert.end);
    });

    tape('index place', function(assert) {
        queueFeature(conf.place, {
            type: 'Feature',
            id: 1,
            properties: {
                'carmen:center': [1,1],
                'carmen:text_zh': '芝加哥',
                'carmen:text_en': 'Chicago',
                'carmen:text': 'Chicago'
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


    tape('query: c, language: zh, languageMode: strict', function(assert) {
        c.geocode('c', { language: 'zh', languageMode: 'strict' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 1, 'filters features to just those with "zh" (x1)');
            assert.equal(res.features[0].place_name, '芝加哥, 美国', '0 - Chicago');
            assert.end();
        });
    });

    tape('query: 1,1, language: zh, languageMode: strict', function(assert) {
        c.geocode('1,1', { language: 'zh', languageMode: 'strict' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 2, 'filters features to just those with "zh" (x2)');
            assert.equal(res.features[0].place_name, '芝加哥, 美国', '0 - Chicago');
            assert.equal(res.features[1].place_name, '美国', '1 - United States');
            assert.end();
        });
    });


    tape('query: 1,1, language: en, languageMode: strict', function(assert) {
        c.geocode('1,1', { language: 'en', languageMode: 'strict' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 3, 'filters features to just those with "en" (x1)');
            assert.equal(res.features[0].place_name, 'Chicago, Illinois, United States', '0 - Chicago');
            assert.equal(res.features[1].place_name, 'Illinois, United States', '1 - Illinois');
            assert.equal(res.features[2].place_name, 'United States', '2 - United States');
            assert.end();
        });
    });

    tape('query: 1,1, languageMode: strict', function(assert) {
        c.geocode('1,1', { languageMode: 'strict' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 3, 'filters features to just those with "en" (x1)');
            assert.equal(res.features[0].place_name, 'Chicago, Illinois, United States', '0 - Chicago');
            assert.equal(res.features[1].place_name, 'Illinois, United States', '1 - Illinois');
            assert.equal(res.features[2].place_name, 'United States', '2 - United States');
            assert.end();
        });
    });

    tape('query: 1,1, language: en, languageMode: bogus', function(assert) {
        c.geocode('1,1', { language: 'en', languageMode: 'bogus', types: ['country'], limit: 5 }, function(err, res) {
            assert.equal(err && err.toString(), 'Error: \'bogus\' is not a valid language mode');
            assert.end();
        });
    });

    tape('teardown', function(assert) {
        context.getTile.cache.reset();
        assert.end();
    });
})();

// digraphic exclusion test
(function() {
    var conf = {
        country: new mem({ maxzoom:6, geocoder_name: 'country' }, function() {}),
        region: new mem({ maxzoom:6, geocoder_name: 'region' }, function() {}),
        place: new mem({ maxzoom:6, geocoder_name: 'place' }, function() {})
    };
    var c = new Carmen(conf);

    tape('index country', function(assert) {
        queueFeature(conf.country, {
            type: 'Feature',
            id: 1,
            properties: {
                'carmen:center': [1,1],
                'carmen:text': 'United States',
                'carmen:text_en': 'United States',
                'carmen:text_sr': 'Сједињене Америчке Државе',
                'carmen:text_sr_Latn': 'Sjedinjene Američke Države'
            },
            geometry: {
                type: 'Point',
                coordinates: [1,1]
            }
        }, assert.end);
    });

    tape('index region', function(assert) {
        queueFeature(conf.region, {
            type: 'Feature',
            id: 1,
            properties: {
                'carmen:center': [1,1],
                'carmen:text_hr': 'Teksas',
                'carmen:text': 'Texas'
            },
            geometry: {
                type: 'Point',
                coordinates: [1,1]
            }
        }, assert.end);
    });

    tape('index place', function(assert) {
        queueFeature(conf.place, {
            type: 'Feature',
            id: 1,
            properties: {
                'carmen:center': [1,1],
                'carmen:text_sr': 'Парис',
                'carmen:text': 'Paris'
            },
            geometry: {
                type: 'Point',
                coordinates: [1,1]
            }
        }, assert.end);
    });

    tape('index place', function(assert) {
        queueFeature(conf.place, {
            type: 'Feature',
            id: 2,
            properties: {
                'carmen:center': [1,1],
                'carmen:text_sr': 'Београд',
                'carmen:text_hr': 'Beograd',
                'carmen:text': 'Belgrade'
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


    tape('query: paris, language: sr-Latn, languageMode: strict', function(assert) {
        c.geocode('paris', { language: 'sr-Latn', languageMode: 'strict' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 0, 'filters out mixed-script results');
            assert.end();
        });
    });

    tape('query: belgrade, language: sr-Latn, languageMode: strict', function(assert) {
        c.geocode('belgrade', { language: 'sr-Latn', languageMode: 'strict' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 1, 'allows hr result');
            assert.equal(res.features[0].language, 'hr', 'language code is hr');
            assert.end();
        });
    });

    tape('query: belgrade, language: hr, languageMode: strict', function(assert) {
        c.geocode('belgrade', { language: 'hr', languageMode: 'strict' }, function(err, res) {
            assert.ifError(err);
            assert.equal(res.features.length, 1, 'allows hr result');
            assert.equal(res.features[0].language, 'hr', 'language code is hr');
            assert.equal(res.features[0].place_name, 'Beograd, Teksas', 'language=hr excludes sr results');
            assert.end();
        });
    });

    tape('teardown', function(assert) {
        context.getTile.cache.reset();
        assert.end();
    });
})();