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
                geocoder_name: 'country'
            },
            () => {}
        ),
        place: new mem(
            {
                maxzoom: 6,
                geocoder_name: 'place',
                geocoder_format_es: '{place._name} {country._name}',
                geocoder_format_ja: '{country._name} {place._name}'
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
                'carmen:text': 'France',
                'carmen:text_en': 'France',
                'carmen:text_es': 'Francia',
                'carmen:text_ja': 'フランス'
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

    tape('index place', t => {
        let place = {
            type: 'Feature',
            properties: {
                'carmen:center': [0, 0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text': 'Paris',
                'carmen:text_en': 'Paris',
                'carmen:text_es': 'París',
                'carmen:text_ja': 'パリ'
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

    tape('build queued features', t => {
        const q = queue();
        Object.keys(conf).forEach(c => {
            q.defer(cb => {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });

    tape('paris ?language=en,es,bogus', t => {
        c.geocode(
            'paris',
            { limit_verify: 1, language: 'en,es,bogus' },
            (err, res) => {
                t.equal(
                    err && err.toString(),
                    "Error: 'bogus' is not a valid language code"
                );
                t.equal(err && err.code, 'EINVALID');
                t.end();
            }
        );
    });

    tape('paris ?language=en,es,ja', t => {
        c.geocode(
            'paris',
            { limit_verify: 1, language: 'en,es,ja' },
            (err, res) => {
                t.ifError(err);
                t.equal(res.features[0].id, 'place.1');

                t.equal(res.features[0].text, 'Paris');
                t.equal(res.features[0].place_name, 'Paris France');
                t.equal(res.features[0].language, 'en');

                t.equal(res.features[0].text_en, 'Paris');
                t.equal(res.features[0].place_name_en, 'Paris France');
                t.equal(res.features[0].language_en, 'en');

                t.equal(res.features[0].text_es, 'París');
                t.equal(res.features[0].place_name_es, 'París Francia');
                t.equal(res.features[0].language_es, 'es');

                t.equal(res.features[0].text_ja, 'パリ');
                t.equal(res.features[0].place_name_ja, 'フランス パリ');
                t.equal(res.features[0].language_ja, 'ja');

                t.deepEqual(res.features[0].context, [
                    {
                        id: 'country.1',
                        language: 'en',
                        language_en: 'en',
                        language_es: 'es',
                        language_ja: 'ja',
                        text: 'France',
                        text_en: 'France',
                        text_es: 'Francia',
                        text_ja: 'フランス'
                    }
                ]);

                t.end();
            }
        );
    });

    tape('error handling ?language=20+', t => {
        c.geocode(
            'paris',
            {
                limit_verify: 1,
                language:
                    'ab,af,ak,sq,am,ar,an,hy,as,av,ae,ay,az,ba,bm,eu,be,bn,bh,bi,bo,bs'
            },
            (err, res) => {
                t.equal(
                    err && err.toString(),
                    'Error: options.language should be a list of no more than 20 languages'
                );
                t.equal(err && err.code, 'EINVALID');
                t.end();
            }
        );
    });

    tape('error handling ?language=en,en', t => {
        c.geocode(
            'paris',
            { limit_verify: 1, language: 'en,en' },
            (err, res) => {
                t.equal(
                    err && err.toString(),
                    'Error: options.language should be a list of unique language codes'
                );
                t.equal(err && err.code, 'EINVALID');
                t.end();
            }
        );
    });
})();

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
