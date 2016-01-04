// Test geocoder_tokens

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = {
        country: new mem({
            maxzoom: 6
        }, function() {}),
        place: new mem({
            maxzoom: 6
        }, function() {})
    };
    var c = new Carmen(conf);
    tape('index country', function(t) {
        addFeature(conf.country, {
            id: 1,
            properties: {
                'carmen:text':'United States',
                'carmen:center': [0,0],
                'carmen:zxy': ['6/32/32']
            }
        }, t.end);
    });
    tape('index place', function(t) {
        var q = queue(1);
        for (var i = 1; i < 21; i++) q.defer(function(i, done) {
            addFeature(conf.place, {
                id:i,
                properties: {
                    'carmen:text':'place ' + i,
                    'carmen:center': [0,0],
                },
                geometry: {
                    type: "Point",
                    coordinates: [0,0]
                }
            }, done);
            q.awaitAll(t.end);
        }, i);
    });

    tape('default response is 5 features (forward)', function(t) {
        c.geocode('place', {  }, function(err, res) {
            t.ifError(err);
            t.equal(res.features.length, 5, 'returns 5 results');
            t.equal(res.features[0].place_name, 'place 11, United States');
            t.equal(res.features[1].place_name, 'place 1, United States');
            t.equal(res.features[2].place_name, 'place 3, United States');
            t.equal(res.features[3].place_name, 'place 4, United States');
            t.equal(res.features[4].place_name, 'place 5, United States');
            t.end();
        });
    });
    tape('limit 1 result (forward)', function(t) {
        c.geocode('place', { limit: 1 }, function(err, res) {
            t.ifError(err);
            t.equal(res.features.length, 1, 'returns 1 result');
            t.equal(res.features[0].place_name, 'place 11, United States');
            t.end();
        });
    });
    tape('limit 10 results (forward)', function(t) {
        c.geocode('place', { limit: 10 }, function(err, res) {
            t.ifError(err);
            t.equal(res.features.length, 10, 'returns 10 results');
            t.equal(res.features[0].place_name, 'place 11, United States');
            t.equal(res.features[1].place_name, 'place 1, United States');
            t.equal(res.features[2].place_name, 'place 3, United States');
            t.equal(res.features[3].place_name, 'place 4, United States');
            t.equal(res.features[4].place_name, 'place 5, United States');
            t.equal(res.features[5].place_name, 'place 6, United States');
            t.equal(res.features[6].place_name, 'place 7, United States');
            t.equal(res.features[7].place_name, 'place 8, United States');
            t.equal(res.features[8].place_name, 'place 9, United States');
            t.equal(res.features[9].place_name, 'place 10, United States');
            t.end();
        });
    });
    tape('limit 11 results (forward)', function(t) {
        c.geocode('place', { limit: 11 }, function(err, res) {
            t.ifError(err);
            t.equal(res.features.length, 10, 'hard limit of 10');
            t.equal(res.features[0].place_name, 'place 11, United States');
            t.equal(res.features[1].place_name, 'place 1, United States');
            t.equal(res.features[2].place_name, 'place 3, United States');
            t.equal(res.features[3].place_name, 'place 4, United States');
            t.equal(res.features[4].place_name, 'place 5, United States');
            t.equal(res.features[5].place_name, 'place 6, United States');
            t.equal(res.features[6].place_name, 'place 7, United States');
            t.equal(res.features[7].place_name, 'place 8, United States');
            t.equal(res.features[8].place_name, 'place 9, United States');
            t.equal(res.features[9].place_name, 'place 10, United States');
            t.end();
        });
    });
})();

