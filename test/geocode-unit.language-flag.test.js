//Ensure that results that have equal relev in phrasematch
//are matched against the 0.5 relev bar instead of 0.75

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
                geocoder_languages: ['es', 'ru']
            },
            () => {}
        ),
        region: new mem(
            {
                maxzoom: 6,
                geocoder_name: 'region',
                geocoder_format_ru: '{country._name}, {region._name}',
                geocoder_format_zh: '{country._name}{region._name}',
                geocoder_format_es:
                    '{region._name} {region._name} {country._name}',
                geocoder_languages: ['zh', 'zh_Hant', 'eo', 'ru']
            },
            () => {}
        ),
        place: new mem(
            {
                maxzoom: 6,
                geocoder_name: 'place',
                geocoder_format_eo:
                    '{country._name} {place._name} {region._name}',
                geocoder_languages: ['ru']
            },
            () => {}
        ),
        place2: new mem(
            {
                maxzoom: 6,
                geocoder_name: 'place',
                geocoder_format_zh:
                    '{country._name}{region._name}{place._name}',
                geocoder_languages: ['zh']
            },
            () => {}
        )
    };
    const c = new Carmen(conf);

    tape('index country', t => {
        let country = {
            type: 'Feature',
            properties: {
                'carmen:center': [0, 0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text_es': null,
                'carmen:text_ru': 'Российская Федерация',
                'carmen:text_tr': 'Rusya',
                'carmen:text': 'Russian Federation,Rossiyskaya Federatsiya'
            },
            id: 1,
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [
                        [
                            [0, -5.615985819155337],
                            [0, 0],
                            [5.625, 0],
                            [5.625, -5.615985819155337],
                            [0, -5.615985819155337]
                        ]
                    ]
                ]
            },
            bbox: [0, -5.615985819155337, 5.625, 0]
        };
        queueFeature(conf.country, country, t.end);
    });

    tape('index city', t => {
        let place = {
            type: 'Feature',
            properties: {
                'carmen:center': [0, 0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text_ru': 'Санкт-Петербу́рг',
                'carmen:text': 'Saint Petersburg,St Petersburg'
            },
            id: 1,
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [
                        [
                            [0, -5.615985819155337],
                            [0, 0],
                            [5.625, 0],
                            [5.625, -5.615985819155337],
                            [0, -5.615985819155337]
                        ]
                    ]
                ]
            },
            bbox: [0, -5.615985819155337, 5.625, 0]
        };
        queueFeature(conf.place, place, t.end);
    });

    tape('index region', t => {
        let region = {
            type: 'Feature',
            properties: {
                'carmen:center': [0, 0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text_zh': '西北部联邦管区',
                'carmen:text_zh_Hant': '西北部聯邦管區',
                'carmen:text_ru': 'Северо-Западный федеральный округ',
                'carmen:text':
                    'Northwestern Federal District,  Severo-Zapadny federalny okrug',
                'carmen:text_eo': '!!!!'
            },
            id: 1,
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [
                        [
                            [0, -5.615985819155337],
                            [0, 0],
                            [5.625, 0],
                            [5.625, -5.615985819155337],
                            [0, -5.615985819155337]
                        ]
                    ]
                ]
            },
            bbox: [0, -5.615985819155337, 5.625, 0]
        };
        queueFeature(conf.region, region, t.end);
    });

    tape('index place2', t => {
        let place = {
            type: 'Feature',
            properties: {
                'carmen:center': [0, 0],
                'carmen:zxy': ['6/31/31'],
                'carmen:text': 'Shenzhen',
                'carmen:text_zh': '深圳市'
            },
            id: 2,
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [
                        [
                            [-5.625, 0],
                            [-5.625, 5.615985819155337],
                            [0, 5.615985819155337],
                            [0, 0],
                            [-5.625, 0]
                        ]
                    ]
                ]
            },
            bbox: [-5.625, 0, 0, 5.615985819155337]
        };
        queueFeature(conf.place2, place, t.end);
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

    tape('russia => Russian Federation', t => {
        c.geocode('russia', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'Russian Federation');
            t.equal(res.features[0].id, 'country.1');
            t.equal(
                res.features[0].language,
                undefined,
                'language not set on default text'
            );
            t.end();
        });
    });

    tape('Severo-Za ==> Northwestern Federal District', t => {
        c.geocode('Severo-Za', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equal(
                res.features[0].place_name,
                'Northwestern Federal District, Russian Federation'
            );
            t.equal(res.features[0].id, 'region.1');
            t.equal(
                res.features[0].language,
                undefined,
                'language not set on default text'
            );
            t.equal(
                res.features[0].matching_place_name,
                'Severo-Zapadny federalny okrug, Russian Federation',
                'synonym is included in matching_place_name'
            );
            t.end();
        });
    });

    tape('Rossiyskaya ==> Russian Federation', t => {
        c.geocode('Rossiyskaya', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'Russian Federation');
            t.equal(res.features[0].id, 'country.1');
            t.equal(
                res.features[0].language,
                undefined,
                'language not set on default text'
            );
            t.equal(
                res.features[0].matching_place_name,
                'Rossiyskaya Federatsiya',
                'synonym is included in matching_place_name'
            );
            t.end();
        });
    });

    tape('Rossiyskaya Federatsiya => Russian Federation', t => {
        c.geocode(
            'Rossiyskaya Federatsiya',
            { limit_verify: 1 },
            (err, res) => {
                t.ifError(err);
                t.equal(res.features[0].place_name, 'Russian Federation');
                t.equal(res.features[0].id, 'country.1');
                t.equal(
                    res.features[0].language,
                    undefined,
                    'language not set'
                );
                t.end();
            }
        );
    });

    tape(
        'Rossiyskaya Federatsiya => Российская Федерация - {language: "ru"}',
        t => {
            c.geocode(
                'Rossiyskaya Federatsiya',
                { limit_verify: 1, language: 'ru' },
                (err, res) => {
                    t.ifError(err);
                    t.equal(res.features[0].place_name, 'Российская Федерация');
                    t.equal(res.features[0].id, 'country.1');
                    t.equal(res.features[0].language, 'ru', 'language=ru');
                    t.end();
                }
            );
        }
    );

    // test that guessing works right
    tape(
        'Rossiyskaya Federatsiya => Российская Федерация - {language: "ru-RU"}',
        t => {
            c.geocode(
                'Rossiyskaya Federatsiya',
                { limit_verify: 1, language: 'ru-RU' },
                (err, res) => {
                    t.ifError(err);
                    t.equal(res.features[0].place_name, 'Российская Федерация');
                    t.equal(res.features[0].id, 'country.1');
                    t.equal(res.features[0].language, 'ru', 'language=ru');
                    t.end();
                }
            );
        }
    );

    // 'fake' is not a valid language code
    tape(
        'Rossiyskaya Federatsiya => Russian Federation - {language: "fake"}',
        t => {
            c.geocode(
                'Rossiyskaya Federatsiya',
                { limit_verify: 1, language: 'fake' },
                (err, res) => {
                    t.ok(err);
                    t.equal(err.message, "'fake' is not a valid language code");
                    t.notOk(res);
                    t.end();
                }
            );
        }
    );

    // no value for 'es'
    tape(
        'Rossiyskaya Federatsiya => Russian Federation - {language: "es"}',
        t => {
            c.geocode(
                'Rossiyskaya Federatsiya',
                { limit_verify: 1, language: 'es' },
                (err, res) => {
                    t.ifError(err);
                    t.equal(res.features[0].place_name, 'Russian Federation');
                    t.equal(res.features[0].id, 'country.1');
                    t.equal(
                        res.features[0].language,
                        undefined,
                        'language not set on fall back to default'
                    );
                    t.end();
                }
            );
        }
    );

    // no value for 'fr'
    tape(
        'Rossiyskaya Federatsiya => Russian Federation - {language: "fr"}',
        t => {
            c.geocode(
                'Rossiyskaya Federatsiya',
                { limit_verify: 1, language: 'fr' },
                (err, res) => {
                    t.ifError(err);
                    t.equal(res.features[0].place_name, 'Russian Federation');
                    t.equal(res.features[0].id, 'country.1');
                    t.equal(
                        res.features[0].language,
                        undefined,
                        'language not set on fall back to default'
                    );
                    t.end();
                }
            );
        }
    );

    // fallback to tr on az
    tape('Rossiyskaya => Russian Federation - {language: "az"}', t => {
        c.geocode(
            'Russian Federation',
            { limit_verify: 1, language: 'az' },
            (err, res) => {
                t.ifError(err);
                t.equal(res.features[0].place_name, 'Rusya');
                t.equal(res.features[0].id, 'country.1');
                t.equal(res.features[0].language, 'tr');
                t.end();
            }
        );
    });

    // fallback to ru on bg-nonexistent
    tape(
        'Rossiyskaya => Russian Federation - {language: "bg-nonexistent"}',
        t => {
            c.geocode(
                'Russian Federation',
                { limit_verify: 1, language: 'bg-nonexistent' },
                (err, res) => {
                    t.ifError(err);
                    t.equal(res.features[0].place_name, 'Российская Федерация');
                    t.equal(res.features[0].id, 'country.1');
                    t.equal(res.features[0].language, 'ru');
                    t.end();
                }
            );
        }
    );

    // also 'translate' the context when available
    tape(
        'St Petersburg => Санкт-Петербу́рг, Северо-Западный федеральный округ, Российская Федерация - {language: "ru"}',
        t => {
            c.geocode('St Petersburg', { language: 'ru' }, (err, res) => {
                t.ifError(err);
                t.equal(
                    res.features[0].place_name,
                    'Санкт-Петербу́рг, Северо-Западный федеральный округ, Российская Федерация'
                );
                t.equal(res.features[0].id, 'place.1');
                t.equal(
                    res.features[0].context[0].text,
                    'Северо-Западный федеральный округ'
                );
                t.equal(
                    res.features[0].context[1].text,
                    'Российская Федерация'
                );
                t.equal(res.features[0].context[0].language, 'ru');
                t.equal(res.features[0].context[1].language, 'ru');
                t.end();
            });
        }
    );

    // test when hitting multiple indexes
    tape(
        'St Petersburg, Russia => Санкт-Петербу́рг, Северо-Западный федеральный округ, Российская Федерация - {language: "ru"}',
        t => {
            c.geocode(
                'St Petersburg, Russia',
                { language: 'ru' },
                (err, res) => {
                    t.ifError(err);
                    t.equal(
                        res.features[0].place_name,
                        'Санкт-Петербу́рг, Северо-Западный федеральный округ, Российская Федерация'
                    );
                    t.equal(res.features[0].id, 'place.1');
                    t.equal(
                        res.features[0].context[0].text,
                        'Северо-Западный федеральный округ'
                    );
                    t.equal(
                        res.features[0].context[1].text,
                        'Российская Федерация'
                    );
                    t.equal(res.features[0].context[0].language, 'ru');
                    t.equal(res.features[0].context[1].language, 'ru');
                    t.end();
                }
            );
        }
    );

    // no value for 'fr'
    tape('St Petersberg => Saint Petersburg - {language: "fr"}', t => {
        c.geocode(
            'St Petersburg',
            { limit_verify: 1, language: 'fr' },
            (err, res) => {
                t.ifError(err);
                t.equal(
                    res.features[0].place_name,
                    'Saint Petersburg, Northwestern Federal District, Russian Federation'
                );
                t.equal(res.features[0].id, 'place.1');
                t.equal(
                    res.features[0].context[0].text,
                    'Northwestern Federal District'
                );
                t.equal(res.features[0].context[1].text, 'Russian Federation');
                t.equal(res.features[0].context[0].language, undefined);
                t.equal(res.features[0].context[1].language, undefined);
                t.end();
            }
        );
    });

    // custom response format template
    tape(
        'Northwestern Federal District => Российская Федерация, Северо-Западный федеральный округ - {language: "ru"}',
        t => {
            c.geocode(
                'Northwestern',
                { limit_verify: 1, language: 'ru' },
                (err, res) => {
                    t.ifError(err);
                    t.deepEqual(
                        res.features[0].place_name,
                        'Российская Федерация, Северо-Западный федеральный округ'
                    );
                    t.deepEqual(res.features[0].id, 'region.1');
                    t.deepEqual(
                        res.features[0].context[0].text,
                        'Российская Федерация'
                    );
                    t.end();
                }
            );
        }
    );

    // custom response format template -- should guess both correct language and correct template
    tape(
        'Northwestern Federal District => Российская Федерация, Северо-Западный федеральный округ - {language: "ru-RU"}',
        t => {
            c.geocode(
                'Northwestern',
                { limit_verify: 1, language: 'ru-RU' },
                (err, res) => {
                    t.ifError(err);
                    t.deepEqual(
                        res.features[0].place_name,
                        'Российская Федерация, Северо-Западный федеральный округ'
                    );
                    t.deepEqual(res.features[0].id, 'region.1');
                    t.deepEqual(
                        res.features[0].context[0].text,
                        'Российская Федерация'
                    );
                    t.end();
                }
            );
        }
    );

    // if the response and the context do not have values in the language queried,
    // but do have a template for that language, use the default template.
    tape(
        'Northwestern Federal District => Российская Федерация, Северо-Западный федеральный округ - {language: "ru"}',
        t => {
            c.geocode(
                'Northwestern',
                { limit_verify: 1, language: 'es' },
                (err, res) => {
                    t.ifError(err);
                    t.deepEqual(
                        res.features[0].place_name,
                        'Northwestern Federal District, Russian Federation'
                    );
                    t.deepEqual(res.features[0].id, 'region.1');
                    t.deepEqual(
                        res.features[0].context[0].text,
                        'Russian Federation'
                    );
                    t.end();
                }
            );
        }
    );

    // if the first response does not have values in the language queried,
    // but does have a template for that language, and there is a value in that language
    // in the context, use the localized template.
    tape(
        'Northwestern Federal District => Российская Федерация, Северо-Западный федеральный округ - {language: "ru"}',
        t => {
            c.geocode(
                'Saint Petersburg',
                { limit_verify: 1, language: 'eo' },
                (err, res) => {
                    t.ifError(err);
                    t.deepEqual(
                        res.features[0].place_name,
                        'Russian Federation Saint Petersburg !!!!'
                    );
                    t.deepEqual(res.features[0].id, 'place.1');
                    t.deepEqual(res.features[0].context[0].text, '!!!!');
                    t.end();
                }
            );
        }
    );

    tape('西北部联邦管区 => Russian Federation西北部联邦管区', t => {
        c.geocode(
            '西北部联邦管区',
            { limit_verify: 1, language: 'zh' },
            (err, res) => {
                t.ifError(err);
                t.deepEqual(
                    res.features[0].place_name,
                    'Russian Federation西北部联邦管区'
                );
                t.deepEqual(res.features[0].id, 'region.1');
                t.deepEqual(
                    res.features[0].context[0].text,
                    'Russian Federation'
                );
                t.end();
            }
        );
    });

    tape(
        'Shenzhen => Shenzhen, Northwestern Federal District, Russian Federation',
        t => {
            c.geocode(
                'Shenzhen',
                { limit_verify: 1, language: 'en' },
                (err, res) => {
                    t.ifError(err);
                    t.deepEqual(
                        res.features[0].place_name,
                        'Shenzhen, Northwestern Federal District, Russian Federation'
                    );
                    t.deepEqual(res.features[0].id, 'place.2');
                    t.deepEqual(
                        res.features[0].context[0].text,
                        'Northwestern Federal District'
                    );
                    t.end();
                }
            );
        }
    );

    tape('Shenzhen => Russian Federation西北部联邦管区深圳市', t => {
        c.geocode(
            'Shenzhen',
            { limit_verify: 1, language: 'zh' },
            (err, res) => {
                t.ifError(err);
                t.deepEqual(
                    res.features[0].place_name,
                    'Russian Federation西北部联邦管区深圳市'
                );
                t.deepEqual(res.features[0].id, 'place.2');
                t.deepEqual(res.features[0].context[0].text, '西北部联邦管区');
                t.end();
            }
        );
    });

    tape(
        '0,0 => Saint Petersburg, Northwestern Federal District, Russian Federation',
        t => {
            c.geocode(
                '0,0',
                { limit_verify: 1, language: 'en' },
                (err, res) => {
                    t.ifError(err);
                    t.deepEqual(
                        res.features[0].place_name,
                        'Saint Petersburg, Northwestern Federal District, Russian Federation'
                    );
                    t.deepEqual(res.features[0].id, 'place.1');
                    t.deepEqual(
                        res.features[0].context[0].text,
                        'Northwestern Federal District'
                    );
                    t.end();
                }
            );
        }
    );

    // if the most granular result (St Petersburg) doesn't have a template for the language,
    // use the default. Templates can go from specific -> general but not the other way around.
    tape(
        '0,0 => Saint Petersburg, 西北部联邦管区, Russian Federation - {language: "zh"}',
        t => {
            c.geocode(
                '0,0',
                { limit_verify: 1, language: 'zh' },
                (err, res) => {
                    t.ifError(err);
                    t.deepEqual(
                        res.features[0].place_name,
                        'Saint Petersburg, 西北部联邦管区, Russian Federation'
                    );
                    t.deepEqual(res.features[0].id, 'place.1');
                    t.deepEqual(res.features[0].context[0].text, '西北部联邦管区');
                    t.end();
                }
            );
        }
    );

    // if the most granular result (St Petersburg) doesn't have a template for the language,
    // use the default. Templates can go from specific -> general but not the other way around.
    tape(
        'Saint Petersburg => Saint Petersburg, 西北部联邦管区, Russian Federation - {language: "zh"}',
        t => {
            c.geocode(
                'Saint Petersburg',
                { limit_verify: 1, language: 'zh' },
                (err, res) => {
                    t.ifError(err);
                    t.deepEqual(
                        res.features[0].place_name,
                        'Saint Petersburg, 西北部联邦管区, Russian Federation'
                    );
                    t.deepEqual(res.features[0].id, 'place.1');
                    t.deepEqual(res.features[0].context[0].text, '西北部联邦管区');
                    t.end();
                }
            );
        }
    );

    // test robustness against case and punctuation in the exact-match and fallback subtag case
    tape(
        'Saint Petersburg => Saint Petersburg, 西北部聯邦管區, Russian Federation - {language: "(zh[-_][Hh]ant|zh[-_][Tt][Ww])"}',
        t => {
            let done = 0;
            [
                'zh_Hant',
                'zh-Hant',
                'zh_hant',
                'zh-hant',
                'zh_TW',
                'zh-TW',
                'zh_tw',
                'zh-tw'
            ].forEach(language => {
                c.geocode(
                    'Saint Petersburg',
                    { limit_verify: 1, language: language },
                    (err, res) => {
                        t.ifError(err);
                        t.deepEqual(res.features[0].context[0].text, '西北部聯邦管區');
                        t.deepEqual(
                            res.features[0].context[0].language,
                            'zh-Hant'
                        );

                        done += 1;
                        if (done == 8) t.end();
                    }
                );
            });
        }
    );

    //Is not above 0.5 relev so should fail.
    tape('fake blah blah => [fail]', t => {
        c.geocode('fake blah blah', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.notOk(res.features[0]);
            t.end();
        });
    });
})();

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
