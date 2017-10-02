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
            { maxzoom: 6, geocoder_languages: ['ur', 'en', 'fa'] },
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
                    'carmen:text_en': 'United States'
                },
                geometry: {
                    type: 'Point',
                    coordinates: [1, 1]
                }
            },
            t.end
        );
    });
    tape('index country2', t => {
        queueFeature(
            conf.country,
            {
                type: 'Feature',
                id: 2,
                properties: {
                    'carmen:center': [1, 1],
                    'carmen:text': 'india',
                    'carmen:text_ur': 'بھارت',
                    'carmen:text_fa': 'هندوستان'
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

    tape('make sure indexes contain pre-computed fallbacks', t => {
        t.deepEquals(
            conf.country._geocoder.grid.list(),
            [
                ['india', [0]],
                ['united states', [0, 1]],
                ['بھارت', [3]],
                ['هندوستان', [2]]
            ],
            'fallbacks have been properly computed'
        );
        t.end();
    });

    tape('query: United States', t => {
        c.geocode('United States', { language: 'ar' }, (err, res) => {
            t.equal(
                'United States',
                res.features[0].text,
                'Fallback to English'
            );
            t.equal(
                'en',
                res.features[0].language,
                'Language returned is English'
            );
            t.ifError(err);
            t.end();
        });
    });

    tape('query: India', t => {
        c.geocode('India', { language: 'ar' }, (err, res) => {
            t.equal(
                'بھارت',
                res.features[0].text,
                'Heuristically falls back to Urdu'
            );
            t.equal(
                'ur',
                res.features[0].language,
                'Language returned is Urdu'
            );
            t.ifError(err);
            t.end();
        });
    });

    tape('teardown', t => {
        context.getTile.cache.reset();
        t.end();
    });
})();
