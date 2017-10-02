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

tape('index address (dataterm only)', t => {
    let address = {
        id: 100,
        properties: {
            'carmen:text': '-',
            'carmen:center': [0, 0],
            'carmen:addressnumber': ['100']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0, 0]]
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

tape('test address', t => {
    c.geocode('100', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features.length, 0);
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
