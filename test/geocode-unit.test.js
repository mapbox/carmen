var queue = require('queue-async');
var fs = require('fs');
var util = require('util');
var Carmen = require('..');
var index = require('../lib/index');
var feature = require('../lib/util/feature');
var mem = require('../lib/api-mem');
var UPDATE = process.env.UPDATE;
var test = require('tape');
var tilebelt = require('tilebelt');
var mapnik = require('mapnik');
var path = require('path');
var zlib = require('zlib');

mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'ogr.input'));
mapnik.register_datasource(path.join(mapnik.settings.paths.input_plugins,'geojson.input'));

// limit_verify 1 implies that the correct result must be the very top
// result prior to context verification. It means even with a long list
// of competing results the correct candidate is sorted to the top.

// limit_verify 2 implies that there is some ambiguity prior to context
// verification (e.g. new york (city) vs new york (province)) that is sorted
// into the correct order after context verification occurs.

(function() {
    var conf = {
        province: new mem(null, function() {}),
        city: new mem(null, function() {}),
        street: new mem({ maxzoom:6, geocoder_address:1 }, function() {})
    };
    var c = new Carmen(conf);
    test('index province', function(t) {
        var province = {
            _id:1,
            _text:'new york, ny',
            _zxy:['6/32/32','6/33/32'],
            _center:[0,0]
        };
        addFeature(conf.province, province, t.end);
    });
    test('index city 1', function(t) {
        var city = {
            _id:1,
            _text:'new york, ny',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        addFeature(conf.city, city, t.end);
    });
    test('index city 2', function(t) {
        var city = {
            _id:2,
            _text:'tonawanda',
            _zxy:['6/33/32'],
            _center:[360/64+0.001,0]
        };
        addFeature(conf.city, city, t.end);
    });
    test('index street 1', function(t) {
        var street = {
            _id:1,
            _text:'west st',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        addFeature(conf.street, street, t.end);
    });
    test('index street 2', function(t) {
        var street = {
            _id:2,
            _text:'west st',
            _zxy:['6/33/32'],
            _center:[360/64+0.001,0]
        };
        addFeature(conf.street, street, t.end);
    });
    test('west st, tonawanda, ny', function(t) {
        c.geocode('west st tonawanda ny', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'west st, tonawanda, new york');
            t.end();
        });
    });
    test('west st, new york, ny', function(t) {
        c.geocode('west st new york ny', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'west st, new york, new york');
            t.end();
        });
    });
    test('new york', function(t) {
        c.geocode('new york', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'new york');
            t.deepEqual(res.features[0].id, 'province.1');
            t.end();
        });
    });
    test('new york new york', function(t) {
        c.geocode('new york new york', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'new york, new york');
            t.deepEqual(res.features[0].id, 'city.1');
            t.end();
        });
    });
    test('ny ny', function(t) {
        c.geocode('ny ny', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'new york, new york');
            t.deepEqual(res.features[0].id, 'city.1');
            t.end();
        });
    });
    // failing
    test.skip('new york ny', function(t) {
        c.geocode('new york ny', { limit_verify:2 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'new york, new york');
            t.deepEqual(res.features[0].id, 'city.1');
            t.end();
        });
    });
})();

// Confirm that for equally relevant features across three indexes
// the first in hierarchy beats the others. (NO SCORES)
(function() {
    var conf = {
        country: new mem(null, function() {}),
        province: new mem(null, function() {}),
        city: new mem(null, function() {}),
    };
    var c = new Carmen(conf);
    test('index country', function(t) {
        var country = {
            _id:1,
            _text:'china',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        addFeature(conf.country, country, t.end);
    });
    test('index province', function(t) {
        var province = {
            _id:1,
            _text:'china',
            _zxy:['6/33/32'],
            _center:[360/64,0]
        };
        addFeature(conf.province, province, t.end);
    });
    test('index city', function(t) {
        var city = {
            _id:1,
            _text:'china',
            _zxy:['6/34/32'],
            _center:[360/64*2,0]
        };
        addFeature(conf.city, city, t.end);
    });
    test('china', function(t) {
        c.geocode('china', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'china');
            t.deepEqual(res.features[0].id, 'country.1');
            t.end();
        });
    });
})();

