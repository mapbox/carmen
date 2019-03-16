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
            maxzoom: 6    
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
                'carmen:text':'80138',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        };
        queueFeature(conf.postcode, postcode, t.end);
    });

    tape('index place', (t) => {
        const place = {
            id:1,
            properties: {
                'carmen:text':'Parker',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        };
        queueFeature(conf.place, place, t.end);
    });

    tape('index address', (t) => {
        const address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['9B', '10C', '7'],
                'override:postcode': null,
                'carmen:addressprops': {
                    'override:postcode': [ '20002', '20003', null ]
                }
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[0,0],[0,0]]
            }
        };

        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });



    tape('Test Address Override', (t) => {
        c.geocode('9B FAKE STREET', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street', 'found 9b fake street');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
