// Ensures that relev takes into house number into consideration
// Also ensure relev is applied to US & Non-US Style addresses

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

// Test geocoder_address formatting + return place_name as germany style address (address number follows name)
(function() {
    var conf = {
        address: new mem({maxzoom: 6,  geocoder_address:1, geocoder_format: '{address._name} {address._number} {place._name}, {region._name} {postcode._name}, {country._name}'}, function() {}),
    };
    var c = new Carmen(conf);
    tape('index address', function(t) {
        var address = {
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
        addFeature(conf.address, address, t.end);
    });

    tape('Search for germany style address', function(t) {
        c.geocode('fake street 9', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'fake street 9');
            t.end();
        });
    });

    tape('Search for us style address, return with german formatting', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'fake street 9');
            t.end();
        });
    });
})();

// Test geocoder_address formatting with multiple formats by language
// + return place_name as germany style address (address number follows name)
(function() {
    var conf = {
        address: new mem({maxzoom: 6,  geocoder_address:1,
            geocoder_format_de: '{address._name} {address._number} {place._name}, {region._name} {postcode._name}, {country._name}',
            geocoder_format: '{address._number} {address._name} {place._name}, {region._name} {postcode._name}, {country._name}'}, function() {}),
    };
    var c = new Carmen(conf);
    tape('index address', function(t) {
        var address = {
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
        addFeature(conf.address, address, t.end);
    });

    tape('Search for germany style address - with language tag but no german vaue', function(t) {
        c.geocode('fake street 9', { limit_verify: 1, language: 'de' }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9 fake street');
            t.end();
        });
    });

    tape('Search for us style address, return with german formatting --  with language tag but no german vaue', function(t) {
        c.geocode('fake street 9', { limit_verify: 1, language: 'de' }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9 fake street');
            t.end();
        });
    });

    tape('Search for us style address, return with us formatting', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9 fake street');
            t.end();
        });
    });

    tape('Bad language code', function(t) {
        c.geocode('9 fake street', { limit_verify: 1, language: 'zh' }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9 fake street');
            t.end();
        });
    });
})();

//Test geocoder_address formatting for multiple layers
(function() {
    var conf = {
        country: new mem({ maxzoom:6,  geocoder_format: '{country._name}' }, function() {}),
        region: new mem({maxzoom: 6,   geocoder_format: '{region._name}, {country._name}' }, function() {}),
        postcode: new mem({maxzoom: 6, geocoder_format: '{region._name}, {postcode._name}, {country._name}' }, function() {}),
        place: new mem({maxzoom: 6,    geocoder_format: '{place._name}, {region._name} {postcode._name}, {country._name}' }, function() {}),
        address: new mem({maxzoom: 6,  geocoder_address: 1, geocoder_format: '{address._number} {address._name} {place._name}, {region._name} {postcode._name}, {country._name}'}, function() {}),
        poi: new mem({maxzoom: 6,      geocoder_format: '{poi._name}, {address._number} {address._name} {place._name}, {region._name} {postcode._name}, {country._name}'}, function() {}),
    };
    var c = new Carmen(conf);
    tape('index country', function(t) {
        var country = {
            id:1,
            properties: {
                'carmen:text': 'united states',
                'carmen:center': [0,0],
                'carmen:zxy':['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        addFeature(conf.country, country, t.end);
    });

    tape('index region', function(t) {
        var region = {
            id:1,
            properties: {
                'carmen:text': 'maine',
                'carmen:center': [0,0],
                'carmen:zxy':['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        addFeature(conf.region, region, t.end);
    });

    tape('index place', function(t) {
        var place = {
            id:1,
            properties: {
                'carmen:text': 'springfield',
                'carmen:center': [0,0],
                'carmen:zxy':['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        addFeature(conf.place, place, t.end);
    });

    tape('index postcode', function(t) {
        var postcode = {
            id:1,
            properties: {
                'carmen:text': '12345',
                'carmen:center': [0,0],
                'carmen:zxy':['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        addFeature(conf.postcode, postcode, t.end);
    });

    tape('index address', function(t) {
        var address = {
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
        addFeature(conf.address, address, t.end);
    });

    tape('index poi', function(t) {
        var poi = {
            id:1,
            properties: {
                'carmen:text': 'moes tavern',
                'carmen:center': [0,0],
                'carmen:zxy':['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        addFeature(conf.poi, poi, t.end);
    });
    tape('Search for an address (multiple layers)', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9 fake street springfield, maine 12345, united states');
            t.end();
        });
    });
    tape('Search for an address without a number (multiple layers)', function(t) {
        c.geocode('fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.deepEquals(res, { features: [ { center: [ 0, 0 ], context: [ { id: 'place.1', text: 'springfield' }, { id: 'postcode.1', text: '12345' }, { id: 'region.1', text: 'maine' }, { id: 'country.1', text: 'united states' } ], geometry: { coordinates: [[[0,0],[0,0],[0,0]]], type: 'MultiLineString' }, id: 'address.1', place_name: 'fake street springfield, maine 12345, united states', properties: {}, relevance: 0.79, text: 'fake street', type: 'Feature' } ], query: [ 'fake', 'street' ], type: 'FeatureCollection' });
            t.end();
        });
    });
    tape('Search for a city (multiple layers)', function(t) {
        c.geocode('springfield', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'springfield, maine 12345, united states');
            t.end();
        });
    });
    tape('Search for a poi (multiple layers)', function(t) {
        c.geocode('moes tavern', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'moes tavern, fake street springfield, maine 12345, united states');
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    tape('index address', function(t) {
        var address = {
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
        addFeature(conf.address, address, t.end);
    });

    tape('test address index for US relev', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.99);
            t.end();
        });
    });

    tape('test address index for DE relev', function(t) {
        c.geocode('fake street 9', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.99);
            t.end();
        });
    });

    // This test should have a very poor relev as the number
    // is found within the street name
    // Unclear whether this should work really...
    tape.skip('test address index for random relev', function(t) {
        c.geocode('fake 9 street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.3225806451612903);
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
    tape('index address', function(t) {
        var address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        addFeature(conf.address, address, t.end);
    });
    tape('test address index for relev', function(t) {
        c.geocode('9 fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.49);
            t.end();
        });
    });
})();

// Test to make sure cases of custom subproperties are accounted for
(function() {
    var conf = {
        place: new mem({maxzoom: 6,  geocoder_format: '{place._name}'}, function() {}),
        kitten: new mem({maxzoom: 6,  geocoder_format: '{kitten._name} {kitten.version} {kitten.color}, {place._name}'}, function() {}),
    };
    var c = new Carmen(conf);
    tape('index place', function(t) {
        var place = {
            id:1,
            properties: {
                'carmen:text': 'springfield',
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32']
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        addFeature(conf.place, place, t.end);
    });
    tape('index kitten', function(t) {
        var kitten = {
            id:1,
            properties: {
                'carmen:text': 'snowball',
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32'],
                'version': 'II'
            },
            geometry: {
                type: 'Point',
                coordinates: [0,0]
            }
        };
        addFeature(conf.kitten, kitten, t.end);
    });

    tape('Search for an address using a template that has nonstandard properites', function(t) {
        c.geocode('springfield', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'springfield');
            t.end();
        });
    });
    tape('Search for a custom property with non-carmen templating', function(t) {
        c.geocode('snowball', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'snowball II, springfield');
            t.end();
        });
    });
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