// Confirm that for equally relevant features across three indexes
// the one with the highest score beats the others.
(function() {
    var conf = {
        country: new mem(null, function() {}),
        province: new mem(null, function() {}),
        city: new mem(null, function() {}),
    };
    var c = new Carmen(conf);
    test('index country', function(t) {
        var country = {
            _id:1,
            _score: 5,
            _text:'china',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        addFeature(conf.country, country, t.end);
    });
    test('index province', function(t) {
        var province = {
            _id:2,
            _score: 10,
            _text:'china',
            _zxy:['6/33/32'],
            _center:[360/64,0]
        };
        addFeature(conf.province, province, t.end);
    });
    test('index city', function(t) {
        var city = {
            _id:3,
            _score: 6,
            _text:'china',
            _zxy:['6/34/32'],
            _center:[360/64*2,0]
        };
        addFeature(conf.city, city, t.end);
    });
    test('china', function(t) {
        c.geocode('china', { limit_verify:3 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].id, 'province.2');
            t.deepEqual(res.features[1].id, 'city.3');
            t.deepEqual(res.features[2].id, 'country.1');
            t.end();
        });
    });
})();

(function() {
    var conf = {
        province: new mem(null, function() {}),
        postcode: new mem(null, function() {}),
        city: new mem(null, function() {}),
        street: new mem({ maxzoom:6, geocoder_address:1 }, function() {})
    };
    var c = new Carmen(conf);
    test('index province', function(t) {
        var province = {
            _id:1,
            _text:'connecticut, ct',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        addFeature(conf.province, province, t.end);
    });
    test('index city', function(t) {
        var city = {
            _id:1,
            _text:'windsor',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        addFeature(conf.city, city, t.end);
    });
    test('index street', function(t) {
        var street = {
            _id:1,
            _text:'windsor ct',
            _zxy:['6/33/32'],
            _center:[360/64,0]
        };
        addFeature(conf.street, street, t.end);
    });
    // failing
    // city beats street at spatialmatch
    test.skip('windsor ct (limit 1)', function(t) {
        c.geocode('windsor ct', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'windsor, connecticut');
            t.deepEqual(res.features[0].id, 'city.1');
            t.end();
        });
    });
    // failing
    // city beats street at context sort
    test.skip('windsor ct (limit 2)', function(t) {
        c.geocode('windsor ct', { limit_verify:2 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'windsor, connecticut');
            t.deepEqual(res.features[0].id, 'city.1');
            t.end();
        });
    });
})();


//Ensure that results that have equal relev in phrasematch
//are matched against the 0.5 relev bar instead of 0.75
(function() {
    var conf = {
        country: new mem({ maxzoom:6 }, function() {})
    };
    var c = new Carmen(conf);
    test('index country', function(t) {
        var country = {
            _id:1,
            _text:'czech republic',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        addFeature(conf.country, country, t.end);
    });
    test('index country2', function(t) {
        var country = {
            _id:2,
            _text:'fake country two',
            _zxy:['7/32/32'],
            _center:[0,0]
        };
        addFeature(conf.country, country, t.end);
    });
    test('czech => czech repblic', function(t) {
        c.geocode('czech', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'czech republic');
            t.deepEqual(res.features[0].id, 'country.1');
            t.end();
        });
    });

    //Is not above 0.5 relev so should fail.
    test('fake => [fail]', function(t) {
        c.geocode('fake', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.notOk(res.features[0]);
            t.end();
        });
    });
})();

