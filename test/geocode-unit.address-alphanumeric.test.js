// Alphanumeric and hyphenated housenumbers

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

//Make sure that capital letters are lowercased on indexing to match input token
(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    tape('index alphanum address', function(t) {
        var address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['9B', '10C', '7']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[0,0],[0,0]]
            }
        };
        queueFeature(conf.address, address, function() { buildQueued(conf.address, t.end) });
    });
    tape('test address index for alphanumerics', function(t) {
        c.geocode('9B FAKE STREET', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street', 'found 9b fake street');
            t.equals(res.features[0].relevance, 0.99);
            t.end();
        });
    });
})();

(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    tape('index alphanum address', function(t) {
        var address = {
            id:1,
            properties: {
                'carmen:text': 'fake street',
                'carmen:center': [0,0],
                'carmen:addressnumber': ['9b', '10c', '7']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[0,0],[0,0]]
            }
        };
        queueFeature(conf.address, address, function() { buildQueued(conf.address, t.end) });
    });
    tape('test address index for alphanumerics', function(t) {
        c.geocode('9b fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street', 'found 9b fake street');
            t.equals(res.features[0].relevance, 0.99);
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
                'carmen:addressnumber': ['9', '10', '7']
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[0,0],[0,0],[0,0]]
            }
        };
        queueFeature(conf.address, address, function() { buildQueued(conf.address, t.end) });
    });
    tape('test address query with alphanumeric', function(t) {
        c.geocode('9b fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street', 'found 9b fake street');
            t.equals(res.features[0].relevance, 0.99);
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
                'carmen:text':'fake street',
                'carmen:center':[0,0],
                'carmen:rangetype':'tiger',
                'carmen:lfromhn': 0, //Input is numeric
                'carmen:ltohn': 100,
            },
            geometry: {
                type:'LineString',
                coordinates:[[0,0],[0,100]]
            }
        };
        queueFeature(conf.address, address, function() { buildQueued(conf.address, t.end) });
    });
    tape('test alphanumeric address query with address range', function(t) {
        c.geocode('9b fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street', 'found 9b fake street');
            t.equals(res.features[0].relevance, 0.99);
            t.equals(res.features[0].address, '9b', 'address number is 9b');
            t.end();
        });
    });

    tape('test alphanumeric address query with invalid address number', function(t) {
        c.geocode('9bc fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.ok(res.features[0].place_name, 'fake street', 'found fake street feature');
            t.ok((res.features[0].relevance < 0.6), 'appropriate relevance (9bc token should not be matched)');
            t.ok((res.features[0].address === undefined), 'address number is not defined');
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
                'carmen:text':'fake street',
                'carmen:center':[0,0],
                'carmen:rangetype':'tiger',
                'carmen:lfromhn': '0',
                'carmen:ltohn': '100',
            },
            geometry: {
                type:'LineString',
                coordinates:[[0,0],[0,100]]
            }
        };
        queueFeature(conf.address, address, function() { buildQueued(conf.address, t.end) });
    });
    tape('test alphanumeric address query with address range', function(t) {
        c.geocode('9b fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '9b fake street', 'found 9b fake street');
            t.equals(res.features[0].relevance, 0.99);
            t.equals(res.features[0].address, '9b', 'address number is 9b');
            t.end();
        });
    });

    tape('test alphanumeric address query with invalid address number', function(t) {
        c.geocode('9bc fake street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.ok(res.features[0].place_name, 'fake street', 'found fake street feature');
            t.ok((res.features[0].relevance < 0.6), 'appropriate relevance (9bc token should not be matched)');
            t.ok((res.features[0].address === undefined), 'address number is not defined');
            t.end();
        });
    });
})();

(function() {
    var conf = {
        postcode: new mem({maxzoom: 6 }, function() {}),
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    tape('index fake UK address range', function(t) {
        var address = {
            id: 1,
            properties: {
                'carmen:text':'B77',
                'carmen:center':[0,0],
                'carmen:rangetype':'tiger',
                'carmen:lfromhn': '0',
                'carmen:ltohn': '100',
            },
            geometry: {
                type:'LineString',
                coordinates:[[0,0],[0,100]]
            }
        };
        queueFeature(conf.address, address, t.end);
    });
    tape('index fake UK postcode', function(t) {
        var postcode = {
            id: 2,
            properties: {
                'carmen:text': 'B77 1AB',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0,0]
            }
        };
        queueFeature(conf.postcode, postcode, t.end);
    });
    tape('build queued features', function(t) {
        var q = queue();
        Object.keys(conf).forEach(function(c) {
            q.defer(function(cb) {
                buildQueued(conf[c], cb);
            });
        });
        q.awaitAll(t.end);
    });
    tape('test UK postcode not getting confused w/ address range', function(t) {
        c.geocode('B77 1AB', { limit_verify: 10 }, function(err, res) {
            t.equals(res.features[0].place_name, 'B77 1AB', 'found feature \'B77 1AB\'');
            t.equals(res.features[0].relevance, 0.99);
            t.equals(res.features[0].id.split('.')[0], 'postcode', 'feature is from layer postcode');
            var addressInResultSet = res.features.some(function(feature) { return feature.id.split('.')[0] === 'address' });
            t.ok(!addressInResultSet, 'result set does not include address feature');
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
                'carmen:text':'beach street',
                'carmen:center':[0,0],
                'carmen:rangetype':'tiger',
                'carmen:lfromhn': '23-100',
                'carmen:ltohn': '23-500',
            },
            geometry: {
                type:'LineString',
                coordinates:[[0,0],[0,100]]
            }
        };
        queueFeature(conf.address, address, function() { buildQueued(conf.address, t.end) });
    });
    tape('test hyphenated address query with address range', function(t) {
        c.geocode('23-414 beach street', { limit_verify: 1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, '23-414 beach street', 'found 23-414 beach street');
            t.equals(res.features[0].relevance, 0.99);
            t.end();
        });
    });
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