(function() {
    var conf = {
        place: new mem({
            maxzoom: 6
        }, function() {}),
        poi: new mem({
            maxzoom: 12,
            geocoder_name: 'poi',
            geocoder_type: 'poi'
        }, function() {}),
        address: new mem({
            maxzoom: 12,
            geocoder_name: 'poi',
            geocoder_type: 'address'
        }, function() {})
    };
    var c = new Carmen(conf);
    tape('index place', function(t) {
        addFeature(conf.place, {
            id: 1,
            properties: {
                'carmen:text':'west virginia',
                'carmen:center': [-79.37922477722168,38.832871481546036],
                'carmen:zxy': ['6/17/24']
            }
        }, t.end);
    });

    var coords = [
        [-79.37663912773132,38.83417524443351],
        [-79.37698781490326,38.83414599360498],
        [-79.37705218791960,38.83398302448309],
        [-79.37690734863281,38.83439671460232],
        [-79.37739551067352,38.83437582121962],
        [-79.37776565551758,38.83445939471365],
        [-79.37820553779602,38.83435910650903],
        [-79.37737405300139,38.83381587627815],
        [-79.37737941741943,38.83361111919213],
        [-79.37780320644379,38.83375319560010]
    ]

    tape('index poi', function(t) {
        var q = queue(1);
        for (var i = 1; i < 6; i++) q.defer(function(i, done) {
            addFeature(conf.poi, {
                id:i,
                properties: {
                    'carmen:text':'seneca rocks ' + i,
                    'carmen:center': coords[i-1],
                },
                geometry: {
                    type: "Point",
                    coordinates: coords[i-1]
                }
            }, done);
            q.awaitAll(t.end);
        }, i);
    });

    tape('index address', function(t) {
        var q = queue(1);
        for (var i = 6; i < 11; i++) q.defer(function(i, done) {
            addFeature(conf.address, {
                id: i-5,
                properties: {
                    'carmen:text':'address ' + i,
                    'carmen:center': coords[i-1],
                },
                geometry: {
                    type: "Point",
                    coordinates: coords[i-1]
                }
            }, done);
            q.awaitAll(t.end);
        }, i);
    });

    tape('default response is 1 features (reverse)', function(t) {
        c.geocode('-79.37745451927184,38.83420867393712', {  }, function(err, res) {
            t.ifError(err);
            t.equal(res.features.length, 2, 'returns 1 result of 2 context');
            t.equal(res.features[0].place_name, 'seneca rocks 5, west virginia');
            t.equal(res.features[1].place_name, 'west virginia');
            t.end();
        });
    });
    tape('Limit only works with type (reverse)', function(t) {
        c.geocode('-79.37745451927184,38.83420867393712', { limit: 2 }, function(err, res) {
            t.ok(err);
            t.end();
        });
    });
    tape('limit 2 results (reverse)', function(t) {
        c.geocode('-79.37745451927184,38.83420867393712', { limit: 2, types: ['poi'] }, function(err, res) {
            t.ifError(err);
            t.equal(res.features.length, 2, 'returns 2 results');
            t.end();
        });
    });
    tape('limit 5 results (reverse)', function(t) {
        c.geocode('-79.37745451927184,38.83420867393712', { limit: 5, types: ['poi'] }, function(err, res) {
            t.ifError(err);
            t.equal(res.features.length, 5, 'returns 5 results');
            t.end();
        });
    });
    tape('limit 6 results (reverse)', function(t) {
        c.geocode('-79.37745451927184,38.83420867393712', { limit: 6, types: ['poi'] }, function(err, res) {
            t.ifError(err);
            t.equal(res.features.length, 5, 'returns 5 results - hard limit');
            t.end();
        });
    });
})();

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});

//Handle addressclusters
(function() {
    var conf = {
        place: new mem({
            maxzoom: 6
        }, function() {}),
        address: new mem({
            maxzoom: 12,
            geocoder_address: 1
        }, function() {})
    };
    var c = new Carmen(conf);
    tape('index place', function(t) {
        addFeature(conf.place, {
            id: 1,
            properties: {
                'carmen:text':'west virginia',
                'carmen:center': [-79.37922477722168,38.832871481546036],
                'carmen:zxy': ['6/17/24']
            }
        }, t.end);
    });

    var coords = [
        [-79.37663912773132,38.83417524443351],
        [-79.37698781490326,38.83414599360498],
        [-79.37705218791960,38.83398302448309],
        [-79.37690734863281,38.83439671460232],
        [-79.37739551067352,38.83437582121962],
        [-79.37776565551758,38.83445939471365],
        [-79.37820553779602,38.83435910650903],
        [-79.37737405300139,38.83381587627815],
        [-79.37737941741943,38.83361111919213],
        [-79.37780320644379,38.83375319560010]
    ]

    tape('index address', function(t) {
        addFeature(conf.address, {
            id:1,
            properties: {
                'carmen:text':'main street',
                'carmen:center': coords[0],
                'carmen:addressnumber': [
                    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
                ]
            },
            geometry: {
                type: "MultiPoint",
                coordinates: coords
            }
        }, t.end);
    });

    tape('Reverse Cluster', function(t) {
        c.geocode('-79.37745451927184,38.83420867393712', { limit: 5, types: ['address'] }, function(err, res) {
            t.equal(res.features.length, 5, 'returns 5 results - hard limit');
            t.ifError(err);
            t.end();
        });
    });
})();

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});
