'use strict';
// Ensures that relev takes into house number into consideration
// Also ensure relev is applied to US & Non-US Style addresses

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// Test geocoder_address formatting + return place_name as germany style address (address number follows name)
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1, geocoder_format: '{{address.name}} {{address.number}} {{place.name}}, {{region.name}} {{postcode.name}}, {{country.name}}' }, () => {}),
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

    tape('Search for germany style address', (t) => {
        c.geocode('fake street 9', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'fake street 9');
            t.end();
        });
    });

    tape('Search for us style address, return with german formatting', (t) => {
        c.geocode('9 fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'fake street 9');
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();

// Test geocoder_address formatting with multiple formats by language
// return place_name as germany style address (address number follows name)
(() => {
    const conf = {
        address: new mem({ maxzoom: 6,  geocoder_address:1,
            geocoder_format_de: '{{address.name}} {{address.number}} {{place.name}}, {{region.name}} {{postcode.name}}, {{country.name}}',
            geocoder_format: '{{address.number}} {{address.name}} {{place.name}}, {{region.name}} {{postcode.name}}, {{country.name}}' }, () => {}),
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

    tape('Search for germany style address - with language tag but no german vaue', (t) => {
        c.geocode('fake street 9', { limit_verify: 1, language: 'de' }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9 fake street');
            t.end();
        });
    });

    tape('Search for us style address, return with german formatting --  with language tag but no german vaue', (t) => {
        c.geocode('fake street 9', { limit_verify: 1, language: 'de' }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9 fake street');
            t.end();
        });
    });

    tape('Search for us style address, return with us formatting', (t) => {
        c.geocode('9 fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9 fake street');
            t.end();
        });
    });

    tape('Bad language code', (t) => {
        c.geocode('9 fake street', { limit_verify: 1, language: 'zh' }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9 fake street');
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();

// Test geocoder_address formatting for multiple layers
(() => {
    const conf = {
        country: new mem({ maxzoom:6,  geocoder_format: '{{country.name}}' }, () => {}),
        region: new mem({ maxzoom: 6,   geocoder_format: '{{region.name}}, {{country.name}}' }, () => {}),
        postcode: new mem({ maxzoom: 6, geocoder_format: '{{region.name}}, {{postcode.name}}, {{country.name}}' }, () => {}),
        place: new mem({ maxzoom: 6,    geocoder_format: '{{place.name}}, {{region.name}} {{postcode.name}}, {{country.name}}' }, () => {}),
        address: new mem({ maxzoom: 6,  geocoder_address: 1, geocoder_format: '{{address.number}} {{address.name}} {{place.name}}, {{region.name}} {{postcode.name}}, {{country.name}}' }, () => {}),
        poi: new mem({ maxzoom: 6,      geocoder_format: '{{poi.name}}, {{address.number}} {{address.name}} {{place.name}}, {{region.name}} {{postcode.name}}, {{country.name}}' }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index country', (t) => {
        const country = {
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
        queueFeature(conf.country, country, t.end);
    });

    tape('index region', (t) => {
        const region = {
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
        queueFeature(conf.region, region, t.end);
    });

    tape('index place', (t) => {
        const place = {
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
        queueFeature(conf.place, place, t.end);
    });

    tape('index postcode', (t) => {
        const postcode = {
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
        queueFeature(conf.postcode, postcode, t.end);
    });

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
        queueFeature(conf.address, address, t.end);
    });

    tape('index poi', (t) => {
        const poi = {
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
    tape('Search for an address (multiple layers)', (t) => {
        c.geocode('9 fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9 fake street springfield, maine 12345, united states');
            t.end();
        });
    });
    tape('Search for an address without a number (multiple layers)', (t) => {
        c.geocode('fake street', { limit_verify: 1 }, (err, res) => {
            t.error(err);

            t.deepEquals(res, {
                type: 'FeatureCollection',
                query: ['fake','street'],
                features: [{
                    'id':'address.1',
                    'type':'Feature',
                    'text':'fake street',
                    'place_name':'fake street springfield, maine 12345, united states',
                    'relevance': 1,
                    'place_type': ['address'],
                    'properties':{},
                    'center':[0,0],
                    'geometry':{ 'type':'GeometryCollection','geometries':[{ 'type':'MultiPoint','coordinates':[[0,0],[0,0],[0,0]] }] },
                    'context':[{
                        'id':'place.1',
                        'text':'springfield'
                    },{
                        'id':'postcode.1',
                        'text':'12345'
                    },{
                        'id':'region.1',
                        'text':'maine'
                    },{
                        'id':'country.1',
                        'text':'united states'
                    }]
                }]
            });
            t.end();
        });
    });
    tape('Search for a city (multiple layers)', (t) => {
        c.geocode('springfield', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'springfield, maine 12345, united states');
            t.end();
        });
    });
    tape('Search for a poi (multiple layers)', (t) => {
        c.geocode('moes tavern', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'moes tavern, fake street springfield, maine 12345, united states');
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
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

    tape('test address index for US relev', (t) => {
        c.geocode('9 fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });

    tape('test address index for DE relev', (t) => {
        c.geocode('fake street 9', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });

    tape('test address index for DE relev', (t) => {
        c.geocode('fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });

    // This test should have a very poor relev as the number
    // is found within the street name
    // Unclear whether this should work really...
    tape.skip('test address index for random relev', (t) => {
        c.geocode('fake 9 street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.3225806451612903);
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();

// If the layer does not have geocoder_address do not take house number into account
(() => {
    const conf = {
        address: new mem({ maxzoom: 6 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index address', (t) => {
        const address = {
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
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });
    tape('test address index for relev', (t) => {
        c.geocode('9 fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].relevance, 0.555556);
            t.end();
        });
    });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();

// Test to make sure cases of custom subproperties are accounted for
(() => {
    const conf = {
        place: new mem({ maxzoom: 6,  geocoder_format: '{{place.name}}' }, () => {}),
        kitten: new mem({ maxzoom: 6,  geocoder_format: '{{kitten.name}} {{kitten.version}} {{kitten.color}}, {{place.name}}' }, () => {}),
    };
    const c = new Carmen(conf);
    tape('index place', (t) => {
        const place = {
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
        queueFeature(conf.place, place, t.end);
    });
    tape('index kitten', (t) => {
        const kitten = {
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
        queueFeature(conf.kitten, kitten, t.end);
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

    tape('Search for an address using a template that has nonstandard properites', (t) => {
        c.geocode('springfield', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'springfield');
            t.end();
        });
    });
    // tape('Search for a custom property with non-carmen templating', (t) => {
    //     c.geocode('snowball', { limit_verify: 1 }, (err, res) => {
    //         t.ifError(err);
    //         t.equals(res.features[0].place_name, 'snowball II, springfield');
    //         t.end();
    //     });
    // });

    tape('teardown', (t) => {
        context.getTile.cache.reset();
        t.end();
    });
})();

// Test dashes in format string
(() => {
    const conf = {
        region: new mem({ maxzoom: 6,  geocoder_format: '{{region.name}}' }, () => {}),
        place: new mem({ maxzoom: 6,  geocoder_format: '{{place.name}} - {{region.name}}' }, () => {}),
        locality: new mem({ maxzoom: 6,  geocoder_format: '{{locality.name}}, {{place.name}} - {{region.name}}' }, () => {}),
        neighborhood: new mem({ maxzoom: 6,  geocoder_format: '{{neighborhood.name}}, {{place.name}} - {{region.name}}' }, () => {})
    };
    const c = new Carmen(conf);
    tape('index region:', (t) => {
        const region = {
            id:1,
            properties: {
                'carmen:text': 'Region A',
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32']
            }
        };
        queueFeature(conf.region, region, t.end);
    });
    tape('index region:', (t) => {
        const region = {
            id:2,
            properties: {
                'carmen:text': 'Region B',
                'carmen:center': [-1,-1],
                'carmen:zxy': ['6/31/32']
            }
        };
        queueFeature(conf.region, region, t.end);
    });
    tape('index region:', (t) => {
        const region = {
            id:3,
            properties: {
                'carmen:text': 'Region C',
                'carmen:center': [-1,1],
                'carmen:zxy': ['6/31/31']
            }
        };
        queueFeature(conf.region, region, t.end);
    });
    tape('index place', (t) => {
        const place = {
            id:1,
            properties: {
                'carmen:text': 'Place A',
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32']
            }
        };
        queueFeature(conf.place, place, t.end);
    });
    tape('index locality', (t) => {
        const locality = {
            id:1,
            properties: {
                'carmen:text': 'Locality C',
                'carmen:center': [-1,1],
                'carmen:zxy': ['6/31/31']
            }
        };
        queueFeature(conf.locality, locality, t.end);
    });
    tape('index neighborhood', (t) => {
        const neighborhood = {
            id:1,
            properties: {
                'carmen:text': 'Neighborhood A',
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32']
            }
        };
        queueFeature(conf.neighborhood, neighborhood, t.end);
    });
    tape('index neighborhood', (t) => {
        const neighborhood = {
            id:2,
            properties: {
                'carmen:text': 'Neighborhood B',
                'carmen:center': [-1,-1],
                'carmen:zxy': ['6/31/32']
            }
        };
        queueFeature(conf.neighborhood, neighborhood, t.end);
    });
    tape('index neighborhood', (t) => {
        const neighborhood = {
            id:3,
            properties: {
                'carmen:text': 'Neighborhood C',
                'carmen:center': [-1,1],
                'carmen:zxy': ['6/31/31']
            }
        };
        queueFeature(conf.neighborhood, neighborhood, t.end);
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

    tape('Place A', (t) => {
        c.geocode('Place A', { }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Place A - Region A');
            t.end();
        });
    });
    tape('Locality C', (t) => {
        c.geocode('Locality C', { }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Locality C, Region C');
            t.end();
        });
    });
    tape('Neighborhood A', (t) => {
        c.geocode('Neighborhood A', { }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Neighborhood A, Place A - Region A');
            t.end();
        });
    });
    tape('Neighborhood C', (t) => {
        c.geocode('Neighborhood C', { }, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Neighborhood C, Region C');
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
