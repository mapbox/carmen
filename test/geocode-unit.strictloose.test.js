// Tests Windsor CT (city) vs Windsor Ct (street name)
// Windsor CT should win via stacky bonus.

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
    province: new mem(null, () => {}),
    place: new mem(null, () => {})
};
const c = new Carmen(conf);
tape('index country', t => {
    queueFeature(
        conf.country,
        {
            id: 1,
            properties: {
                'carmen:text': 'australia',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        },
        t.end
    );
});
tape('index province', t => {
    queueFeature(
        conf.province,
        {
            id: 2,
            properties: {
                'carmen:text': 'western australia',
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
            id: 3,
            properties: {
                'carmen:text': 'albany',
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

// should reflect relevance of albany + australia (relev ~ 1), not albany + western australia (relev ~ 0.8)
tape('albany australia', t => {
    c.geocode('albany australia', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(
            res.features[0].place_name,
            'albany, western australia, australia'
        );
        t.deepEqual(res.features[0].relevance, 1.0);
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
