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
            geocoder_format: '{{address.number}} {{address.name}} {{place.name}} {{postcode.name}}'
        }, () => {})
    };

    const c = new Carmen(conf);

    tape('index postcode', (t) => {
        const postcode = {
            id:1,
            properties: {
                'carmen:text':'20001',
                'carmen:zxy':['12/2048/2048'],
                'carmen:center':[0.05,-0.05],
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
                'carmen:center':[0.14, -0.05],
                'carmen:score': 100
            }
        };
        queueFeature(conf.postcode, postcode, t.end);
    });

    tape('index postcode', (t) => {
        const postcode = {
            id:3,
            properties: {
                'carmen:text':'20003',
                'carmen:zxy':['12/2048/2049'],
                'carmen:center':[0.05, -0.14],
                'carmen:score': 100
            }
        };
        queueFeature(conf.postcode, postcode, t.end);
    });

    tape('index place', (t) => {
        const place = {
            id:4,
            properties: {
                'carmen:text':'Parker',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[3,-3],
                'carmen:score': 200
            }
        };
        queueFeature(conf.place, place, t.end);
    });

    tape('index address', (t) => {
        const address = {
            id:5,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0.05,-0.05],
                'carmen:addressnumber': ['9B', '10C', '7'],
                // The default postcode resides in 'override:postcode' it is simply
                // the postcode that was most commonly found in a given address cluster
                'override:postcode': false,
                'carmen:addressprops': {
                    // Addresses that differ from the default postcode
                    // live in the addressprops fields
                    'override:postcode': { 0: '20002', 1: 20003 }
                    // After the address
                    // parsing section of verifymatch - the correct postcode will be populated
                    // in the `override:<type>` field. Do not access carmenaddressprops directly
                }
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0.05,-0.049],[0.05,-0.05],[0.05,-0.051]]
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
            t.deepEquals(res.features[0].context, [
                { id: 'place.4', text: 'Parker' },
                { id: 'postcode.5', text: '20002' }
            ], 'Found id from address');
            t.end();
        });
    });

    tape('Test Address Override', (t) => {
        c.geocode('10C FAKE STREET', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '10c fake street Parker 20003', 'found 10c fake street');
            t.equals(res.features[0].relevance, 1.00);
            t.deepEquals(res.features[0].context, [
                { id: 'place.4', text: 'Parker' },
                { id: 'postcode.5', text: '20003' }
            ], 'Found id from address');
            t.end();
        });
    });

    tape('Test Address without override', (t) => {
        c.geocode('7 FAKE STREET', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '7 fake street Parker 20001', 'found 7 fake street');
            t.equals(res.features[0].relevance, 1.00);
            t.deepEquals(res.features[0].context, [
                { id: 'place.4', text: 'Parker' },
                { id: 'postcode.1', text: '20001' }
            ], 'Found id from postcode');
            t.end();
        });
    });

    tape('Test Address Override', (t) => {
        c.geocode('10C FAKE STREET 20003', { limit_verify: 2 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '10c fake street Parker 20003', 'found 10c fake street');
            t.equals(res.features[0].relevance, 0.633333);
            t.deepEquals(res.features[0].context, [
                { id: 'place.4', text: 'Parker' },
                { id: 'postcode.5', text: '20003' }
            ], 'Found id from address');
            t.end();
        });
    });

    tape('Test Address Override', (t) => {
        c.geocode('9B FAKE STREET 20002', { limit_verify: 10 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street Parker 20002', 'found 9b fake street 20002');
            t.equals(res.features[0].relevance, 0.633333);
            t.deepEquals(res.features[0].context, [
                { id: 'place.4', text: 'Parker' },
                { id: 'postcode.5', text: '20002' }
            ], 'Found id from postcode');
            t.end();
        });
    });

    tape('Test Address Override', (t) => {
        c.geocode('9B FAKE STREET 20001', { limit_verify: 10 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street Parker 20002', 'found 9b fake street 20002 w/ 20001 query');
            t.equals(res.features[0].relevance, 0.75);
            t.deepEquals(res.features[0].context, [
                { id: 'place.4', text: 'Parker' },
                { id: 'postcode.5', text: '20002' }
            ], 'Found id from postcode');
            t.end();
        });
    });

    tape('Test Address Override', (t) => {
        c.geocode('9B FAKE STREET PARKER 20002', { limit_verify: 10 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street Parker 20002', 'found 9b fake street parker 20002');
            t.equals(res.features[0].relevance, 0.711111);
            t.deepEquals(res.features[0].context, [
                { id: 'place.4', text: 'Parker' },
                { id: 'postcode.5', text: '20002' }
            ], 'Found id from postcode');
            t.end();
        });
    });

    tape('Test Address Override', (t) => {
        c.geocode('9B FAKE STREET PARKER 20001', { limit_verify: 10 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street Parker 20002', 'found 9b fake street parker 20002 w/ 20001 query');
            t.equals(res.features[0].relevance, 0.832222);
            t.deepEquals(res.features[0].context, [
                { id: 'place.4', text: 'Parker' },
                { id: 'postcode.5', text: '20002' }
            ], 'Found id from postcode');
            t.end();
        });
    });

})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
