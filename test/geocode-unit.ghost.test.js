const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;
(() => {
    const conf = {
        region: new mem(null, () => {}),
        city: new mem(null, () => {}),
        neighborhood: new mem(null, () => {}),
        poi: new mem(null, () => {}),
    };
    const c = new Carmen(conf);
    tape('index region', (t) => {
        let region = {
            id:1,
            properties: {
                'carmen:text':'Outer Rim',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        };
        queueFeature(conf.region, region, t.end);
    });

    tape('index city 1', (t) => {
        let city = {
            id:2,
            properties: {
                'carmen:text':'Mos Eisley',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0],
                'carmen:score': -1
            }
        };
        queueFeature(conf.city, city, t.end);
    });

    tape('index city 2', (t) => {
        let city = {
            id:3,
            properties: {
                'carmen:text':'Tatooine',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0],
                'carmen:score': 1000
            }
        };
        queueFeature(conf.city, city, t.end);
    });

    tape('index neighborhood', (t) => {
        let neighborhood = {
            id:5,
            properties: {
                'carmen:text':'Mos Eisley',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0],
                'carmen:score': 10
            }
        };
        queueFeature(conf.neighborhood, neighborhood, t.end);
    });

    tape('index poi', (t) => {
        let poi = {
            id:5,
            properties: {
                'carmen:text':'Tatooine Community College',
                'carmen:center':[0,0]
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        queueFeature(conf.poi, poi, t.end);
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

    tape('Mos Eisley', (t) => {
        c.geocode('Mos Eisley Tatooine', {}, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Mos Eisley, Tatooine, Outer Rim');
            t.deepEqual(res.features[0].relevance, 1);
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();
