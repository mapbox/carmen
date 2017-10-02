const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    test: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
};
const c = new Carmen(conf);
tape('index "av francisco de aguirre #"', t => {
    queueFeature(
        conf.test,
        {
            id: 1,
            properties: {
                'carmen:text': 'av francisco de aguirre',
                'carmen:center': [0, 0],
                'carmen:addressnumber': ['2']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0, 0]]
            }
        },
        t.end
    );
});
tape('index "# r ademar da silva neiva"', t => {
    queueFeature(
        conf.test,
        {
            id: 2,
            properties: {
                'carmen:text': 'r ademar da silva neiva',
                'carmen:center': [0, 0],
                'carmen:addressnumber': ['2']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0, 0]]
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
// partial unidecoded terms do not match
tape('search: "av francisco de aguirre 2 la serena"', t => {
    c.geocode(
        'av francisco de aguirre 2 la serena',
        { limit_verify: 2 },
        (err, res) => {
            t.equal(res.features.length, 1);
            t.equal(res.features[0].id, 'test.1');
            t.end();
        }
    );
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
