const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

(() => {
    const conf = {
        country: new mem(
            { maxzoom: 6, geocoder_languages: ['en', 'zh'] },
            () => {}
        ),
        region: new mem(
            {
                maxzoom: 6,
                geocoder_format: '{region._name}, {country._name}',
                geocoder_languages: ['en', 'zh']
            },
            () => {}
        )
    };
    const c = new Carmen(conf);
    tape('index country', t => {
        queueFeature(
            conf.country,
            {
                id: 1,
                properties: {
                    'carmen:text': '  Colombia\n',
                    'carmen:text_en': ' Colombia\n',
                    'carmen:text_zh': ' 哥伦比亚\n',
                    'carmen:center': [0, 0]
                },
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            },
            t.end
        );
    });
    tape('index region', t => {
        queueFeature(
            conf.region,
            {
                id: 1,
                properties: {
                    'carmen:text': ' Bogotá ',
                    'carmen:text_en': ' Bogota ',
                    'carmen:text_zh': ' 波哥大 ',
                    'carmen:center': [0, 0]
                },
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0]
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
    tape('trims text (forward)', t => {
        c.geocode('Bogota', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Bogotá, Colombia');
            t.equals(res.features[0].text, 'Bogotá');
            t.equals(res.features[0].context[0].text, 'Colombia');
            t.end();
        });
    });
    tape('trims text (reverse)', t => {
        c.geocode('0,0', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Bogotá, Colombia');
            t.equals(res.features[0].text, 'Bogotá');
            t.equals(res.features[0].context[0].text, 'Colombia');
            t.end();
        });
    });
    tape('trims text (forward, ?language=en)', t => {
        c.geocode('Bogota', { limit_verify: 1, language: 'en' }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Bogota, Colombia');
            t.equals(res.features[0].text, 'Bogota');
            t.equals(res.features[0].context[0].text, 'Colombia');
            t.end();
        });
    });
    tape('trims text (reverse, ?language=en)', t => {
        c.geocode('0,0', { limit_verify: 1, language: 'en' }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Bogota, Colombia');
            t.equals(res.features[0].text, 'Bogota');
            t.equals(res.features[0].context[0].text, 'Colombia');
            t.end();
        });
    });
    tape('trims text (forward, ?language=zh)', t => {
        c.geocode('Bogota', { limit_verify: 1, language: 'zh' }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '波哥大, 哥伦比亚');
            t.equals(res.features[0].text, '波哥大');
            t.equals(res.features[0].context[0].text, '哥伦比亚');
            t.end();
        });
    });
    tape('trims text (reverse, ?language=en)', t => {
        c.geocode('0,0', { limit_verify: 1, language: 'zh' }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '波哥大, 哥伦比亚');
            t.equals(res.features[0].text, '波哥大');
            t.equals(res.features[0].context[0].text, '哥伦比亚');
            t.end();
        });
    });
})();

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
