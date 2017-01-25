var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

// Tests New York (place), New York (region), USA (country)
// identically-named features should reverse the gappy penalty and
// instead prioritize the highest-index feature
var conf = {
    country: new mem({ maxzoom: 6 }, function() {}),
    region: new mem({ maxzoom: 6 }, function() {}),
    place: new mem({ maxzoom: 6, geocoder_inherit_score: true }, function() {})
};

var c = new Carmen(conf);

tape('index country', function(t) {
    addFeature(conf.country, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 1000000,
            'carmen:text':'usa',
            'carmen:text_en':'usa'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-20,-20],
                [-20,20],
                [20,20],
                [20,-20],
                [-20,-20],
            ]]
        }
    }, t.end);
});

tape('index country', function(t) {
    addFeature(conf.country, {
        id: 2,
        properties: {
            'carmen:center': [45,45],
            'carmen:score': 10,
            'carmen:text':'georgia'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [40,40],
                [40,50],
                [50,50],
                [50,40],
                [40,40],
            ]]
        }
    }, t.end);
});

tape('index region', function(t) {
    addFeature(conf.region, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 50,
            'carmen:text':'georgia'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-20,-20],
                [-20,20],
                [20,20],
                [20,-20],
                [-20,-20],
            ]]
        }
    }, t.end);
});

tape('index place', function(t) {
    addFeature(conf.place, {
        id: 1,
        properties: {
            'carmen:center': [45,45],
            'carmen:score': 1,
            'carmen:text':'georgia'
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [40,40],
                [40,50],
                [50,50],
                [50,40],
                [40,40],
            ]]
        }
    }, t.end);
});

tape('find georgia', function(t) {
    c.geocode('georgia', {}, function(err, res) {
        t.equal(res.features[0].id, 'region.1');
        t.equal(res.features[0].relevance, 0.99);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

