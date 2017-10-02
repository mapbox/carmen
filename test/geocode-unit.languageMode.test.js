const tape = require('tape');
const Carmen = require('..');
const mem = require('../lib/api-mem');
const context = require('../lib/context');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

(() => {
    const conf = {
        country: new mem(
            {
                maxzoom: 6,
                geocoder_name: 'country',
                geocoder_languages: ['en', 'zh', 'sr', 'sr_Latn', 'hr']
            },
            () => {}
        )
    };
    const c = new Carmen(conf);

    tape('index country', t => {
        queueFeature(
            conf.country,
            {
                type: 'Feature',
                id: 1,
                properties: {
                    'carmen:center': [1, 1],
                    'carmen:text_zh': '中国',
                    'carmen:text_en': 'China',
                    'carmen:text': 'China'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [1, 1]
                }
            },
            t.end
        );
    });

    tape('index country', t => {
        queueFeature(
            conf.country,
            {
                id: 2,
                type: 'Feature',
                properties: {
                    'carmen:center': [1, 1],
                    'carmen:text_en': 'Canada',
                    'carmen:text': 'Canada'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [1, 1]
                }
            },
            t.end
        );
    });

    tape('index country', t => {
        queueFeature(
            conf.country,
            {
                id: 3,
                type: 'Feature',
                properties: {
                    'carmen:center': [1, 1],
                    'carmen:text': 'Cambodia'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [1, 1]
                }
            },
            t.end
        );
    });

    tape('build queued features', t => {
        const q = queue();
        Object.keys(conf).forEach(c => {
            q.defer(cb => {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });

    tape('query: c, language: zh, languageMode: strict', t => {
        c.geocode(
            'c',
            { language: 'zh', languageMode: 'strict' },
            (err, res) => {
                t.ifError(err);
                t.equal(
                    res.features.length,
                    1,
                    'filters features to just those with "zh" (x1)'
                );
                t.equal(res.features[0].place_name, '中国', '0 - China');
                t.end();
            }
        );
    });

    tape('query: c, language: en, languageMode: strict', t => {
        c.geocode(
            'c',
            { language: 'en', languageMode: 'strict' },
            (err, res) => {
                t.ifError(err);
                t.equal(
                    res.features.length,
                    2,
                    'filters features to just those with "en" (x2)'
                );
                t.equal(res.features[0].place_name, 'China', '0 - China');
                t.equal(res.features[1].place_name, 'Canada', '1 - Canada');
                t.end();
            }
        );
    });

    tape('query: c, languageMode: strict', t => {
        c.geocode('c', { languageMode: 'strict' }, (err, res) => {
            t.ifError(err);
            t.equal(
                res.features.length,
                3,
                'does nothing without language code'
            );
            t.equal(res.features[0].place_name, 'China', '0 - China');
            t.equal(res.features[1].place_name, 'Canada', '1 - Canada');
            t.equal(res.features[2].place_name, 'Cambodia', '2 - Cambodia');
            t.end();
        });
    });

    tape('query: c, language: en, languageMode: bogus', t => {
        c.geocode(
            'c',
            { language: 'en', languageMode: 'bogus' },
            (err, res) => {
                t.equal(
                    err && err.toString(),
                    "Error: 'bogus' is not a valid language mode"
                );
                t.end();
            }
        );
    });

    tape('query: 1,1, language: zh, languageMode: strict', t => {
        c.geocode(
            '1,1',
            {
                language: 'zh',
                languageMode: 'strict',
                types: ['country'],
                limit: 5
            },
            (err, res) => {
                t.ifError(err);
                t.equal(
                    res.features.length,
                    1,
                    'filters features to just those with "zh" (x1)'
                );
                t.equal(res.features[0].place_name, '中国', '0 - China');
                t.end();
            }
        );
    });

    tape('query: 1,1, language: en, languageMode: strict', t => {
        c.geocode(
            '1,1',
            {
                language: 'en',
                languageMode: 'strict',
                types: ['country'],
                limit: 5
            },
            (err, res) => {
                t.ifError(err);
                t.equal(
                    res.features.length,
                    2,
                    'filters features to just those with "en" (x2)'
                );
                t.equal(res.features[0].place_name, 'China', '0 - China');
                t.equal(res.features[1].place_name, 'Canada', '1 - Canada');
                t.end();
            }
        );
    });

    tape('query: 1,1, languageMode: strict', t => {
        c.geocode(
            '1,1',
            { languageMode: 'strict', types: ['country'], limit: 5 },
            (err, res) => {
                t.ifError(err);
                t.equal(
                    res.features.length,
                    3,
                    'does nothing without language code'
                );
                t.equal(res.features[0].place_name, 'China', '0 - China');
                t.equal(res.features[1].place_name, 'Canada', '1 - Canada');
                t.equal(res.features[2].place_name, 'Cambodia', '2 - Cambodia');
                t.end();
            }
        );
    });

    tape('query: 1,1, language: en, languageMode: bogus', t => {
        c.geocode(
            '1,1',
            {
                language: 'en',
                languageMode: 'bogus',
                types: ['country'],
                limit: 5
            },
            (err, res) => {
                t.equal(
                    err && err.toString(),
                    "Error: 'bogus' is not a valid language mode"
                );
                t.end();
            }
        );
    });

    tape('teardown', t => {
        context.getTile.cache.reset();
        t.end();
    });
})();

// Separate context (non-limit) test
(() => {
    const conf = {
        country: new mem(
            {
                maxzoom: 6,
                geocoder_name: 'country',
                geocoder_languages: ['en', 'zh', 'sr', 'sr_Latn', 'hr']
            },
            () => {}
        ),
        region: new mem(
            {
                maxzoom: 6,
                geocoder_name: 'region',
                geocoder_languages: ['en', 'zh', 'sr', 'sr_Latn', 'hr']
            },
            () => {}
        ),
        place: new mem(
            {
                maxzoom: 6,
                geocoder_name: 'place',
                geocoder_languages: ['en', 'zh', 'sr', 'sr_Latn', 'hr']
            },
            () => {}
        )
    };
    const c = new Carmen(conf);

    tape('index country', t => {
        queueFeature(
            conf.country,
            {
                type: 'Feature',
                id: 1,
                properties: {
                    'carmen:center': [1, 1],
                    'carmen:text_zh': '美国',
                    'carmen:text_en': 'United States',
                    'carmen:text': 'United States'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [1, 1]
                }
            },
            t.end
        );
    });

    tape('index region', t => {
        queueFeature(
            conf.region,
            {
                type: 'Feature',
                id: 1,
                properties: {
                    'carmen:center': [1, 1],
                    'carmen:text_en': 'Illinois',
                    'carmen:text': 'Illinois'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [1, 1]
                }
            },
            t.end
        );
    });

    tape('index place', t => {
        queueFeature(
            conf.place,
            {
                type: 'Feature',
                id: 1,
                properties: {
                    'carmen:center': [1, 1],
                    'carmen:text_zh': '芝加哥',
                    'carmen:text_en': 'Chicago',
                    'carmen:text': 'Chicago'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [1, 1]
                }
            },
            t.end
        );
    });

    tape('build queued features', t => {
        const q = queue();
        Object.keys(conf).forEach(c => {
            q.defer(cb => {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });

    tape('query: c, language: zh, languageMode: strict', t => {
        c.geocode(
            'c',
            { language: 'zh', languageMode: 'strict' },
            (err, res) => {
                t.ifError(err);
                t.equal(
                    res.features.length,
                    1,
                    'filters features to just those with "zh" (x1)'
                );
                t.equal(res.features[0].place_name, '芝加哥, 美国', '0 - Chicago');
                t.end();
            }
        );
    });

    tape('query: 1,1, language: zh, languageMode: strict', t => {
        c.geocode(
            '1,1',
            { language: 'zh', languageMode: 'strict' },
            (err, res) => {
                t.ifError(err);
                t.equal(
                    res.features.length,
                    2,
                    'filters features to just those with "zh" (x2)'
                );
                t.equal(res.features[0].place_name, '芝加哥, 美国', '0 - Chicago');
                t.equal(res.features[1].place_name, '美国', '1 - United States');
                t.end();
            }
        );
    });

    tape('query: 1,1, language: en, languageMode: strict', t => {
        c.geocode(
            '1,1',
            { language: 'en', languageMode: 'strict' },
            (err, res) => {
                t.ifError(err);
                t.equal(
                    res.features.length,
                    3,
                    'filters features to just those with "en" (x1)'
                );
                t.equal(
                    res.features[0].place_name,
                    'Chicago, Illinois, United States',
                    '0 - Chicago'
                );
                t.equal(
                    res.features[1].place_name,
                    'Illinois, United States',
                    '1 - Illinois'
                );
                t.equal(
                    res.features[2].place_name,
                    'United States',
                    '2 - United States'
                );
                t.end();
            }
        );
    });

    tape('query: 1,1, languageMode: strict', t => {
        c.geocode('1,1', { languageMode: 'strict' }, (err, res) => {
            t.ifError(err);
            t.equal(
                res.features.length,
                3,
                'filters features to just those with "en" (x1)'
            );
            t.equal(
                res.features[0].place_name,
                'Chicago, Illinois, United States',
                '0 - Chicago'
            );
            t.equal(
                res.features[1].place_name,
                'Illinois, United States',
                '1 - Illinois'
            );
            t.equal(
                res.features[2].place_name,
                'United States',
                '2 - United States'
            );
            t.end();
        });
    });

    tape('query: 1,1, language: en, languageMode: bogus', t => {
        c.geocode(
            '1,1',
            {
                language: 'en',
                languageMode: 'bogus',
                types: ['country'],
                limit: 5
            },
            (err, res) => {
                t.equal(
                    err && err.toString(),
                    "Error: 'bogus' is not a valid language mode"
                );
                t.end();
            }
        );
    });

    tape('teardown', t => {
        context.getTile.cache.reset();
        t.end();
    });
})();

// digraphic exclusion test
(() => {
    const conf = {
        country: new mem(
            {
                maxzoom: 6,
                geocoder_name: 'country',
                geocoder_languages: ['en', 'zh', 'sr', 'sr_Latn', 'hr']
            },
            () => {}
        ),
        region: new mem(
            {
                maxzoom: 6,
                geocoder_name: 'region',
                geocoder_languages: ['en', 'zh', 'sr', 'sr_Latn', 'hr']
            },
            () => {}
        ),
        place: new mem(
            {
                maxzoom: 6,
                geocoder_name: 'place',
                geocoder_languages: ['en', 'zh', 'sr', 'sr_Latn', 'hr']
            },
            () => {}
        )
    };
    const c = new Carmen(conf);

    tape('index country', t => {
        queueFeature(
            conf.country,
            {
                type: 'Feature',
                id: 1,
                properties: {
                    'carmen:center': [1, 1],
                    'carmen:text': 'United States',
                    'carmen:text_en': 'United States',
                    'carmen:text_sr': 'Сједињене Америчке Државе',
                    'carmen:text_sr_Latn': 'Sjedinjene Američke Države'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [1, 1]
                }
            },
            t.end
        );
    });

    tape('index region', t => {
        queueFeature(
            conf.region,
            {
                type: 'Feature',
                id: 1,
                properties: {
                    'carmen:center': [1, 1],
                    'carmen:text_hr': 'Teksas',
                    'carmen:text': 'Texas'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [1, 1]
                }
            },
            t.end
        );
    });

    tape('index place', t => {
        queueFeature(
            conf.place,
            {
                type: 'Feature',
                id: 1,
                properties: {
                    'carmen:center': [1, 1],
                    'carmen:text_sr': 'Парис',
                    'carmen:text': 'Paris'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [1, 1]
                }
            },
            t.end
        );
    });

    tape('index place', t => {
        queueFeature(
            conf.place,
            {
                type: 'Feature',
                id: 2,
                properties: {
                    'carmen:center': [1, 1],
                    'carmen:text_sr': 'Београд',
                    'carmen:text_hr': 'Beograd',
                    'carmen:text': 'Belgrade'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [1, 1]
                }
            },
            t.end
        );
    });

    tape('build queued features', t => {
        const q = queue();
        Object.keys(conf).forEach(c => {
            q.defer(cb => {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });

    tape('query: paris, language: sr-Latn, languageMode: strict', t => {
        c.geocode(
            'paris',
            { language: 'sr-Latn', languageMode: 'strict' },
            (err, res) => {
                t.ifError(err);
                t.equal(
                    res.features.length,
                    0,
                    'filters out mixed-script results'
                );
                t.end();
            }
        );
    });

    tape('query: belgrade, language: sr-Latn, languageMode: strict', t => {
        c.geocode(
            'belgrade',
            { language: 'sr-Latn', languageMode: 'strict' },
            (err, res) => {
                t.ifError(err);
                t.equal(res.features.length, 1, 'allows hr result');
                t.equal(res.features[0].language, 'hr', 'language code is hr');
                t.end();
            }
        );
    });

    tape('query: belgrade, language: hr, languageMode: strict', t => {
        c.geocode(
            'belgrade',
            { language: 'hr', languageMode: 'strict' },
            (err, res) => {
                t.ifError(err);
                t.equal(res.features.length, 1, 'allows hr result');
                t.equal(res.features[0].language, 'hr', 'language code is hr');
                t.equal(
                    res.features[0].place_name,
                    'Beograd, Teksas',
                    'language=hr excludes sr results'
                );
                t.end();
            }
        );
    });

    tape('teardown', t => {
        context.getTile.cache.reset();
        t.end();
    });
})();
