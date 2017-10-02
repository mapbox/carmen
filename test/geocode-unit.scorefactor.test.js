// Test that score is multiplied by the index scorefactor so that
// cross-index comparisons make sense.

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

(() => {
    const conf = {
        country: new mem(null, () => {}),
        place: new mem(null, () => {})
    };
    const c = new Carmen(conf);
    tape('index small score (noise)', t => {
        const q = queue(1);
        for (let i = 1; i < 41; i++)
            q.defer((i, done) => {
                queueFeature(
                    conf.place,
                    {
                        id: i,
                        properties: {
                            'carmen:score': 10,
                            'carmen:text': 'testplace',
                            'carmen:zxy': ['6/32/32'],
                            'carmen:center': [0, 0]
                        }
                    },
                    done
                );
            }, i);
        q.awaitAll(t.end);
    });
    tape('index big score (noise)', t => {
        queueFeature(
            conf.country,
            {
                id: 1,
                properties: {
                    'carmen:score': 1e9,
                    'carmen:text': 'ignoreme',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0]
                }
            },
            t.end
        );
    });
    tape('index big score (signal)', t => {
        queueFeature(
            conf.country,
            {
                id: 2,
                properties: {
                    'carmen:score': 1e6,
                    'carmen:text': 'testplace',
                    'carmen:zxy': ['6/33/32'],
                    'carmen:center': [360 / 64 + 0.001, 0]
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
    tape('query', t => {
        c.geocode('testplace', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'testplace');
            t.deepEqual(res.features[0].id, 'country.2');
            t.end();
        });
    });
})();

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
