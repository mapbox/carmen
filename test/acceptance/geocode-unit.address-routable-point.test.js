// Tests whether routable_points is added to geocoding results
'use strict';
const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const { queueFeature, buildQueued } = require('../../lib/indexer/addfeature');

// Test non-interpolated address routable_points
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1, geocoder_routable:1, geocoder_format: '{{address.number}} {{address.name}} {{place.name}}, {{region.name}} {{postcode.name}}, {{country.name}}' }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {
        const address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0], // not used
                'carmen:addressnumber': [null, ['9','11','13']],
                'carmen:types': ['address']
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [
                    {
                        type: 'MultiLineString',
                        coordinates: [
                            [
                                [1.111, 1.11],
                                [1.112, 1.11],
                                [1.114, 1.11],
                                [1.115, 1.11]
                            ]
                        ]
                    },
                    {
                        type: 'MultiPoint',
                        coordinates: [[1.111, 1.111], [1.113, 1.111], [1.115, 1.111]]
                    }
                ]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('Forward search for non-interpolated address and return routable points', (t) => {
        c.geocode('9 fake street', { debug: true, routing: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                {
                    points: [{ coordinates: [1.111, 1.11] }]
                },
                'Forward geocode of non-interpolated address result has correct routable_point');
            t.end();
        });
    });

    tape('Geocode for non-interpolated address without routing', (t) => {
        c.geocode('9 fake street', {}, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                undefined,
                'Forward geocode without routing: true does not set routable_points on response'
            );
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();


// Test non-interpolated address routable_points with override
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1, geocoder_routable:1, geocoder_format: '{{address.number}} {{address.name}} {{place.name}}, {{region.name}} {{postcode.name}}, {{country.name}}' }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {
        const address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0], // not used
                'carmen:addressnumber': [null, ['9','11','13']],
                'carmen:types': ['address'],
                'carmen:routable_points': [
                    2.111,
                    2.11
                ],
                'carmen:addressprops': {
                    'carmen:routable_points': {
                        '1': [
                            3.111,
                            3.11
                        ],
                        '2': null
                    }
                }
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [
                    {
                        type: 'MultiLineString',
                        coordinates: [
                            [
                                [1.111, 1.11],
                                [1.112, 1.11],
                                [1.114, 1.11],
                                [1.115, 1.11]
                            ]
                        ]
                    },
                    {
                        type: 'MultiPoint',
                        coordinates: [[1.111, 1.111], [1.113, 1.111], [1.115, 1.111]]
                    }
                ]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('Forward search for non-interpolated address with override and return routable points', (t) => {
        c.geocode('9 fake street', { debug: true, routing: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                {
                    points: [{ coordinates: [2.111, 2.11] }]
                },
                'Forward geocode of non-interpolated address result has correct routable_point');
            t.end();
        });
    });

    tape('Geocode for non-interpolated address with in-cluster routable points override', (t) => {
        c.geocode('11 fake street', { debug: true, routing: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                {
                    points: [{ coordinates: [3.111, 3.11] }]
                },
                'Forward geocode of non-interpolated address result has correct routable_point');
            t.end();
        });
    });

    tape('Geocode for non-interpolated address with no routable points override', (t) => {
        c.geocode('13 fake street', { debug: true, routing: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                {
                    points: [{ coordinates: [1.115, 1.11] }]
                },
                'Forward geocode of non-interpolated address result has correct routable_point');
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();


// Test interpolated address
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1, geocoder_routable:1, geocoder_format: '{{address.number}} {{address.name}} {{place.name}}, {{region.name}} {{postcode.name}}, {{country.name}}' }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {

        const address = {
            id: '7654',
            type: 'Feature',
            properties: {
                'carmen:text': 'Main Street',
                'carmen:center': [-97.2, 37.3],
                'carmen:score': 99,
                'carmen:rangetype': 'tiger',
                'carmen:lfromhn': ['100'],
                'carmen:ltohn': ['200'],
                'carmen:rfromhn': ['101'],
                'carmen:rtohn': ['199'],
                'carmen:parityl': ['E'],
                'carmen:parityr': ['O'],
            },
            geometry: {
                type: 'MultiLineString',
                coordinates: [
                    [
                        [-97.2, 37.2],
                        [-97.2, 37.4]
                    ]
                ]
            }
        };

        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('Forward search for interpolated address', (t) => {
        c.geocode('150 Main Street', { routing: true, debug: true, full: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points.points,
                [{ coordinates: res.features[0].geometry.coordinates }],
                'Forward geocode of interpolated address result should return existing coordinates'
            );
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();


// Test feature that doesn't have linestring data
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1, geocoder_routable:1, geocoder_format: '{{address.number}} {{address.name}} {{place.name}}, {{region.name}} {{postcode.name}}, {{country.name}}' }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {
        const address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['9','10','7']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[0,0],[0,0]]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('Forward search for address with no LineString data', (t) => {
        c.geocode('9 fake street', { routing: true, debug: true, full: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points.points,
                null,
                'Forward geocode of address with no LineString data returns no routable_points');
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });

})();


// Test POI
(() => {
    const conf = {
        poi : new mem({ maxzoom: 6, geocoder_routable:1 }, () => {})
    };
    const c = new Carmen(conf);

    tape('index POI', (t) => {
        const poi = {
            'type': 'Feature',
            'id': 6666777777982370,
            'geometry': {
                'type': 'Point',
                'coordinates': [-122.22083333333, 37.721388888889]
            },
            'properties': {
                'carmen:center': [-122.22083, 37.72139],
                'carmen:geocoder_stack': 'us',
                'carmen:score': 196,
                'landmark': true,
                'wikidata': 'Q1165584',
                'carmen:text_universal': 'OAK',
                'tel': '(510) 563-3300',
                'category': 'airport',
                'address': '1 Airport Dr',
                'carmen:text': 'Oakland International Airport,OAK,KOAK, Metropolitan Oakland International Airport, airport'
            }
        };
        queueFeature(conf.poi, poi, () => { buildQueued(conf.poi, t.end); });
    });

    tape('Forward search for POI with routing', (t) => {
        c.geocode('Oakland International Airport', { routing: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points.points,
                null,
                'Forward search for POI returns found: false, supported_type: false, and points: null'
            );
            t.end();
        });
    });

    tape('Forward search for POI without routing', (t) => {
        c.geocode('Oakland International Airport', {}, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                undefined,
                'Forward search for POI without routing does not return routable_points'
            );
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();

// Test non-routable layer, like countries
(() => {
    const conf = {
        country: new mem({ maxzoom: 6 }, () => {})
    };
    const c = new Carmen(conf);

    tape('index country', (assert) => {
        queueFeature(conf.country, {
            id:2,
            properties: {
                'carmen:text': 'Sweden',
                'carmen:center': [0,0]
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[
                    [-1,-1],
                    [-1, 1],
                    [1, 1],
                    [1,-1],
                    [-1,-1]
                ]]
            }
        }, () => {
            buildQueued(conf.country, assert.end);
        });
    });

    tape('Forward search for country with routing=true', (t) => {
        c.geocode('Sweden', { routing: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                undefined,
                'Forward search for non-routable feature type does not return routable_points'
            );
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();

// Test reverse geocoding
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1, geocoder_routable:1, geocoder_format: '{{address.number}} {{address.name}} {{place.name}}, {{region.name}} {{postcode.name}}, {{country.name}}' }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {
        const address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0], // not used
                'carmen:addressnumber': [null, ['9','11','13']],
                'carmen:types': ['address']
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [
                    {
                        type: 'MultiLineString',
                        coordinates: [
                            [
                                [1.111, 1.11],
                                [1.112, 1.11],
                                [1.114, 1.11],
                                [1.115, 1.11]
                            ]
                        ]
                    },
                    {
                        type: 'MultiPoint',
                        coordinates: [[1.111, 1.111], [1.113, 1.111], [1.115, 1.111]]
                    }
                ]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });

    tape('Reverse geocode with routing', (t) => {
        c.geocode('1.111, 1.111', { routing: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                {
                    points: [{ coordinates: [1.111, 1.11] }]
                },
                'Reverse geocode with routing sets routable_points.points to false'
            );
            t.end();
        });
    });
    tape('Reverse geocode without routing', (t) => {
        c.geocode('1.111, 1.111', {}, (err, res) => {
            t.ifError(err);
            t.deepEquals(res.features[0].routable_points,
                undefined,
                'Reverse geocode without routing does not set routable_points'
            );
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();

// Test where limit is > 1, all address features should have routable_points
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1, geocoder_routable:1, geocoder_format: '{{address.number}} {{address.name}} {{place.name}}, {{region.name}} {{postcode.name}}, {{country.name}}' }, () => {}),
    };
    const c = new Carmen(conf);
    const address1 = {
        id: 1,
        properties: {
            'carmen:text': 'fake street',
            'carmen:center': [0,0], // not used
            'carmen:addressnumber': [null, ['9','11','13']],
            'carmen:types': ['address']
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [
                {
                    type: 'MultiLineString',
                    coordinates: [
                        [
                            [1.111, 1.11],
                            [1.112, 1.11],
                            [1.114, 1.11],
                            [1.115, 1.11]
                        ]
                    ]
                },
                {
                    type: 'MultiPoint',
                    coordinates: [[1.111, 1.111], [1.113, 1.111], [1.115, 1.111]]
                }
            ]
        }
    };

    const address2 = {
        id: 2,
        properties: {
            'carmen:text': 'fake street',
            'carmen:center': [2,2], // not used
            'carmen:addressnumber': [null, ['9','11','13']],
            'carmen:types': ['address']
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [
                {
                    type: 'MultiLineString',
                    coordinates: [
                        [
                            [2.111, 2.11],
                            [2.112, 2.11],
                            [2.114, 2.11],
                            [2.115, 2.11]
                        ]
                    ]
                },
                {
                    type: 'MultiPoint',
                    coordinates: [[2.111, 2.111], [2.113, 2.111], [2.115, 2.111]]
                }
            ]
        }
    };

    tape('index address1', (t) => {
        queueFeature(conf.address, address1, t.end);
    });
    tape('index address2', (t) => {
        queueFeature(conf.address, address2, t.end);
    });

    tape('build address index', (t) => {
        buildQueued(conf.address, t.end);
    });

    tape('Forward search for address with multiple results', (t) => {
        c.geocode('9 fake street', { routing: true, types: ['address'], limit: 5, allow_dupes: true }, (err, res) => {
            t.ifError(err);
            t.deepEquals(
                res.features[0].routable_points,
                { points: [{ coordinates: [2.111, 2.11] }] },
                'First address should have correct routable points'
            );
            t.deepEquals(
                res.features[1].routable_points,
                { points: [{ coordinates: [1.111, 1.11] }] },
                'Second address should have correct routable points'
            );
            t.end();
        });
    });
    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
