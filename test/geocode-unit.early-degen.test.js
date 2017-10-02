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
        {
            maxzoom: 6,
            geocoder_address: 1,
            geocoder_format: '{address._name} {address._number}',
            geocoder_name: 'address'
        },
        () => {}
    )
};
const c = new Carmen(conf);

tape('index address', t => {
    let address = {
        id: 1,
        properties: {
            'carmen:text': 'Brehmestraße',
            'carmen:center': [0, 0],
            'carmen:addressnumber': ['56']
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
    c.geocode('56 Brehmestr.', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(
            res.features[0] && res.features[0].place_name,
            'Brehmestraße 56'
        );
        t.end();
    });
});
tape('test address', t => {
    c.geocode('56 Brehmestr.', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(
            res.features[0] && res.features[0].place_name,
            'Brehmestraße 56'
        );
        t.end();
    });
});

// Real solution here is regex token for *strasse => *str
tape.skip('test address', t => {
    c.geocode('Brehmestr. 56', { limit_verify: 1 }, (err, res) => {
        t.ifError(err);
        t.equals(
            res.features[0] && res.features[0].place_name,
            'Brehmestraße 56'
        );
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
