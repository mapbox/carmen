// Tests New York (place), New York (region), USA (country)
// identically-named features should reverse the gappy penalty and
// instead prioritize the highest-index feature

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    country: new mem({ maxzoom: 6 }, () => {}),
    region: new mem({ maxzoom: 6 }, () => {}),
    district: new mem({ maxzoom: 6 }, () => {}),
    place: new mem({ maxzoom: 6, geocoder_inherit_score: true }, () => {}),
    poi: new mem({ maxzoom: 14 }, () => {})
};

const c = new Carmen(conf);

tape('index country', t => {
    queueFeature(
        conf.country,
        {
            id: 1,
            properties: {
                'carmen:score': 5,
                'carmen:text': 'usa',
                'carmen:geocoder_stack': 'us'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [-126.5625, 19.973348786110602],
                        [-126.5625, 50.28933925329178],
                        [-67.5, 50.28933925329178],
                        [-67.5, 19.973348786110602],
                        [-126.5625, 19.973348786110602]
                    ]
                ]
            }
        },
        t.end
    );
});

tape('index region', t => {
    queueFeature(
        conf.region,
        {
            id: 2,
            properties: {
                'carmen:score': 3,
                'carmen:text': 'new york,ny',
                'carmen:geocoder_stack': 'us'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [-80.96923828125, 39.87601941962116],
                        [-80.96923828125, 45.66012730272194],
                        [-71.630859375, 45.66012730272194],
                        [-71.630859375, 39.87601941962116],
                        [-80.96923828125, 39.87601941962116]
                    ]
                ]
            }
        },
        t.end
    );
});

tape('index place', t => {
    queueFeature(
        conf.place,
        {
            id: 3,
            properties: {
                'carmen:score': 1,
                'carmen:text': 'new york,nyc',
                'carmen:geocoder_stack': 'us'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [-74.05265808105469, 40.71135347314246],
                        [-74.05265808105469, 40.837710162420045],
                        [-73.88099670410156, 40.837710162420045],
                        [-73.88099670410156, 40.71135347314246],
                        [-74.05265808105469, 40.71135347314246]
                    ]
                ]
            }
        },
        t.end
    );
});

tape('index poi', t => {
    queueFeature(
        conf.poi,
        {
            id: 4,
            properties: {
                'carmen:score': null,
                'carmen:text': 'new york',
                'carmen:center': [-73.9666, 40.78115],
                'carmen:geocoder_stack': 'us'
            },
            geometry: {
                type: 'Point',
                coordinates: [-73.9666, 40.7811]
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

tape("let's find new york", t => {
    c.geocode('new york usa', {}, (err, res) => {
        t.equal(res.features[0].id, 'place.3');
        t.equal(res.features[0].relevance, 1);
        t.end();
    });
});

tape('ensure POI cannot win', t => {
    c.geocode(
        'new york usa',
        { types: ['poi', 'district', 'region', 'country'] },
        (err, res) => {
            t.equal(res.features[0].id, 'region.2');
            t.equal(res.features[0].relevance, 1);
            t.end();
        }
    );
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});

const conf2 = {
    country: new mem({ maxzoom: 6 }, () => {}),
    region: new mem({ maxzoom: 6, geocoder_inherit_score: true }, () => {}),
    district: new mem({ maxzoom: 6, geocoder_inherit_score: true }, () => {}),
    place: new mem({ maxzoom: 6, geocoder_inherit_score: true }, () => {})
};
const c2 = new Carmen(conf2);

tape('index country', t => {
    queueFeature(
        conf2.country,
        {
            id: 10,
            properties: {
                'carmen:score': 10,
                'carmen:text': 'Thailand',
                'carmen:geocoder_stack': 'th'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [99.90966796875, 13.325484885597936],
                        [99.90966796875, 14.381476281951624],
                        [101.1236572265625, 14.381476281951624],
                        [101.1236572265625, 13.325484885597936],
                        [99.90966796875, 13.325484885597936]
                    ]
                ]
            }
        },
        t.end
    );
});

['region', 'district', 'place'].forEach((f, i) => {
    tape('index ' + f, t => {
        queueFeature(
            conf2[f],
            {
                id: i + 1,
                properties: {
                    'carmen:score': 5 - i,
                    'carmen:text': 'Nonthaburi',
                    'carmen:geocoder_stack': 'th'
                },
                geometry: {
                    type: 'Polygon',
                    coordinates: [
                        [
                            [100.49571990966797, 13.843746953264152],
                            [100.49571990966797, 13.878746052885328],
                            [100.52970886230467, 13.878746052885328],
                            [100.52970886230467, 13.843746953264152],
                            [100.49571990966797, 13.843746953264152]
                        ]
                    ]
                }
            },
            t.end
        );
    });
});
tape('build queued features', t => {
    const q = queue();
    Object.keys(conf2).forEach(c => {
        q.defer(cb => {
            buildQueued(conf2[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('nonthaburi', t => {
    c2.geocode('nonthaburi', {}, (err, res) => {
        t.equal(
            res.features[0].id.split('.')[0],
            'place',
            'lead feature is place'
        );
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
