// Test geocoder_name overlapping feature context prioritization

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    place_a: new mem({ maxzoom: 6, geocoder_name: 'place' }, () => {}),
    place_b: new mem({ maxzoom: 6, geocoder_name: 'place' }, () => {})
};
const c = new Carmen(conf);
tape('index place_a', t => {
    queueFeature(
        conf.place_a,
        {
            id: 1,
            properties: {
                'carmen:text': 'sadtown',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        },
        t.end
    );
});
tape('index place_b', t => {
    queueFeature(
        conf.place_b,
        {
            id: 2,
            properties: {
                'carmen:text': 'funtown',
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
tape('sadtown', t => {
    c.geocode('sadtown', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'sadtown');
        t.deepEqual(res.features[0].id, 'place.1');
        t.end();
    });
});
tape('funtown', t => {
    c.geocode('funtown', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'funtown');
        t.deepEqual(res.features[0].id, 'place.2');
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
