// Ensures that token replacement casts a wide (unidecoded) net for
// left-hand side of token mapping.

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    test: new mem(
        {
            geocoder_tokens: {
                Maréchal: 'Mal'
            },
            maxzoom: 6
        },
        () => {}
    )
};
const c = new Carmen(conf);
tape('index Maréchal', t => {
    queueFeature(
        conf.test,
        {
            id: 1,
            properties: {
                'carmen:text': 'Maréchal',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        },
        () => {
            buildQueued(conf.test, t.end);
        }
    );
});
tape('Mal => Maréchal', t => {
    c.geocode('Mal', { limit_verify: 1 }, (err, res) => {
        t.deepEqual(res.features[0].place_name, 'Maréchal');
        t.end();
    });
});
tape('Maréchal => Maréchal', t => {
    c.geocode('Maréchal', { limit_verify: 1 }, (err, res) => {
        t.deepEqual(res.features[0].place_name, 'Maréchal');
        t.end();
    });
});
tape('Marechal => Maréchal', t => {
    c.geocode('Marechal', { limit_verify: 1 }, (err, res) => {
        t.deepEqual(res.features[0].place_name, 'Maréchal');
        t.end();
    });
});
tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
