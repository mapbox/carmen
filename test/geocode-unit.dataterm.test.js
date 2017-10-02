const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    address: new mem(
        { maxzoom: 6, geocoder_address: 1, geocoder_name: 'address' },
        () => {}
    )
};
const c = new Carmen(conf);

tape('index address (noise)', t => {
    const q = queue(1);
    for (let i = 1; i < 41; i++)
        q.defer((i, done) => {
            let address = {
                id: i,
                properties: {
                    'carmen:text': 'fake street',
                    'carmen:center': [0, 0],
                    'carmen:addressnumber': ['600']
                },
                geometry: {
                    type: 'MultiPoint',
                    coordinates: [[0, 0]]
                }
            };
            queueFeature(conf.address, address, done);
        }, i);
    q.awaitAll(t.end);
});

tape('index address (signal)', t => {
    let address = {
        id: 101,
        properties: {
            'carmen:text': 'fake street',
            'carmen:center': [0, 0],
            'carmen:addressnumber': ['1500']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0, 0]]
        }
    };
    queueFeature(conf.address, address, t.end);
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

tape('test address', t => {
    c.geocode('1500 fake street', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(
            res.features[0].place_name,
            '1500 fake street',
            'found 1500 fake street'
        );
        t.equals(res.features[0].relevance, 1.0);
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
