// Test multitype behavior when multitype spans across another existing index

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    region: new mem(
        { maxzoom: 6, geocoder_types: ['region', 'place'] },
        () => {}
    ),
    district: new mem({ maxzoom: 6 }, () => {}),
    place: new mem({ maxzoom: 6 }, () => {})
};
const c = new Carmen(conf);

tape('index region', t => {
    queueFeature(
        conf.region,
        {
            id: 1,
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [[-40, -40], [-40, 40], [40, 40], [40, -40], [-40, -40]]
                ]
            },
            properties: {
                'carmen:types': ['region', 'place'],
                'carmen:text': 'capital',
                'carmen:center': [0, 0]
            }
        },
        t.end
    );
});

tape('index district', t => {
    queueFeature(
        conf.district,
        {
            id: 1,
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [[-40, -40], [-40, 40], [40, 40], [40, -40], [-40, -40]]
                ]
            },
            properties: {
                'carmen:text': 'district 1',
                'carmen:center': [0, 0]
            }
        },
        t.end
    );
});

tape('index district', t => {
    queueFeature(
        conf.district,
        {
            id: 2,
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [[-40, -40], [-40, 40], [40, 40], [40, -40], [-40, -40]]
                ]
            },
            properties: {
                'carmen:text': 'district 2',
                'carmen:center': [0, 0]
            }
        },
        t.end
    );
});

tape('index place', t => {
    queueFeature(
        conf.place,
        {
            id: 2,
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [[-40, -40], [-40, 40], [40, 40], [40, -40], [-40, -40]]
                ]
            },
            properties: {
                'carmen:text': 'smallplace',
                'carmen:center': [0, 0]
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

tape('multitype reverse', t => {
    t.comment('query:  0,0');
    t.comment('result: capital');
    t.comment('note:   shifted reverse');
    c.geocode('0,0', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(
            res.features[0].place_name,
            'smallplace, district 1, capital'
        );
        t.deepEqual(res.features[0].id, 'place.2');
        t.deepEqual(res.features[0].context, [
            { id: 'district.1', text: 'district 1' },
            { id: 'region.1', text: 'capital' }
        ]);
        t.end();
    });
});

tape('multitype forward, q=capital', t => {
    t.comment('query:  capital');
    t.comment('result: capital');
    t.comment('note:   shifted forward');
    c.geocode('capital', {}, (err, res) => {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'capital');
        t.deepEqual(res.features[0].id, 'place.1');
        t.deepEqual(res.features[0].context, undefined);
        t.end();
    });
});
tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
