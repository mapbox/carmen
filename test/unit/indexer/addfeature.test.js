'use strict';
const tape = require('tape');
const Carmen = require('../../..');
const context = require('../../../lib/geocoder/context');
const mem = require('../../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    address : new mem({ maxzoom: 6 }, () => {}),
    poi : new mem({ maxzoom: 6 }, () => {})
};
const c = new Carmen(conf);

tape('index address', (t) => {
    const docs = [];
    let address;

    for (let i = 0; i < 1; i++) {
        address = {
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'lake view road,lake view',
                'carmen:center':[0,10]
            },
            geometry: {
                type: 'Point',
                coordinates: [0,10]
            }
        };
        docs.push(address);
    }
    for (let j = 2; j <= 103; j++) {
        address = {
            id:2,
            type: 'Feature',
            properties: {
                'carmen:text':'main road',
                'carmen:center':[0,10]
            },
            geometry: {
                type: 'Point',
                coordinates: [0,10]
            }
        };
        docs.push(address);
    }
    queueFeature(conf.address, docs, t.end);
});

tape('index pois', (t) => {
    const docs = [];
    let poi;

    for (let k = 103; k <= 104; k++) {
        poi = {
            id:3,
            type: 'Feature',
            properties: {
                'carmen:text':'Starbucks',
                'carmen:score':'150',
                'carmen:center':[0,10]
            },
            geometry: {
                type: 'Point',
                coordinates: [0,10]
            }
        };
        docs.push(poi);
    }
    queueFeature(conf.poi, docs, t.end);
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

tape('Search for Starbucks', (t) => {
    c.geocode('starbucks lake view', { autocomplete: false, limit_verify: 2 }, (err, res) => {
        t.error(err);
        t.equal(res.features[0].relevance, 1, 'stacked relevance');
        t.equal(res.features.length, 2, 'two features returned');
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
