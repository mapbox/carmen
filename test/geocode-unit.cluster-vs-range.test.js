// Test that cluster results are prioritized over itp results when
// present and otherwise equal.

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    addressitp: new mem(
        { maxzoom: 6, geocoder_address: 1, geocoder_name: 'address' },
        () => {}
    ),
    address: new mem(
        { maxzoom: 6, geocoder_address: 1, geocoder_name: 'address' },
        () => {}
    )
};
const c = new Carmen(conf);
tape('index address', t => {
    let address = {
        id: 1,
        properties: {
            'carmen:text': 'fake street',
            'carmen:center': [0, 0],
            'carmen:addressnumber': ['100']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0, 0]]
        }
    };
    queueFeature(conf.address, address, t.end);
});
tape('index addressitp', t => {
    let addressitp = {
        id: 1,
        properties: {
            'carmen:text': 'fake street',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0],
            'carmen:rangetype': 'tiger',
            'carmen:parityr': 'O',
            'carmen:rfromhn': '1',
            'carmen:rtohn': '91',
            'carmen:parityl': 'E',
            'carmen:lfromhn': '0',
            'carmen:ltohn': '90'
        },
        geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [0, 1]]
        }
    };
    queueFeature(conf.addressitp, addressitp, t.end);
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
tape('test address query with address range', t => {
    c.geocode('100 fake street', { limit_verify: 2 }, (err, res) => {
        t.ifError(err);
        t.equals(
            res.features[0].place_name,
            '100 fake street',
            'found 100 fake street'
        );
        t.equals(res.features[0].relevance, 1.0);
        t.end();
    });
});

//Reverse geocode will return a pt since it is futher down in the stack than itp
tape('test reverse address query with address range', t => {
    c.geocode('0,0', { limit_verify: 2 }, (err, res) => {
        t.ifError(err);
        t.equals(
            res.features[0].place_name,
            '100 fake street',
            'found 100 fake street'
        );
        t.equals(res.features[0].relevance, 1);
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
