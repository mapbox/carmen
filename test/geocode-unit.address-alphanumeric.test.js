// Alphanumeric and hyphenated housenumbers

const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

//Make sure that capital letters are lowercased on indexing to match input token
(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index alphanum address', t => {
        let address = {
            id: 1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0, 0],
                'carmen:addressnumber': ['9B', '10C', '7']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0, 0], [0, 0], [0, 0]]
            }
        };
        queueFeature(conf.address, address, () => {
            buildQueued(conf.address, t.end);
        });
    });
    tape('test address index for alphanumerics', t => {
        c.geocode('9B FAKE STREET', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(
                res.features[0].place_name,
                '9b fake street',
                'found 9b fake street'
            );
            t.equals(res.features[0].relevance, 1.0);
            t.end();
        });
    });
})();

//Use addressnumber query position as a tiebreaker when applic.
(() => {
    const conf = {
        address: new mem({ maxzoom: 14, geocoder_address: 1 }, function() {})
    };
    const c = new Carmen(conf);
    tape('index address', t => {
        let address = {
            id: 1,
            properties: {
                'carmen:text': 'WASHINGTON STREET',
                'carmen:center': [0, 0],
                'carmen:addressnumber': ['70', '72', '74']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0, 0], [0, 0], [0, 0]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });

    tape('index address', t => {
        let address = {
            id: 2,
            properties: {
                'carmen:text': 'WASHINGTON STREET',
                'carmen:center': [0, 0],
                'carmen:addressnumber': ['500', '502', '504']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0, 0], [0, 0], [0, 0]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });
    tape('build queued features', t => {
        var q = queue();
        Object.keys(conf).forEach(c => {
            q.defer(cb => {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });

    tape('test address index with double number', t => {
        c.geocode('70 WASHINGTON STREET #501', {}, (err, res) => {
            t.ifError(err);
            t.equals(
                res.features[0].place_name,
                '70 WASHINGTON STREET',
                'Found: 70 WASHINGTON STREET'
            );
            t.equals(res.features[0].relevance, 0.5);
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, function() {})
    };
    const c = new Carmen(conf);
    tape('index alphanum address', t => {
        let address = {
            id: 1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0, 0],
                'carmen:addressnumber': ['9b', '10c', '7']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0, 0], [0, 0], [0, 0]]
            }
        };
        queueFeature(conf.address, address, () => {
            buildQueued(conf.address, t.end);
        });
    });
    tape('test address index for alphanumerics', t => {
        c.geocode('9b fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(
                res.features[0].place_name,
                '9b fake street',
                'found 9b fake street'
            );
            t.equals(res.features[0].relevance, 1.0);
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index address', t => {
        let address = {
            id: 1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0, 0],
                'carmen:addressnumber': ['9', '10', '7']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0, 0], [0, 0], [0, 0]]
            }
        };
        queueFeature(conf.address, address, () => {
            buildQueued(conf.address, t.end);
        });
    });
    tape('test address query with alphanumeric', t => {
        c.geocode('9b fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(
                res.features[0].place_name,
                '9b fake street',
                'found 9b fake street'
            );
            t.equals(res.features[0].relevance, 1.0);
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index address', t => {
        let address = {
            id: 1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0, 0],
                'carmen:rangetype': 'tiger',
                'carmen:lfromhn': 0, //Input is numeric
                'carmen:ltohn': 100
            },
            geometry: {
                type: 'LineString',
                coordinates: [[0, 0], [0, 100]]
            }
        };
        queueFeature(conf.address, address, () => {
            buildQueued(conf.address, t.end);
        });
    });
    tape('test alphanumeric address query with address range', t => {
        c.geocode('9b fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(
                res.features[0].place_name,
                '9b fake street',
                'found 9b fake street'
            );
            t.equals(res.features[0].relevance, 1.0);
            t.equals(res.features[0].address, '9b', 'address number is 9b');
            t.end();
        });
    });

    tape('test alphanumeric address query with invalid address number', t => {
        c.geocode('9bc fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.ok(
                res.features[0].place_name,
                'fake street',
                'found fake street feature'
            );
            t.ok(
                res.features[0].relevance < 0.6,
                'appropriate relevance (9bc token should not be matched)'
            );
            t.ok(
                res.features[0].address === undefined,
                'address number is not defined'
            );
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index address', t => {
        let address = {
            id: 1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0, 0],
                'carmen:rangetype': 'tiger',
                'carmen:lfromhn': '0',
                'carmen:ltohn': '100'
            },
            geometry: {
                type: 'LineString',
                coordinates: [[0, 0], [0, 100]]
            }
        };
        queueFeature(conf.address, address, () => {
            buildQueued(conf.address, t.end);
        });
    });
    tape('test alphanumeric address query with address range', t => {
        c.geocode('9b fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(
                res.features[0].place_name,
                '9b fake street',
                'found 9b fake street'
            );
            t.equals(res.features[0].relevance, 1.0);
            t.equals(res.features[0].address, '9b', 'address number is 9b');
            t.end();
        });
    });

    tape('test alphanumeric address query with invalid address number', t => {
        c.geocode('9bc fake street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.ok(
                res.features[0].place_name,
                'fake street',
                'found fake street feature'
            );
            t.ok(
                res.features[0].relevance < 0.6,
                'appropriate relevance (9bc token should not be matched)'
            );
            t.ok(
                res.features[0].address === undefined,
                'address number is not defined'
            );
            t.end();
        });
    });
})();

(() => {
    const conf = {
        postcode: new mem({ maxzoom: 6 }, () => {}),
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index fake UK address range', t => {
        let address = {
            id: 1,
            properties: {
                'carmen:text': 'B77',
                'carmen:center': [0, 0],
                'carmen:rangetype': 'tiger',
                'carmen:lfromhn': '0',
                'carmen:ltohn': '100'
            },
            geometry: {
                type: 'LineString',
                coordinates: [[0, 0], [0, 100]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });
    tape('index fake UK postcode', t => {
        let postcode = {
            id: 2,
            properties: {
                'carmen:text': 'B77 1AB',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0, 0]
            }
        };
        queueFeature(conf.postcode, postcode, t.end);
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
    tape('test UK postcode not getting confused w/ address range', t => {
        c.geocode('B77 1AB', { limit_verify: 10 }, (err, res) => {
            t.equals(
                res.features[0].place_name,
                'B77 1AB',
                "found feature 'B77 1AB'"
            );
            t.equals(res.features[0].relevance, 1.0);
            t.equals(
                res.features[0].id.split('.')[0],
                'postcode',
                'feature is from layer postcode'
            );
            let addressInResultSet = res.features.some(feature => {
                return feature.id.split('.')[0] === 'address';
            });
            t.ok(
                !addressInResultSet,
                'result set does not include address feature'
            );
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index address', t => {
        let address = {
            id: 1,
            properties: {
                'carmen:text': 'beach street',
                'carmen:center': [0, 0],
                'carmen:rangetype': 'tiger',
                'carmen:lfromhn': '23-100',
                'carmen:ltohn': '23-500'
            },
            geometry: {
                type: 'LineString',
                coordinates: [[0, 0], [0, 100]]
            }
        };
        queueFeature(conf.address, address, () => {
            buildQueued(conf.address, t.end);
        });
    });
    tape('test hyphenated address query with address range', t => {
        c.geocode('23-414 beach street', { limit_verify: 1 }, (err, res) => {
            t.ifError(err);
            t.equals(
                res.features[0].place_name,
                '23-414 beach street',
                'found 23-414 beach street'
            );
            t.equals(res.features[0].relevance, 1.0);
            t.end();
        });
    });
})();

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
