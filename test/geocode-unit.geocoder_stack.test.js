// byId debug geocoding queries

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

//Tests string value for index level geocoder_stack
(() => {
    const conf = {
        us: new mem(
            {
                maxzoom: 6,
                geocoder_name: 'country',
                geocoder_stack: 'us'
            },
            () => {}
        ),
        ca: new mem(
            {
                maxzoom: 6,
                geocoder_name: 'country',
                geocoder_stack: 'ca'
            },
            () => {}
        )
    };
    const c = new Carmen(conf);

    tape('index country ca', t => {
        queueFeature(
            conf.ca,
            {
                id: 1,
                properties: {
                    'carmen:text': 'Canada',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0]
                }
            },
            t.end
        );
    });

    tape('index country us', t => {
        queueFeature(
            conf.us,
            {
                id: 1,
                properties: {
                    'carmen:text': 'United States',
                    'carmen:zxy': ['6/32/32'],
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

    tape('Invalid stack - not a stack name', t => {
        c.geocode('0,0', { stacks: ['zz'] }, (err, res) => {
            t.ok(err, 'throws error');
            t.end();
        });
    });

    tape('Invalid stack - not an array', t => {
        c.geocode('0,0', { stacks: 'zz' }, (err, res) => {
            t.ok(err, 'throws error');
            t.end();
        });
    });

    tape('query filter', t => {
        c.geocode('0,0', { stacks: ['ca'] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Canada');
            t.end();
        });
    });

    tape('query filter - will be lowercased', t => {
        c.geocode('0,0', { stacks: ['CA'] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Canada');
            t.end();
        });
    });

    tape('query filter', t => {
        c.geocode('United States', { stacks: ['ca'] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features.length, 0);
            t.end();
        });
    });

    tape('query filter - reverse (ca)', t => {
        c.geocode('0,0', { stacks: ['ca'] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].place_name, 'Canada');
            t.end();
        });
    });
    tape('query filter - reverse (us)', t => {
        c.geocode('0,0', { stacks: ['us'] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].place_name, 'United States');
            t.end();
        });
    });
})();

