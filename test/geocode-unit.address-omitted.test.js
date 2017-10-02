// Interpolation between range feature gaps.

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index address', t => {
        let address = {
            id: 1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0, 0],
                'carmen:rangetype': 'tiger',
                'carmen:lfromhn': '0',
                'carmen:ltohn': '100'
            },
            geometry: {
                type: 'LineString',
                coordinates: [[0, 0], [0, 100]]
            }
        };
        queueFeature(conf.address, address, () => {
            buildQueued(conf.address, t.end);
        });
    });
    tape('test address query with address range', t => {
        c.geocode('9 fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(
                res.features[0].place_name,
                '9 fake street',
                'found 9 fake street'
            );
            t.equals(res.features[0].relevance, 1.0);
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('tiger, between the lines', t => {
        let address = {
            id: 1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0, 0],
                'carmen:rangetype': 'tiger',
                'carmen:lfromhn': ['0', '104'],
                'carmen:ltohn': ['100', '200']
            },
            geometry: {
                type: 'MultiLineString',
                coordinates: [[[0, 0], [0, 10]], [[0, 11], [0, 20]]]
            }
        };
        queueFeature(conf.address, address, () => {
            buildQueued(conf.address, t.end);
        });
    });

    tape('test tiger interpolation house number', t => {
        c.geocode('102 fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(
                res.features[0].place_name,
                '102 fake street',
                'found 102 fake street'
            );
            t.equals(res.features[0].relevance, 1.0);
            t.end();
        });
    });
})();

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
