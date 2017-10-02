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
        address: new mem({ maxzoom: 12, geocoder_address: 1 }, () => {}),
        poi: new mem({ maxzoom: 12 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index address', t => {
        let address = {
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'fake street',
                'carmen:addressnumber': [100],
                'carmen:center': [-77.04312264919281, 38.91041215085371]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[-77.04312264919281, 38.91041215085371]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });
    tape('index poi', t => {
        let poi = {
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'big bank',
                'carmen:center': [-77.04441547393799, 38.909427030614665]
            },
            geometry: {
                type: 'Point',
                coordinates: [-77.04441547393799, 38.909427030614665]
            }
        };
        queueFeature(conf.poi, poi, t.end);
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

    tape('query on address but still returns poi due to index order', t => {
        c.geocode('-77.04312264919281,38.91041215085371', {}, (err, res) => {
            t.ifError(err);
            t.equals(
                res.features[0].place_name,
                'big bank, fake street',
                'found POI'
            );
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });

    tape('query on address with type poi', t => {
        c.geocode(
            '-77.04312264919281,38.91041215085371',
            { types: ['poi'] },
            (err, res) => {
                t.ifError(err);
                t.equals(
                    res.features[0].place_name,
                    'big bank, fake street',
                    'found POI'
                );
                t.equals(res.features[0].relevance, 1);
                t.end();
            }
        );
    });
    tape('query on poi with type address', t => {
        c.geocode(
            '-77.04441547393799,38.909427030614665',
            { types: ['address'] },
            (err, res) => {
                t.ifError(err);
                t.equals(
                    res.features[0].place_name,
                    '100 fake street',
                    'found address'
                );
                t.equals(res.features[0].relevance, 1);
                t.end();
            }
        );
    });
})();

(() => {
    const conf = {
        address: new mem(
            {
                maxzoom: 12,
                geocoder_name: 'address',
                geocoder_type: 'address',
                geocoder_address: 1
            },
            () => {}
        ),
        poi: new mem(
            { maxzoom: 12, geocoder_name: 'address', geocoder_type: 'poi' },
            () => {}
        )
    };
    const c = new Carmen(conf);
    tape('index address', t => {
        let address = {
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'fake street',
                'carmen:addressnumber': [100],
                'carmen:center': [-77.04312264919281, 38.91041215085371]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[-77.04312264919281, 38.91041215085371]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });
    tape('index poi', t => {
        let poi = {
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'big bank',
                'carmen:center': [-77.04441547393799, 38.909427030614665]
            },
            geometry: {
                type: 'Point',
                coordinates: [-77.04441547393799, 38.909427030614665]
            }
        };
        queueFeature(conf.poi, poi, t.end);
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
    tape('address query returns address', t => {
        c.geocode('-77.04312264919281,38.91041215085371', {}, (err, res) => {
            t.ifError(err);
            t.equals(
                res.features[0].place_name,
                '100 fake street',
                'found address'
            );
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });
    tape('poi query returns poi', t => {
        c.geocode('-77.04441547393799,38.909427030614665', {}, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'big bank', 'found POI');
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });
    tape('query on address with type poi', t => {
        c.geocode(
            '-77.04312264919281,38.91041215085371',
            { types: ['poi'] },
            (err, res) => {
                t.ifError(err);
                t.equals(res.features.length, 1);
                t.equals(res.features[0].place_name, 'big bank');
                t.end();
            }
        );
    });
    tape('query on poi with type address', t => {
        c.geocode(
            '-77.04441547393799,38.909427030614665',
            { types: ['address'] },
            (err, res) => {
                t.ifError(err);
                t.equals(res.features.length, 1);
                t.equals(res.features[0].place_name, '100 fake street');
                t.end();
            }
        );
    });
})();

(() => {
    const conf = {
        address: new mem(
            {
                maxzoom: 12,
                geocoder_name: 'address',
                geocoder_type: 'address',
                geocoder_address: 1
            },
            () => {}
        ),
        poi: new mem(
            { maxzoom: 12, geocoder_name: 'address', geocoder_type: 'poi' },
            () => {}
        )
    };
    const c = new Carmen(conf);
    tape('index address', t => {
        let address = {
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'fake street',
                'carmen:addressnumber': [100],
                'carmen:center': [-77.04312264919281, 38.91041215085371]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[-77.04312264919281, 38.91041215085371]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });
    tape('index poi', t => {
        let poi = {
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'big bank',
                'carmen:center': [-77.04320579767227, 38.910435109001334]
            },
            geometry: {
                type: 'Point',
                coordinates: [-77.04320579767227, 38.910435109001334]
            }
        };
        queueFeature(conf.poi, poi, t.end);
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
    tape('return poi if type filtering removes address', t => {
        c.geocode(
            '-77.04320579767227,38.910435109001334',
            { types: ['poi'] },
            (err, res) => {
                t.ifError(err);
                t.equals(res.features.length, 1);
                t.equals(res.features[0].place_name, 'big bank');
                t.end();
            }
        );
    });
    tape('return address if type filtering removes poi', t => {
        c.geocode(
            '-77.04312264919281,38.91041215085371',
            { types: ['address'] },
            (err, res) => {
                t.ifError(err);
                t.equals(res.features.length, 1);
                t.equals(res.features[0].place_name, '100 fake street');
                t.end();
            }
        );
    });
})();

(() => {
    const conf = {
        place: new mem({ maxzoom: 12 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index place', t => {
        let place = {
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'Logan Circle',
                'carmen:center': [-77.03463077545165, 38.90976931970528]
            },
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [-77.0387077331543, 38.90803281165565],
                        [-77.0387077331543, 38.91167275087875],
                        [-77.02815055847168, 38.91167275087875],
                        [-77.02815055847168, 38.90803281165565],
                        [-77.0387077331543, 38.90803281165565]
                    ]
                ]
            }
        };
        queueFeature(conf.place, place, t.end);
    });
    tape('index place', t => {
        let place = {
            id: 2,
            type: 'Feature',
            properties: {
                'carmen:text': 'Dupont Circle',
                'carmen:center': [-77.04342842102051, 38.90963574367117]
            },
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [-77.0387077331543, 38.90803281165565],
                        [-77.0387077331543, 38.91167275087875],
                        [-77.02815055847168, 38.91167275087875],
                        [-77.02815055847168, 38.90803281165565],
                        [-77.0387077331543, 38.90803281165565]
                    ]
                ]
            }
        };
        queueFeature(conf.place, place, t.end);
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
    tape('Overlapping places return closest centroid', t => {
        c.geocode('-77.0378065109253,38.909836107628074', {}, (err, res) => {
            t.ifError(err);
            t.equals(
                res.features[0].place_name,
                'Logan Circle',
                'found Logan Circle'
            );
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });
})();

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
