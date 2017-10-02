// byId debug geocoding queries

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
    place: new mem(null, () => {})
};
const c = new Carmen(conf);

tape('index country', t => {
    queueFeature(
        conf.country,
        {
            id: 1,
            properties: {
                'carmen:text': 'china',
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
                'carmen:text': 'chicago',
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

tape('query byid', t => {
    c.geocode('country.1', {}, (err, res) => {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.equals(res.features[0].place_name, 'china', 'found by id');
        t.equals(res.features[0].id, 'country.1', 'found by id');
        t.end();
    });
});

tape('query byid', t => {
    c.geocode('place.1', {}, (err, res) => {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.equals(res.features[0].place_name, 'chicago', 'found by id');
        t.equals(res.features[0].id, 'place.1', 'found by id');
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
