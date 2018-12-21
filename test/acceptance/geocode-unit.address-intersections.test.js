'use strict';

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');


(() => {
    const conf = {
        address: new mem({
            maxzoom: 14,
            geocoder_address: 1,
            geocoder_tokens: {
                st: 'street',
                nw: 'northwest'
            }
        }, () => {})
    };

    const c = new Carmen(conf);

    tape('index address', (t) => {
        const address = {
            id: 1,
            properties: {
                'carmen:text': '15th St NW',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['70', '72', '74']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[0,0],[0,0]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index address', (t) => {
        const address = {
            id: 2,
            properties: {
                'carmen:text': '9th Street Northwest',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['500', '502', '504']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[0,0],[0,0]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index intersection', (t) => {
        const address = {
            id: 3,
            properties: {
                'carmen:text': '9th st nw and 15th st nw,15th st nw and 9th st nw',
                'carmen:center': [0,0],
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index intersection', (t) => {
        const address = {
            id: 4,
            properties: {
                'carmen:text': '9th st nw and 14th st nw,14th st nw and 9th st nw',
                'carmen:center': [0,0],
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index intersection', (t) => {
        const address = {
            id: 5,
            properties: {
                'carmen:text': '8th st nw and 15th st nw,15th st nw and 8th st nw',
                'carmen:center': [0,0],
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
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

    tape('test address index with forward intersection', (t) => {
        c.geocode('9th st nw and 15th st nw', {}, (err, res) => {
            t.ifError(err);

            //t.equals(res.features.length, 1);
            t.end();
        });
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
