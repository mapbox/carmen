// Test that up to 128 indexes are supported.

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

let conf = {};
for (let i = 0; i < 127; i++) {
    conf['country' + i] = new mem(
        { maxzoom: 6, geocoder_name: 'country' },
        () => {}
    );
}
conf['place'] = new mem({ maxzoom: 6, geocoder_name: 'place' }, () => {});

const c = new Carmen(conf);
tape('index place', t => {
    t.deepEqual(Object.keys(conf).length, 128, '128 indexes configured');
    queueFeature(
        conf.place,
        {
            id: 1,
            properties: {
                'carmen:text': 'Chicago',
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
tape('query place', t => {
    c.geocode('Chicago', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'Chicago', 'found Chicago');
        t.equals(res.features[0].relevance, 1.0);
        t.end();
    });
});
tape('reverse place', t => {
    c.geocode('0,0', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'Chicago', 'found Chicago');
        t.equals(res.features[0].relevance, 1);
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
