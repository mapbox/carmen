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
        country: new mem({ maxzoom: 6, geocoder_languages: ['es'] }, () => {}),
        postcode: new mem(
            { maxzoom: 6, geocoder_universal_text: true },
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
                    'carmen:text_es': 'Estados Unidos',
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

    tape('index postcode', t => {
        queueFeature(
            conf.postcode,
            {
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:center': [1, 1],
                    'carmen:text': '10000'
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

    tape('query: 10000', t => {
        c.geocode('10000', {}, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, '10000, United States');
            t.end();
        });
    });

    tape('query: 10000, language: es', t => {
        c.geocode('10000', { language: 'es' }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, '10000, Estados Unidos');
            t.end();
        });
    });

    tape('query: 10000, language: es, languageMode: strict', t => {
        c.geocode(
            '10000',
            { language: 'es', languageMode: 'strict' },
            (err, res) => {
                t.ifError(err);
                t.equal(res.features[0].place_name, '10000, Estados Unidos');
                t.end();
            }
        );
    });

    tape('query: 1,1', t => {
        c.geocode('1,1', {}, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, '10000, United States');
            t.end();
        });
    });

    tape('query: 1,1, language: es', t => {
        c.geocode('1,1', { language: 'es' }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, '10000, Estados Unidos');
            t.end();
        });
    });

    tape('query: 1,1, language: es, languageMode: strict', t => {
        c.geocode(
            '1,1',
            { language: 'es', languageMode: 'strict' },
            (err, res) => {
                t.ifError(err);
                t.equal(res.features[0].place_name, '10000, Estados Unidos');
                t.end();
            }
        );
    });

    tape('teardown', t => {
        context.getTile.cache.reset();
        t.end();
    });
})();
