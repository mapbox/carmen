const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    country: new mem({ maxzoom: 6, geocoder_name: 'country' }, () => {}),
    region: new mem({ maxzoom: 6, geocoder_name: 'region' }, () => {}),
    postcode: new mem({ maxzoom: 6, geocoder_name: 'postcode' }, () => {}),
    address: new mem(
        { maxzoom: 6, geocoder_address: 1, geocoder_name: 'address' },
        () => {}
    )
};
const c = new Carmen(conf);

tape('index address (noise)', t => {
    const q = queue(1);
    for (let i = 1; i < 20; i++)
        q.defer((i, done) => {
            let address = {
                id: i,
                properties: {
                    'carmen:text': 'Austria St',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [i, 0],
                    'carmen:addressnumber': ['2000']
                },
                geometry: {
                    type: 'MultiPoint',
                    coordinates: [[i, 0]]
                }
            };
            queueFeature(conf.address, address, done);
        }, i);
    q.awaitAll(t.end);
});

tape('index country', t => {
    queueFeature(
        conf.country,
        {
            id: 1,
            properties: {
                'carmen:text': 'Austria',
                'carmen:zxy': ['6/33/32'],
                'carmen:center': [360 / 64 + 0.001, 0]
            }
        },
        t.end
    );
});

tape('index postcode', t => {
    queueFeature(
        conf.postcode,
        {
            id: 1,
            properties: {
                'carmen:text': '2000',
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

tape('test address', t => {
    c.geocode('2000 Austria', { limit_verify: 5 }, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].id, 'postcode.1');
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
