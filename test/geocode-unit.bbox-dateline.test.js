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

tape('index feature', (t) => {
    let feature = {
        id:102,
        properties: {
            'carmen:text':'USA',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:score': 1,
        },
        "geometry": {
                "type": "Polygon",
                "coordinates": [
                  [
                    [
                      -179.330951,
                      -14.6528
                    ],
                    [
                      -179.330951,
                      71.540724
                    ],
                    [
                      179.959578,
                      71.540724
                    ],
                    [
                      179.959578,
                      -14.6528
                    ],
                    [
                      -179.330951,
                      -14.6528
                    ]
                  ]
                ]
              }
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
        t.end();
    });
});


tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
