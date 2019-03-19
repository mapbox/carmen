'use strict';

// Allow lowest level feature to override objects
// within the resultant context array

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

(() => {
    const conf = {
        postcode: new mem({
            maxzoom: 12
        }, () => {}),
        place: new mem({
            maxzoom: 6
        }, () => {}),
        address: new mem({
            maxzoom: 14,
            geocoder_address: 1,
            geocoder_format: '{address._number} {address._name} {place._name} {postcode._name}'
        }, () => {})
    };

    const c = new Carmen(conf);

    tape('index postcode', (t) => {
        const postcode = {
            id:1,
            properties: {
                'carmen:text':'20001',
                'carmen:zxy':['12/2048/2048'],
                'carmen:center':[0,0],
                'carmen:score': 100
            }
        };
        queueFeature(conf.postcode, postcode, t.end);
    });

    tape('index postcode', (t) => {
        const postcode = {
            id:2,
            properties: {
                'carmen:text':'20002',
                'carmen:zxy':['12/2049/2048'],
                'carmen:center':[0.1, 0],
                'carmen:score': 100
            }
        };
        queueFeature(conf.postcode, postcode, t.end);
    });

    tape('index place', (t) => {
        const place = {
            id:3,
            properties: {
                'carmen:text':'Parker',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0],
                'carmen:score': 200
            }
        };
        queueFeature(conf.place, place, t.end);
    });

    tape('index address', (t) => {
        const address = {
            id:4,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['9B', '10C', '7'],
                // The default postcode resides in 'override:postcode' it is simply
                // the postcode that was most commonly found in a given address cluster
                'override:postcode': false,
                'carmen:addressprops': {
                    // Addresses that differ from the default postcode
                    // live in the addressprops fields
                    'override:postcode': { 0: '20002', 1: '20003' }
                    // After the address
                    // parsing section of verifymatch - the correct postcode will be populated
                    // in the `override:<type>` field. Do not access carmenaddressprops directly
                }
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[0,0],[0,0]]
            }
        };

        queueFeature(conf.address, address, t.end);
    });

    tape('build queued features', (t) => {
        const q = queue();
        Object.keys(conf).forEach((c) => {
            q.defer((cb) => {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });

    tape('Test Address Override', (t) => {
        c.geocode('9B FAKE STREET', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street Parker 20002', 'found 9b fake street');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });

    tape('Test Address Override', (t) => {
        c.geocode('10C FAKE STREET', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '10c fake street Parker 20003', 'found 10c fake street');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });

    tape('Test Address Override', (t) => {
        c.geocode('7 FAKE STREET', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '7 fake street Parker 20001', 'found 7 fake street');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });

    tape('Test Address Override', (t) => {
        c.geocode('9B FAKE STREET 20002', { limit_verify: 10 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street Parker 20002', 'found 9b fake street 20002'); // ERROR "20002"
            t.equals(res.features[0].relevance, 0.50);
            t.end();
        });
    });

    tape('Test Address Override', (t) => {
        c.geocode('9B FAKE STREET 20001', { limit_verify: 10 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street Parker 20002', 'found 9b fake street 20002 w/ 20001 query');
            t.equals(res.features[0].relevance, 0.50);
            t.end();
        });
    });

    tape('Test Address Override', (t) => {
        c.geocode('9B FAKE STREET PARKER 20002', { limit_verify: 10 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street Parker 20002', 'found 9b fake street parker 20002'); // ERROR "fake street Parker 20001"
            t.equals(res.features[0].relevance, 2 / 3);
            t.end();
        });
    });

    tape('Test Address Override', (t) => {
        c.geocode('9B FAKE STREET PARKER 20001', { limit_verify: 10 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street Parker 20002', 'found 9b fake street parker 20002 w/ 20001 query');
            t.equals(res.features[0].relevance, 2 / 3);
            t.end();
        });
    });

})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
