const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    country: new mem(null, () => {})
};

const c = new Carmen(conf);

// Multipolygon with one big part in the Western hemisphere, and one small part in the Eastern
tape('index feature', (t) => {
    const feature = {
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'USA',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:score': 1,
        },
        "geometry": {
            "type":"MultiPolygon",
            "coordinates":[[[[-140,25],[-65,25],[-65,50],[-140,50],[-140,25]]],[[[160,40],[170,40],[170,50],[160,50],[160,40]]]]}
    };
    queueFeature(conf.country, feature, t.end);
});

tape('index feature', (t) => {
    const feature = {
        id:2,
        type: 'Feature',
        properties: {
            'carmen:text':'Russia',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:score': 1,
        },
        "geometry": {
            "type":"MultiPolygon",
            "coordinates":[[[[-140,25],[-130,25],[-130,50],[-140,50],[-140,25]]],[[[60,40],[170,40],[170,50],[60,50],[60,40]]]]}
    };
    queueFeature(conf.country, feature, t.end);
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

tape('USA', (t) => {
    c.geocode('USA', { }, (err, res) => {
        t.ifError(err);
        const width = res.features[0].bbox[2] - res.features[0].bbox[0];
        t.ok(width < 180, "bbox is sane");
        t.deepEquals(res.features[0].bbox, [ -179.9, 25, -65, 50 ])
        t.end();
    });
});

tape('Russia', (t) => {
    c.geocode('Russia', { }, (err, res) => {
        t.ifError(err);
        const width = res.features[0].bbox[2] - res.features[0].bbox[0];
        t.ok(width < 180, "bbox is sane");
        t.deepEquals(res.features[0].bbox, [ 60, 25, 179.9, 50 ])
        t.end();
    });
});

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
