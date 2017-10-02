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
    place_b: new mem({ maxzoom: 6, geocoder_name: 'place' }, () => {}),
    street_a: new mem({ maxzoom: 6, geocoder_name: 'street' }, () => {}),
    street_b: new mem({ maxzoom: 6, geocoder_name: 'street' }, () => {})
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
tape('index street_a', t => {
    queueFeature(
        conf.street_a,
        {
            id: 2,
            properties: {
                'carmen:text': 'wall street',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        },
        t.end
    );
});
tape('index street_b', t => {
    queueFeature(
        conf.street_b,
        {
            id: 1,
            properties: {
                'carmen:text': 'main street',
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
tape('geocoder_name dedupe', t => {
    c.geocode('main street', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'main street, funtown');
        t.deepEqual(res.features[0].id, 'street.1');
        t.deepEqual(res.features[0].context.length, 1);
        t.deepEqual(
            res.features[0].context.map(c => {
                return c.text;
            }),
            ['funtown']
        );
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
