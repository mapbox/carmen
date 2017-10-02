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
                geocoder_languages: ['en', 'es']
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
                'carmen:text_es': 'Estados Unidos',
                'carmen:text_en': 'United States',
                'carmen:text': 'United States'
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
    tape('build queued features', t => {
        const q = queue();
        Object.keys(conf).forEach(c => {
            q.defer(cb => {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });

    tape('0,0 ?language=en', t => {
        c.geocode('0,0', { language: 'en', limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'United States');
            t.equal(res.features[0].id, 'country.1');
            t.equal(res.features[0].language, 'en', 'language set to "en"');
            t.end();
        });
    });

    tape('0,0 ?language=es', t => {
        c.geocode('0,0', { language: 'es', limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'Estados Unidos');
            t.equal(res.features[0].id, 'country.1');
            t.equal(res.features[0].language, 'es', 'language set to "es"');
            t.end();
        });
    });

    tape('0,0 ?language=es-XX', t => {
        c.geocode('0,0', { language: 'es-XX', limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'Estados Unidos');
            t.equal(res.features[0].id, 'country.1');
            t.equal(res.features[0].language, 'es', 'language set to "es"');
            t.end();
        });
    });

    tape('0,0 ?language=en-XX', t => {
        c.geocode('0,0', { language: 'en-XX', limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'United States');
            t.equal(res.features[0].id, 'country.1');
            t.equal(res.features[0].language, 'en', 'language set to "en"');
            t.end();
        });
    });
})();

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
