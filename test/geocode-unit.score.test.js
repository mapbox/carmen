// Test score handling across indexes

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

// Confirms that you can forward search a ghost feature and that a scored featre will always win
(function() {
    var conf = { place: new mem(null, function() {}) };
    var c = new Carmen(conf);
    tape('index place', function(t) {
        var place = {
            id:1,
            properties: {
                'carmen:score': 100,
                'carmen:text':'fairfax',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        };
        addFeature(conf.place, place, t.end);
    });
    tape('index ghost place', function(t) {
        var place = {
            id:2,
            properties: {
                'carmen:score': -1,
                'carmen:text':'mclean',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        };
        addFeature(conf.place, place, t.end);
    });
    tape('index zip+4', function(t) {
        var place = {
            id:3,
            properties: {
                'carmen:score': -1,
                'carmen:text':'20003-2004',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        };
        addFeature(conf.place, place, t.end);
    });
    tape('index zip', function(t) {
        var place = {
            id:4,
            properties: {
                'carmen:score': 100,
                'carmen:text':'20009',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        };
        addFeature(conf.place, place, t.end);
    });
    tape('index ghost zip', function(t) {
        var place = {
            id:5,
            properties: {
                'carmen:score': -1,
                'carmen:text':'20009',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        };
        addFeature(conf.place, place, t.end);
    });
    tape('fairfax', function(t) {
        c.geocode('fairfax', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'fairfax');
            t.deepEqual(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('mclean', function(t) {
        c.geocode('mclean', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'mclean');
            t.deepEqual(res.features[0].id, 'place.2');
            t.end();
        });
    });
    tape('scored feature beats ghost', function(t) {
        c.geocode('20009', { limit_verify:2 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features.length, 1, 'ghost feature deduped');
            t.deepEqual(res.features[0].place_name, '20009');
            t.deepEqual(res.features[0].id, 'place.4');
            t.end();
        });
    });
    tape('exact match bests score', function(t) {
        c.geocode('20003-2004', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, '20003-2004');
            t.deepEqual(res.features[0].id, 'place.3');
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
    tape('index country', function(t) {
        var country = {
            id:1,
            properties: {
                'carmen:text':'china',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        };
        addFeature(conf.country, country, t.end);
    });
    tape('index province', function(t) {
        var province = {
            id:1,
            properties: {
                'carmen:text':'china',
                'carmen:zxy':['6/34/32'],
                'carmen:center':[360/64*2,0]
            }
        };
        addFeature(conf.province, province, t.end);
    });
    tape('index city', function(t) {
        var city = {
            id:1,
            properties: {
                'carmen:text':'china',
                'carmen:zxy':['6/36/32'],
                'carmen:center':[360/64*4,0]
            }
        };
        addFeature(conf.city, city, t.end);
    });
    tape('china', function(t) {
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
    tape('index country', function(t) {
        var country = {
            id:1,
            properties: {
                'carmen:score': 5,
                'carmen:text':'china',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        };
        addFeature(conf.country, country, t.end);
    });
    tape('index province', function(t) {
        var province = {
            id:2,
            properties: {
                'carmen:score': 10,
                'carmen:text':'china',
                'carmen:zxy':['6/34/32'],
                'carmen:center':[360/64 * 2,0]
            }
        };
        addFeature(conf.province, province, t.end);
    });
    tape('index city', function(t) {
        var city = {
            id:3,
            properties: {
                'carmen:score': 6,
                'carmen:text':'china',
                'carmen:zxy':['6/36/32'],
                'carmen:center':[360/64 * 4,0]
            }
        };
        addFeature(conf.city, city, t.end);
    });
    tape('china', function(t) {
        c.geocode('china', { limit_verify:3, allow_dupes: true }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].id, 'province.2');
            t.deepEqual(res.features[1].id, 'city.3');
            t.deepEqual(res.features[2].id, 'country.1');
            t.deepEqual(res.features.length, 3);
            t.end();
        });
    });
    tape('china (dedupe)', function(t) {
        c.geocode('china', { limit_verify:3 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].id, 'province.2');
            t.deepEqual(res.features.length, 1);
            t.end();
        });
    });
})();

// confirm that a feature queried by id has a relevance set to 1
(function() {
    var conf = {
        country: new mem(null, function() {}),
    };
    var c = new Carmen(conf);
    tape('index country', function(t) {
        var country = {
            id:1,
            properties: {
                'carmen:score': 5,
                'carmen:text':'usa',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        };
        addFeature(conf.country, country, t.end);
    });
    
    tape('query by id', function(t) {
        c.geocode('country.1', null, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].relevance, 1, "relevance is 1");
            t.deepEqual(res.features.length, 1);
            t.end();
        });
    });
})();

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

