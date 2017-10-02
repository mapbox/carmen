const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    place: new mem(null, () => {})
};
const c = new Carmen(conf);

tape('index unicode place', t => {
    let place = {
        id: 1,
        properties: {
            'carmen:text': '京都市',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.place, place, t.end);
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

tape('valid match', t => {
    c.geocode('京都市', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 1);
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
