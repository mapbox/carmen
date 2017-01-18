// Tests New York (place), New York (region), USA (country)
// identically-named features should reverse the gappy penalty and
// instead prioritize the highest-index feature

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem({ maxzoom: 6 }, function() {}),
    region: new mem({ maxzoom: 6 }, function() {}),
    district: new mem({ maxzoom: 6 }, function() {}),
    place: new mem({ maxzoom: 6, geocoder_inherit_score: true }, function() {}),
    poi: new mem({ maxzoom: 14 }, function() {})
};

var c = new Carmen(conf);

tape('index country', function(t) {
    addFeature(conf.country, {
        id:1,
        properties: {
            'carmen:score': 5,
            'carmen:text':'usa',
            'carmen:geocoder_stack':'us'
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -126.5625,
                        19.973348786110602
                    ],
                    [
                        -126.5625,
                        50.28933925329178
                    ],
                    [
                        -67.5,
                        50.28933925329178
                    ],
                    [
                        -67.5,
                        19.973348786110602
                    ],
                    [
                        -126.5625,
                        19.973348786110602
                    ]
                ]
            ]
        }
    }, t.end);
});

tape('index region', function(t) {
    addFeature(conf.region, {
        id: 2,
        properties: {
            'carmen:score':3,
            'carmen:text':'new york,ny',
            'carmen:geocoder_stack':'us'
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -80.96923828125,
                        39.87601941962116
                    ],
                    [
                        -80.96923828125,
                        45.66012730272194
                    ],
                    [
                        -71.630859375,
                        45.66012730272194
                    ],
                    [
                        -71.630859375,
                        39.87601941962116
                    ],
                    [
                        -80.96923828125,
                        39.87601941962116
                    ]
                ]
            ]
        }
    }, t.end);
});


tape('index place', function(t) {
    addFeature(conf.place, {
        id: 3,
        properties: {
            'carmen:score':1,
            'carmen:text':'new york,nyc',
            'carmen:geocoder_stack':'us'
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -74.05265808105469,
                        40.71135347314246
                    ],
                    [
                        -74.05265808105469,
                        40.837710162420045
                    ],
                    [
                        -73.88099670410156,
                        40.837710162420045
                    ],
                    [
                        -73.88099670410156,
                        40.71135347314246
                    ],
                    [
                        -74.05265808105469,
                        40.71135347314246
                    ]
                ]
            ]
        }
    }, t.end);
});

tape('index poi', function(t) {
    addFeature(conf.poi, {
        id:4,
        properties: {
            'carmen:score': null,
            'carmen:text':'new york',
            'carmen:center': [-73.9666, 40.78115],
            'carmen:geocoder_stack':'us'
        },
        geometry: {
            type: "Point",
            coordinates: [-73.9666, 40.7811]
        }
    }, t.end);
});

tape('let\'s find new york', function(t) {
    c.geocode('new york usa', {}, function(err, res) {
        t.equal(res.features[0].id, 'place.3');
        t.equal(res.features[0].relevance, 1);
        t.end();
    });
});

tape('ensure POI cannot win', function(t) {
    c.geocode('new york usa', { types: ['poi', 'district', 'region', 'country']}, function(err, res) {
        t.equal(res.features[0].id, 'region.2');
        t.equal(res.features[0].relevance, 1);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});



var conf2 = {
    country: new mem({ maxzoom: 6 }, function() {}),
    region: new mem({ maxzoom: 6, geocoder_inherit_score: true }, function() {}),
    district: new mem({ maxzoom: 6, geocoder_inherit_score: true }, function() {}),
    place: new mem({ maxzoom: 6, geocoder_inherit_score: true }, function() {})
};
var c2 = new Carmen(conf2);

tape('index country', function(t) {
    addFeature(conf2.country, {
        id: 10,
        properties: {
            'carmen:score': 10,
            'carmen:text':'Thailand',
            'carmen:geocoder_stack':'th'
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        99.90966796875,
                        13.325484885597936
                    ],
                    [
                        99.90966796875,
                        14.381476281951624
                    ],
                    [
                        101.1236572265625,
                        14.381476281951624
                    ],
                    [
                        101.1236572265625,
                        13.325484885597936
                    ],
                    [
                        99.90966796875,
                        13.325484885597936
                    ]
                ]
            ]
        }
    }, t.end);
});

['region', 'district', 'place'].forEach(function(f, i) {
    tape('index ' + f, function(t) {
        addFeature(conf2[f], {
            id: i + 1,
            properties: {
                'carmen:score': 5 - i,
                'carmen:text': 'Nonthaburi',
                'carmen:geocoder_stack': 'th'
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [
                            100.49571990966797,
                            13.843746953264152
                        ],
                        [
                            100.49571990966797,
                            13.878746052885328
                        ],
                        [
                            100.52970886230467,
                            13.878746052885328
                        ],
                        [
                            100.52970886230467,
                            13.843746953264152
                        ],
                        [
                            100.49571990966797,
                            13.843746953264152
                        ]
                    ]
                ]
            }
        }, t.end);
    });
});

tape('nonthaburi', function(t) {
    c2.geocode('nonthaburi', {}, function(err, res) {
        t.equal(res.features[0].id.split('.')[0], 'place', 'lead feature is place');
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});