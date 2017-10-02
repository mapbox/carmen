const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    address: new mem(
        { maxzoom: 6, geocoder_address: 1, geocoder_name: 'address' },
        () => {}
    )
};
const c = new Carmen(conf);

tape('index address', t => {
    let address = {
        id: 100,
        properties: {
            'carmen:text': 'Main st',
            'carmen:center': [0, 0],
            'carmen:addressnumber': ['100', '101', '102', '100']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0, 0], [1, 1], [2, 2], [3, 3]]
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

tape('101 Main st', t => {
    c.geocode('101 Main st', { allow_dupes: true }, (err, res) => {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.end();
    });
});

tape('100 Main st', t => {
    c.geocode('100 Main st', { allow_dupes: true }, (err, res) => {
        t.ifError(err);
        t.equals(res.features.length, 2);
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
