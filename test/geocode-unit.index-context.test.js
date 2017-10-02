const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// Test that geocoder returns index names for context
(() => {
    const conf = {
        country: new mem({ maxzoom: 6 }, () => {}),
        region: new mem({ maxzoom: 6 }, () => {}),
        postcode: new mem({ maxzoom: 6 }, () => {}),
        place: new mem({ maxzoom: 6 }, () => {}),
        address: new mem({ maxzoom: 6 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index country', t => {
        let country = {
            id: 1,
            properties: {
                'carmen:text': 'united states',
                'carmen:center': [0, 0],
                'carmen:zxy': ['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0, 0]
            }
        };
        queueFeature(conf.country, country, t.end);
    });

    tape('index region', t => {
        let region = {
            id: 1,
            properties: {
                'carmen:text': 'maine',
                'carmen:center': [0, 0],
                'carmen:zxy': ['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0, 0]
            }
        };
        queueFeature(conf.region, region, t.end);
    });

    tape('index place', t => {
        let place = {
            id: 1,
            properties: {
                'carmen:text': 'springfield',
                'carmen:center': [0, 0],
                'carmen:zxy': ['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0, 0]
            }
        };
        queueFeature(conf.place, place, t.end);
    });

    tape('index postcode', t => {
        let postcode = {
            id: 1,
            properties: {
                'carmen:text': '12345',
                'carmen:center': [0, 0],
                'carmen:zxy': ['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0, 0]
            }
        };
        queueFeature(conf.postcode, postcode, t.end);
    });

    tape('index address', t => {
        let address = {
            id: 1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0, 0],
                'carmen:addressnumber': ['9', '10', '7']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0, 0], [0, 0], [0, 0]]
            }
        };
        queueFeature(conf.address, address, t.end);
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

    tape('Search for an address & check indexes', t => {
        c.geocode(
            '9 fake street',
            { limit_verify: 1, indexes: true },
            (err, res) => {
                t.ifError(err);
                t.deepEquals(res.indexes, [
                    'address',
                    'place',
                    'postcode',
                    'region',
                    'country'
                ]);
                t.end();
            }
        );
    });
    tape('Search for an id & check indexes', t => {
        c.geocode('address.1', { indexes: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.indexes, ['address']);
            t.end();
        });
    });
    tape('Search for a point & check indexes', t => {
        c.geocode('0,0', { limit_verify: 1, indexes: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.indexes, [
                'address',
                'place',
                'postcode',
                'region',
                'country'
            ]);
            t.end();
        });
    });
})();

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
