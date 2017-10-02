const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    postcode: new mem({ maxzoom: 6 }, () => {}),
    address: new mem(
        { maxzoom: 6, geocoder_address: 1, geocoder_name: 'address' },
        () => {}
    )
};
const c = new Carmen(conf);

tape('index', t => {
    queueFeature(
        conf.postcode,
        {
            id: 1,
            properties: {
                'carmen:text': '22209',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        },
        t.end
    );
});

tape('index', t => {
    queueFeature(
        conf.postcode,
        {
            id: 2,
            properties: {
                'carmen:text': '22209 restaurant',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        },
        t.end
    );
});

tape('index address', t => {
    queueFeature(
        conf.address,
        {
            id: 2,
            properties: {
                'carmen:text': 'main st',
                'carmen:addressnumber': ['22209'],
                'carmen:score': 1000,
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
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

tape('query', t => {
    c.geocode('22209', { limit_verify: 2 }, (err, res) => {
        t.ifError(err);
        // 22209 does not win here until we have suggest vs final modes.
        t.equals(res.features[0].place_name, '22209', 'found 22209');
        t.equals(res.features[0].relevance, 1.0);
        t.equals(
            res.features[1].place_name,
            '22209 restaurant',
            'found 22209 restaurant'
        );
        t.equals(res.features[1].relevance, 1.0);
        t.end();
    });
});

tape('indexes degen', t => {
    c.geocode('222', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(res.features.length, 1);
        t.end();
    });
});

tape('does index degens for non-numeric terms', t => {
    c.geocode('22209 rest', { limit_verify: 2 }, (err, res) => {
        t.ifError(err);
        t.equals(
            res.features[0].place_name,
            '22209 restaurant',
            'found 22209 restaurant'
        );
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
