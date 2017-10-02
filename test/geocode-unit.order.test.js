const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    country: new mem(null, () => {}),
    region: new mem(null, () => {}),
    place: new mem(null, () => {}),
    address: new mem(
        {
            maxzoom: 6,
            geocoder_address: 1
        },
        () => {}
    ),
    poi: new mem(null, () => {})
};
const c = new Carmen(conf);

tape('index country', t => {
    let country = {
        id: 1,
        properties: {
            'carmen:text': 'United States',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.country, country, t.end);
});

tape('index region', t => {
    let region = {
        id: 1,
        properties: {
            'carmen:text': 'North Carolina',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.region, region, t.end);
});

tape('index place', t => {
    let place = {
        id: 1,
        properties: {
            'carmen:text': 'Winston-Salem',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.place, place, t.end);
});

tape('index address', t => {
    let address = {
        id: 1,
        properties: {
            'carmen:text': 'Log Cabin Ln',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0],
            'carmen:addressnumber': ['1234']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0, 0]]
        }
    };
    queueFeature(conf.address, address, t.end);
});

tape('index poi', t => {
    let poi = {
        id: 2,
        properties: {
            'carmen:text': 'United States',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.poi, poi, t.end);
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

tape('Winston-Salem North Carolina', t => {
    c.geocode(
        'Winston-Salem North Carolina',
        { limit_verify: 1 },
        (err, res) => {
            t.ifError(err);
            t.equal(
                res.features[0].text,
                'Winston-Salem',
                'ok when query is ordered `{place} {region}`'
            );
            t.equal(
                res.features[0].relevance,
                1,
                "Expected ascending order doesn't lower relevance"
            );
            t.end();
        }
    );
});

tape('North Carolina Winston-Salem', t => {
    c.geocode(
        'North Carolina Winston-Salem',
        { limit_verify: 1 },
        (err, res) => {
            t.ifError(err);
            t.equal(
                res.features[0].text,
                'Winston-Salem',
                'ok when query is ordered `{region} {place}`'
            );
            t.equal(
                res.features[0].relevance,
                0.99,
                'Unexpected descending order lowers relevance'
            );
            t.end();
        }
    );
});

tape('Log Cabin Ln North Carolina Winston-Salem', t => {
    c.geocode(
        'Log Cabin Ln North Carolina Winston-Salem',
        { limit_verify: 2 },
        (err, res) => {
            t.ifError(err);
            t.equal(
                res.features[0].text,
                'Log Cabin Ln',
                'ok when query order is mixed up'
            );
            t.equal(
                res.features[0].relevance,
                0.8333333333333333,
                'Mixed-up order lowers relevance'
            );
            t.end();
        }
    );
});

tape('No descending order POIs', t => {
    c.geocode(
        'North Carolina United States',
        { limit_verify: 2 },
        (err, res) => {
            t.ifError(err);
            t.equal(
                res.features.length,
                2,
                'feaatures matching in both directions are returned'
            );
            t.deepEqual(
                res.features[0].id,
                'region.1',
                'First result matches expected order'
            );
            t.end();
        }
    );
});

tape('Descending Gappy', t => {
    c.geocode(
        'United States Winston-Salem',
        { limit_verify: 2 },
        (err, res) => {
            t.ifError(err);
            t.equal(
                res.features.length,
                2,
                'feaatures matching in both directions are returned'
            );
            t.deepEqual(
                res.features[0].id,
                'poi.2',
                'First result matches expected order'
            );
            t.end();
        }
    );
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
