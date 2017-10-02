// scoredist unit test

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;
const queue = require('d3-queue').queue;

(() => {
    const conf = {
        address: new mem(null, () => {})
    };
    const c = new Carmen(conf);
    tape('index address (signal 1)', t => {
        queueFeature(
            conf.address,
            {
                id: 200,
                properties: {
                    'carmen:text': 'main st',
                    'carmen:zxy': ['6/0/0'],
                    'carmen:score': 1000,
                    'carmen:center': [-179.99, 85]
                }
            },
            t.end
        );
    });
    tape('index address (signal 2)', t => {
        queueFeature(
            conf.address,
            {
                id: 201,
                properties: {
                    'carmen:text': 'main st',
                    'carmen:zxy': ['6/35/32'],
                    'carmen:score': 1000,
                    'carmen:center': [20, 0]
                }
            },
            t.end
        );
    });
    tape('index address (noise)', t => {
        const q = queue(1);
        for (let i = 1; i < 100; i++)
            q.defer((i, done) => {
                queueFeature(
                    conf.address,
                    {
                        id: i,
                        properties: {
                            'carmen:text': 'main st',
                            'carmen:zxy': ['6/32/32'],
                            'carmen:scorei': 50,
                            'carmen:center': [0, 0]
                        }
                    },
                    done
                );
            }, i);
        q.awaitAll(t.end);
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
    tape('geocode proximity=10,10 => superscored', t => {
        c.geocode('main st', { proximity: [10, 10] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].id, 'address.200', 'found address.200');
            t.end();
        });
    });
    tape('geocode proximity=20,0 => nearest', t => {
        c.geocode('main st', { proximity: [20, 0] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].id, 'address.201', 'found address.201');
            t.end();
        });
    });
    tape('teardown', t => {
        context.getTile.cache.reset();
        t.end();
    });
})();