//Ensures that relev takes into house number into consideration
(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    test('index address', function(t) {
            var address = {
                _id:1,
                _text:'fake street',
                _zxy:['6/32/32'],
                _center:[0,0],
                _cluster: {
                    9: { type: "Point", coordinates: [0,0] },
                    10: { type: "Point", coordinates: [0,0] },
                    7: { type: "Point", coordinates: [0,0] }
                }
            };
            addFeature(conf.address, address, t.end);
    });
    test('test address index for relev', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    test('index alphanum address', function(t) {
            var address = {
                _id:1,
                _text:'fake street',
                _zxy:['6/32/32'],
                _center:[0,0],
                _cluster: {
                    '9b': { type: "Point", coordinates: [0,0] },
                    '10c': { type: "Point", coordinates: [0,0] },
                    '7': { type: "Point", coordinates: [0,0] }
                }
            };
            addFeature(conf.address, address, t.end);
    });
    test('test address index for alphanumerics', function(t) {
        c.geocode('9b fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street', 'found 9b fake street');
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    test('index address', function(t) {
            var address = {
                _id:1,
                _text:'fake street',
                _zxy:['6/32/32'],
                _center:[0,0],
                _cluster: {
                    '9': { type: "Point", coordinates: [0,0] },
                    '10': { type: "Point", coordinates: [0,0] },
                    '7': { type: "Point", coordinates: [0,0] }
                }
            };
            addFeature(conf.address, address, t.end);
    });
    test('test address query with alphanumeric', function(t) {
        c.geocode('9b fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street', 'found 9b fake street');
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    test('index address', function(t) {
            var address = {
                _id:1,
                _text:'fake street',
                _zxy:['6/32/32'],
                _center:[0,0],
                _rangetype:'tiger',
                _lfromhn: '0',
                _ltohn: '100',
                _geometry: {
                    type:'LineString',
                    coordinates:[[0,0],[0,100]]
                }
            };
            addFeature(conf.address, address, t.end);
    });
    test('test address query with address range', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9 fake street', 'found 9 fake street');
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    test('tiger, between the lines', function(t) {
            var address = {
                _id:1,
                _text:'fake street',
                _zxy:['6/32/32'],
                _center:[0,0],
                _rangetype:'tiger',
                _lfromhn: ['0','104'],
                _ltohn: ['100','200'],
                _geometry: {
                    type:'MultiLineString',
                    coordinates:
                    [
                        [
                            [0,0],
                            [0,10]
                        ],
                        [
                            [0,11],
                            [0,20]
                        ],
                    ]
                }
            };
            addFeature(conf.address, address, t.end);
    });

    test('test tiger interpolation house number', function(t) {
        c.geocode('102 fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '102 fake street', 'found 102 fake street');
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    test('index address', function(t) {
            var address = {
                _id:1,
                _text:'fake street',
                _zxy:['6/32/32'],
                _center:[0,0],
                _rangetype:'tiger',
                _lfromhn: '0',
                _ltohn: '100',
                _geometry: {
                    type:'LineString',
                    coordinates:[[0,0],[0,100]]
                }
            };
            addFeature(conf.address, address, t.end);
    });
    test('test alphanumeric address query with address range', function(t) {
        c.geocode('9b fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street', 'found 9b fake street');
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    test('index address', function(t) {
            var address = {
                _id:1,
                _text:'beach street',
                _zxy:['6/32/32'],
                _center:[0,0],
                _rangetype:'tiger',
                _lfromhn: '23-100',
                _ltohn: '23-500',
                _geometry: {
                    type:'LineString',
                    coordinates:[[0,0],[0,100]]
                }
            };
            addFeature(conf.address, address, t.end);
    });
    test('test hyphenated address query with address range', function(t) {
        c.geocode('23-414 beach street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '23-414 beach street', 'found 23-414 beach street');
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });
})();

//If the layer does not have geocoder_address do not take house number into account
(function() {
    var conf = {
        address: new mem({maxzoom: 6}, function() {})
    };
    var c = new Carmen(conf);
    test('index address', function(t) {
            var address = {
                _id:1,
                _text:'fake street',
                _zxy:['6/32/32'],
                _center:[0,0]
            };
            addFeature(conf.address, address, t.end);
    });
    test('test address index for relev', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.6666666666666666);
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {"Street": "St"}
        }, function() {})
    };
    var c = new Carmen(conf);
    test('geocoder token test', function(t) {
            var address = {
                _id:1,
                _text:'fake street',
                _zxy:['6/32/32'],
                _center:[0,0],
                _geometry: {
                    type: "Point",
                    coordinates: [0,0]
                }
            };
            addFeature(conf.address, address, t.end);
    });
    test('test address index for relev', function(t) {
        c.geocode('fake st', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 1, 'token replacement test, fake st');
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_tokens: {"dix-huitième": "18e"}
        }, function() {})
    };
    var c = new Carmen(conf);
    test('geocoder token test', function(t) {
            var address = {
                _id:1,
                _text:'avenue du 18e régiment',
                _zxy:['6/32/32'],
                _center:[0,0],
                _geometry: {
                    type: "Point",
                    coordinates: [0,0]
                }
            };
            addFeature(conf.address, address, t.end);
    });
    test('test address index for relev', function(t) {
        c.geocode('avenue du dix-huitième régiment', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.8, 'token replacement test, avenue du 18e');
            t.end();
        });
    });
})();

// spatialmatch test to ensure the highest relev for a stacked zxy cell
// is used, disallowing a lower scoring cell from overwriting a previous
// entry.
(function() {
    var conf = {
        place: new mem({maxzoom: 6}, function() {}),
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    test('index place', function(t) {
        var feature = {
            _id:1,
            _text:'fakecity',
            _zxy:['6/32/32'],
            _center:[0,0],
        };
        addFeature(conf.place, feature, t.end);
    });
    test('index matching address', function(t) {
        var feature = {
            _id:2,
            _text:'fake street',
            _zxy:['6/32/32','6/32/33'],
            _center:[0,0],
            _cluster: {
                '1': { type: "Point", coordinates: [0,0] }
            }
        };
        addFeature(conf.address, feature, t.end);
    });
    test('index other address', function(t) {
        var feature = {
            _id:3,
            _text:'fake street',
            _zxy:['6/32/32'],
            _center:[0,0],
            _cluster: {
                '2': { type: "Point", coordinates: [0,0] }
            }
        };
        addFeature(conf.address, feature, t.end);
    });
    test('test spatialmatch relev', function(t) {
        c.geocode('1 fake street fakecity', { limit_verify: 2 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].relevance, 1);
            t.equals(res.features[0].id, 'address.2');
            t.end();
        });
    });
})();

//Test Carmen options.debug
(function() {
    var conf = {
        country: new mem({ maxzoom:6 }, function() {})
    };
    var c = new Carmen(conf);
    test('index country', function(t) {
        var country = {
            _id:1,
            _text:'czech republic',
            _zxy:['6/32/32'],
            _center:[0,0]
        };
        addFeature(conf.country, country, t.end);
    });
    test('index country2', function(t) {
        var country = {
            _id:2,
            _text:'fake country two',
            _zxy:['7/32/32'],
            _center:[0,0]
        };
        addFeature(conf.country, country, t.end);
    });
    test('czech debug:1', function(t) {
        c.geocode('czech', { debug: 1, limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.debug, { grids: [ { grid: 17593259786241, x: 32, y: 32 } ], id: 1, phrasematch: { count: 1, relev: 0.4838709677419355 }, spatialmatch: { count: 1, relev: 0.4838709677419355 }, verifymatch: { count: 1, relev: 0.4838709677419355 } }, 'debug matches');
            t.end();
        });
    });

    test('czech republic debug:1', function(t) {
        c.geocode('czech republic', { debug: 1, limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.debug, { grids: [ { grid: 17593259786241, x: 32, y: 32 } ], id: 1, phrasematch: { count: 1, relev: 1 }, spatialmatch: { count: 1, relev: 1 }, verifymatch: { count: 1, relev: 1 } }, 'debug matches');
            t.end();
        });
    });

    test('czech republic debug:3', function(t) {
        c.geocode('czech republic', { debug: 3, limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.debug, { grids: [], id: 3, phrasematch: { count: 0, relev: 0 }, spatialmatch: { count: 0, relev: 0 }, verifymatch: { count: 0, relev: 0 } }, 'debug matches');
            t.end();
        });
    });
})();

// Test geocoder_name overlapping feature context prioritization
(function() {
    var conf = {
        place_a: new mem({maxzoom:6, geocoder_name:'place'}, function() {}),
        place_b: new mem({maxzoom:6, geocoder_name:'place'}, function() {}),
        street_a: new mem({maxzoom:6, geocoder_name:'street'}, function() {}),
        street_b: new mem({maxzoom:6, geocoder_name:'street'}, function() {})
    };
    var c = new Carmen(conf);
    test('index place_a', function(t) {
        addFeature(conf.place_a, {
            _id:1,
            _text:'sadtown',
            _zxy:['6/32/32'],
            _center:[0,0]
        }, t.end);
    });
    test('index place_b', function(t) {
        addFeature(conf.place_b, {
            _id:2,
            _text:'funtown',
            _zxy:['6/32/32'],
            _center:[0,0]
        }, t.end);
    });
    test('index street_a', function(t) {
        addFeature(conf.street_a, {
            _id:2,
            _text:'wall street',
            _zxy:['6/32/32'],
            _center:[0,0]
        }, t.end);
    });
    test('index street_b', function(t) {
        addFeature(conf.street_b, {
            _id:1,
            _text:'main street',
            _zxy:['6/32/32'],
            _center:[0,0]
        }, t.end);
    });
    test('geocoder_name dedupe', function(t) {
        c.geocode('main street', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'main street, funtown');
            t.deepEqual(res.features[0].id, 'street.1');
            t.deepEqual(res.features[0].context.length, 1);
            t.deepEqual(res.features[0].context.map(function(c) { return c.text }), ['funtown']);
            t.end();
        });
    });
})();

