// Test score handling across indexes

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// Confirms that you can forward search a ghost feature and that a scored featre will always win
(() => {
    const conf = { place: new mem(null, () => {}) };
    const c = new Carmen(conf);
    tape('index place', t => {
        let place = {
            id: 1,
            properties: {
                'carmen:score': 100,
                'carmen:text': 'fairfax',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        };
        queueFeature(conf.place, place, t.end);
    });
    tape('index ghost place', t => {
        let place = {
            id: 2,
            properties: {
                'carmen:score': -1,
                'carmen:text': 'mclean',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        };
        queueFeature(conf.place, place, t.end);
    });
    tape('index zip+4', t => {
        let place = {
            id: 3,
            properties: {
                'carmen:score': -1,
                'carmen:text': '20003-2004',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        };
        queueFeature(conf.place, place, t.end);
    });
    tape('index zip', t => {
        let place = {
            id: 4,
            properties: {
                'carmen:score': 100,
                'carmen:text': '20009',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        };
        queueFeature(conf.place, place, t.end);
    });
    tape('index ghost zip', t => {
        let place = {
            id: 5,
            properties: {
                'carmen:score': -1,
                'carmen:text': '20009',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        };
        queueFeature(conf.place, place, () => {
            buildQueued(conf.place, t.end);
        });
    });
    tape('fairfax', t => {
        c.geocode('fairfax', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'fairfax');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('mclean', t => {
        c.geocode('mclean', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'mclean');
            t.deepEqual(res.features[0].id, 'place.2');
            t.end();
        });
    });
    tape('scored feature beats ghost', t => {
        c.geocode('20009', { limit_verify: 2 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features.length, 1, 'ghost feature deduped');
            t.deepEqual(res.features[0].place_name, '20009');
            t.deepEqual(res.features[0].id, 'place.4');
            t.end();
        });
    });
    tape('exact match bests score', t => {
        c.geocode('20003-2004', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, '20003-2004');
            t.deepEqual(res.features[0].id, 'place.3');
            t.end();
        });
    });
})();

// Confirm that for equally relevant features across three indexes
// the first in hierarchy beats the others. (NO SCORES)
(() => {
    const conf = {
        country: new mem(null, () => {}),
        province: new mem(null, () => {}),
        city: new mem(null, () => {})
    };
    const c = new Carmen(conf);
    tape('index country', t => {
        let country = {
            id: 1,
            properties: {
                'carmen:text': 'china',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        };
        queueFeature(conf.country, country, t.end);
    });
    tape('index province', t => {
        let province = {
            id: 1,
            properties: {
                'carmen:text': 'china',
                'carmen:zxy': ['6/34/32'],
                'carmen:center': [360 / 64 * 2, 0]
            }
        };
        queueFeature(conf.province, province, t.end);
    });
    tape('index city', t => {
        let city = {
            id: 1,
            properties: {
                'carmen:text': 'china',
                'carmen:zxy': ['6/36/32'],
                'carmen:center': [360 / 64 * 4, 0]
            }
        };
        queueFeature(conf.city, city, t.end);
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
    tape('china', t => {
        c.geocode('china', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'china');
            t.deepEqual(res.features[0].id, 'country.1');
            t.end();
        });
    });
})();

// Confirm that for equally relevant features across three indexes
// the one with the highest score beats the others.
(() => {
    const conf = {
        country: new mem(null, () => {}),
        province: new mem(null, () => {}),
        city: new mem(null, () => {})
    };
    const c = new Carmen(conf);
    tape('index country', t => {
        let country = {
            id: 1,
            properties: {
                'carmen:score': 5,
                'carmen:text': 'china',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        };
        queueFeature(conf.country, country, t.end);
    });
    tape('index province', t => {
        let province = {
            id: 2,
            properties: {
                'carmen:score': 10,
                'carmen:text': 'china',
                'carmen:zxy': ['6/34/32'],
                'carmen:center': [360 / 64 * 2, 0]
            }
        };
        queueFeature(conf.province, province, t.end);
    });
    tape('index city', t => {
        let city = {
            id: 3,
            properties: {
                'carmen:score': 6,
                'carmen:text': 'china',
                'carmen:zxy': ['6/36/32'],
                'carmen:center': [360 / 64 * 4, 0]
            }
        };
        queueFeature(conf.city, city, t.end);
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
    tape('china', t => {
        c.geocode(
            'china',
            { limit_verify: 3, allow_dupes: true },
            (err, res) => {
                t.ifError(err);
                t.deepEqual(res.features[0].id, 'province.2');
                t.deepEqual(res.features[1].id, 'city.3');
                t.deepEqual(res.features[2].id, 'country.1');
                t.deepEqual(res.features.length, 3);
                t.end();
            }
        );
    });
    tape('china (dedupe)', t => {
        c.geocode('china', { limit_verify: 3 }, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features[0].id, 'province.2');
            t.deepEqual(res.features.length, 1);
            t.end();
        });
    });
})();

// confirm that a feature queried by id has a relevance set to 1
(() => {
    const conf = {
        country: new mem(null, () => {})
    };
    const c = new Carmen(conf);
    tape('index country', t => {
        let country = {
            id: 1,
            properties: {
                'carmen:score': 5,
                'carmen:text': 'usa',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        };
        queueFeature(conf.country, country, () => {
            buildQueued(conf.country, t.end);
        });
    });

    tape('query by id', t => {
        c.geocode('country.1', null, (err, res) => {
            t.ifError(err);
            t.deepEqual(res.features[0].relevance, 1, 'relevance is 1');
            t.deepEqual(res.features.length, 1);
            t.end();
        });
    });
})();

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
