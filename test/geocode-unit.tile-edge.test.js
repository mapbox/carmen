// Test that a feature at a tile's edge can be found.

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    test: new mem({ maxzoom: 14 }, () => {})
};
const c = new Carmen(conf);

tape('index test', t => {
    let feature = {
        id: 1,
        properties: {
            'carmen:text': 'test',
            'carmen:zxy': ['14/8093/5301'],
            'carmen:center': [-2.17405858745506, 53.4619151830114]
        }
    };
    queueFeature(conf.test, feature, () => {
        buildQueued(conf.test, t.end);
    });
});

tape('forward between tiles', t => {
    c.geocode('test', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features[0].place_name, 'test', 'found feature');
        t.equals(res.features[0].id, 'test.1', 'found feature');
        t.equals(res.features[0].relevance, 1.0);
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