test('index.teardown', function(assert) {
    index.teardown();
    assert.end();
});

function addFeature(source, doc, callback) {
    var zxys = doc._zxy.map(function(zxy) {
        zxy = zxy.split('/');
        zxy[0] = parseInt(zxy[0],10);
        zxy[1] = parseInt(zxy[1],10);
        zxy[2] = parseInt(zxy[2],10);
        return zxy
    });

    var feature = { type:'Feature', properties:doc };
    if (doc._geometry) {
        feature.geometry = doc._geometry;
    } else {
        feature.geometry = {
            type: 'MultiPolygon',
            coordinates: zxys.map(function(zxy) {
                console.log(tilebelt.tileToGeoJSON([zxy[1], zxy[2], zxy[0]]))
                return tilebelt.tileToGeoJSON([zxy[1], zxy[2], zxy[0]]).coordinates;
            })
        };
    }

    var q = queue();
    for (var i = 0; i < zxys.length; i++) q.defer(function(zxy, done) {
        var vtile = new mapnik.VectorTile(zxy[0],zxy[1],zxy[2]);
        vtile.addGeoJSON(JSON.stringify({
            type: 'FeatureCollection',
            features: [feature]
        }, null, 2), 'data');
        zlib.gzip(vtile.getData(), function(err, buffer) {
            if (err) return done(err);
            source.putTile(zxy[0],zxy[1],zxy[2], buffer, function(err) {
                if (err) return done(err);
                done();
            });
        });
    }, zxys[i]);

    q.awaitAll(function(err) {
        if (err) return callback(err);
        index.update(source, [doc], zxys[0][0], callback);
    });
}
