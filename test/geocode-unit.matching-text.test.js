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
                geocoder_format: '{country._name}'
            },
            () => {}
        ),
        region: new mem(
            {
                maxzoom: 6,
                geocoder_name: 'region',
                geocoder_format: '{region._name} {country._name}'
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
                'carmen:text': 'United States,America'
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
    tape('index region', t => {
        let region = {
            type: 'Feature',
            properties: {
                'carmen:center': [0, 0],
                'carmen:zxy': ['6/32/32'],
                'carmen:text': 'Kansas,Jayhawks'
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
    tape('build queued features', t => {
        const q = queue();
        Object.keys(conf).forEach(c => {
            q.defer(cb => {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });
    tape('kansas america', t => {
        c.geocode('kansas america', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'Kansas United States');
            t.equal(
                res.features[0].matching_text,
                undefined,
                'feature.matching_text'
            );
            t.equal(res.features[0].matching_place_name, 'Kansas America');
            t.end();
        });
    });
    tape('america', t => {
        c.geocode('america', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'United States');
            t.equal(res.features[0].matching_text, 'America');
            t.equal(res.features[0].matching_place_name, 'America');
            t.end();
        });
    });
    tape('jayhawks', t => {
        c.geocode('jayhawks', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equal(res.features[0].place_name, 'Kansas United States');
            t.equal(res.features[0].matching_text, 'Jayhawks');
            t.equal(
                res.features[0].matching_place_name,
                'Jayhawks United States'
            );
            t.end();
        });
    });
})();

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
