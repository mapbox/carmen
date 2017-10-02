// Unit tests for reverse geocoding IO. Confirms type filters restrict loading
// tiles for excluded indexes.

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// Setup includes the api-mem `timeout` option to simulate asynchronous I/O.
const conf = {
    country: new mem({ maxzoom: 6, timeout: 10 }, () => {}),
    region: new mem({ maxzoom: 6, timeout: 10 }, () => {}),
    place: new mem({ maxzoom: 6, timeout: 10 }, () => {}),
    street: new mem({ maxzoom: 6, timeout: 10, geocoder_address: 1 }, () => {})
};
const c = new Carmen(conf);

tape('ready', t => {
    c._open(t.end);
});

tape('index country', t => {
    queueFeature(
        conf.country,
        {
            id: 1,
            properties: {
                'carmen:text': 'us',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
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
                'carmen:text': 'ohio',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        },
        t.end
    );
});
tape('index place', t => {
    queueFeature(
        conf.place,
        {
            id: 1,
            properties: {
                'carmen:text': 'springfield',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        },
        t.end
    );
});
tape('index street', t => {
    queueFeature(
        conf.street,
        {
            id: 1,
            properties: {
                'carmen:text': 'river rd',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
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

function resetLogs() {
    context.getTile.cache.reset();
    conf.country._original.logs.getGeocoderData = [];
    conf.country._original.logs.getTile = [];
    conf.region._original.logs.getGeocoderData = [];
    conf.region._original.logs.getTile = [];
    conf.place._original.logs.getGeocoderData = [];
    conf.place._original.logs.getTile = [];
    conf.street._original.logs.getGeocoderData = [];
    conf.street._original.logs.getTile = [];
}

tape('reverse 0,0', t => {
    resetLogs();
    c.geocode('0,0', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(
            res.features[0].place_name,
            'river rd, springfield, ohio, us'
        );
        t.deepEqual(
            c.indexes.country._original.logs.getGeocoderData,
            ['feature,1'],
            'country: loads 1 feature'
        );
        t.deepEqual(
            c.indexes.country._original.logs.getTile,
            ['6,32,32'],
            'country: loads 1 tile'
        );
        t.deepEqual(
            c.indexes.region._original.logs.getGeocoderData,
            ['feature,1'],
            'region: loads 1 feature'
        );
        t.deepEqual(
            c.indexes.region._original.logs.getTile,
            ['6,32,32'],
            'region: loads 1 tile'
        );
        t.deepEqual(
            c.indexes.place._original.logs.getGeocoderData,
            ['feature,1'],
            'place: loads 1 feature'
        );
        t.deepEqual(
            c.indexes.place._original.logs.getTile,
            ['6,32,32'],
            'place: loads 1 tile'
        );
        t.deepEqual(
            c.indexes.street._original.logs.getGeocoderData,
            ['feature,1'],
            'street: loads 1 feature'
        );
        t.deepEqual(
            c.indexes.street._original.logs.getTile,
            ['6,32,32'],
            'street: loads 1 tile'
        );
        t.end();
    });
});

tape('reverse 0,0, types=region', t => {
    resetLogs();
    c.geocode('0,0', { types: ['region'] }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'ohio, us');
        t.deepEqual(
            c.indexes.country._original.logs.getGeocoderData,
            ['feature,1'],
            'country: loads 1 feature'
        );
        t.deepEqual(
            c.indexes.country._original.logs.getTile,
            ['6,32,32'],
            'country: loads 1 tile'
        );
        t.deepEqual(
            c.indexes.region._original.logs.getGeocoderData,
            ['feature,1'],
            'region: loads 1 feature'
        );
        t.deepEqual(
            c.indexes.region._original.logs.getTile,
            ['6,32,32'],
            'region: loads 1 tile'
        );
        t.deepEqual(
            c.indexes.place._original.logs.getGeocoderData,
            [],
            'place: no i/o'
        );
        t.deepEqual(
            c.indexes.place._original.logs.getTile,
            [],
            'place: no i/o'
        );
        t.deepEqual(
            c.indexes.street._original.logs.getGeocoderData,
            [],
            'street: no i/o'
        );
        t.deepEqual(
            c.indexes.street._original.logs.getTile,
            [],
            'street: no i/o'
        );
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