//Tests array values for index level geocoder_stack
(() => {
    const conf = {
        country: new mem(
            {
                maxzoom: 6,
                geocoder_stack: ['us', 'ca']
            },
            () => {}
        ),
        place: new mem(
            {
                maxzoom: 6,
                geocoder_stack: ['ca', 'us']
            },
            () => {}
        )
    };
    const c = new Carmen(conf);

    tape('index country ca', t => {
        queueFeature(
            conf.country,
            {
                id: 1,
                properties: {
                    'carmen:text': 'Canada',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0],
                    'carmen:geocoder_stack': 'ca'
                }
            },
            t.end
        );
    });
    tape('index country us', t => {
        queueFeature(
            conf.country,
            {
                id: 2,
                properties: {
                    'carmen:text': 'United States',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0],
                    'carmen:geocoder_stack': 'us'
                }
            },
            t.end
        );
    });
    tape('index place us', t => {
        queueFeature(
            conf.place,
            {
                id: 1,
                properties: {
                    'carmen:text': 'Place',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0],
                    'carmen:geocoder_stack': 'us'
                }
            },
            t.end
        );
    });
    tape('index place ca', t => {
        queueFeature(
            conf.place,
            {
                id: 2,
                properties: {
                    'carmen:text': 'Place',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0],
                    'carmen:geocoder_stack': 'ca'
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

    //Features are first filtered by the index level geocoder_stack
    //At the end each feature is then filtered by the feature level geocoder_stack
    tape('dual filter', t => {
        c.geocode('Place', { stacks: ['us'] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('dual filter', t => {
        c.geocode('Place', { stacks: ['ca'] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'place.2');
            t.end();
        });
    });
})();

//Test mixed string/array index level geocoder stack
// Test mixed feature level / non existant geocoder_stack tags
//    - Lack of geocoder_stack should make them able to appear in all stacks
(() => {
    const conf = {
        country: new mem(
            {
                maxzoom: 6,
                geocoder_stack: ['us', 'ca']
            },
            () => {}
        ),
        place: new mem(
            {
                maxzoom: 6,
                geocoder_stack: 'ca'
            },
            () => {}
        )
    };
    const c = new Carmen(conf);

    tape('index country ca', t => {
        queueFeature(
            conf.country,
            {
                id: 1,
                properties: {
                    'carmen:text': 'Canada',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0]
                }
            },
            t.end
        );
    });
    tape('index country us', t => {
        queueFeature(
            conf.country,
            {
                id: 2,
                properties: {
                    'carmen:text': 'United States',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0]
                }
            },
            t.end
        );
    });
    tape('index place ca', t => {
        queueFeature(
            conf.place,
            {
                id: 1,
                properties: {
                    'carmen:text': 'Tess',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0],
                    'carmen:geocoder_stack': 'ca'
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

    tape('Canada', t => {
        c.geocode('Canada', { stacks: ['ca'] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'country.1');
            t.end();
        });
    });
    tape('United States', t => {
        c.geocode('United States', { stacks: ['us'] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'country.2');
            t.end();
        });
    });
    tape('Place', t => {
        c.geocode('Tess, Canada', { stacks: ['ca'] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'place.1');
            t.end();
        });
    });
})();

// Test idx assignment
(() => {
    const conf = {
        country: new mem(
            {
                maxzoom: 6,
                geocoder_stack: ['us', 'ca']
            },
            () => {}
        ),
        place: new mem(
            {
                maxzoom: 6,
                geocoder_stack: ['us', 'ca']
            },
            () => {}
        )
    };
    const c = new Carmen(conf);

    tape('index country high score (us)', t => {
        queueFeature(
            conf.country,
            {
                id: 1,
                properties: {
                    'carmen:text': 'XXX',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0],
                    'carmen:score': 999,
                    'carmen:geocoder_stack': 'us'
                }
            },
            t.end
        );
    });
    tape('index place low score (ca)', t => {
        queueFeature(
            conf.place,
            {
                id: 2,
                properties: {
                    'carmen:text': 'XXX',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0],
                    'carmen:score': 0,
                    'carmen:geocoder_stack': 'ca'
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

    tape('check stack/idx agreement', t => {
        c.geocode('XXX', { stacks: ['ca'] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'place.2');
            t.end();
        });
    });
})();

//Test existing/non-existing index level geocoder_stack
(() => {
    const conf = {
        country: new mem(
            {
                maxzoom: 6
            },
            () => {}
        ),
        place: new mem(
            {
                maxzoom: 6,
                geocoder_stack: ['ca', 'us']
            },
            () => {}
        )
    };
    const c = new Carmen(conf);

    tape('index country ca', t => {
        queueFeature(
            conf.country,
            {
                id: 1,
                properties: {
                    'carmen:text': 'Canada',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0]
                }
            },
            t.end
        );
    });
    tape('index country us', t => {
        queueFeature(
            conf.country,
            {
                id: 2,
                properties: {
                    'carmen:text': 'United States',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0]
                }
            },
            t.end
        );
    });
    tape('index place ca', t => {
        queueFeature(
            conf.place,
            {
                id: 1,
                properties: {
                    'carmen:text': 'Tess',
                    'carmen:zxy': ['6/32/32'],
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

    tape('Canada', t => {
        c.geocode('Canada', { stacks: ['ca'] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'country.1');
            t.end();
        });
    });
    tape('United States', t => {
        c.geocode('United States', { stacks: ['us'] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'country.2');
            t.end();
        });
    });
    tape('Place', t => {
        c.geocode('Tess, Canada', { stacks: ['ca'] }, (err, res) => {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'place.1');
            t.end();
        });
    });
})();
tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
