var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

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
    queueFeature(conf.country, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 1,
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

tape('index region', function(t) {
    queueFeature(conf.region, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 1,
            'carmen:text':'state of new york, new york',
            'carmen:text_es':'nueva york'
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
    queueFeature(conf.place, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 1,
            'carmen:text':'new york',
            'carmen:text_es':'nueva york'
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

tape('build queued features', function(t) {
    var q = queue();
    Object.keys(conf).forEach(function(c) {
        q.defer(function(cb) {
            buildQueued(conf[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('find new york', function(t) {
    c.geocode('new york usa', {}, function(err, res) {
        t.equal(res.features[0].id, 'place.1');
        t.equal(res.features[0].relevance, 1);
        t.end();
    });
});

tape('find nueva york, language=es', function(t) {
    c.geocode('nueva york usa', { language: 'es' }, function(err, res) {
        t.equal(res.features[0].id, 'place.1');
        t.equal(res.features[0].relevance, 1);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

// Simulate a case where carmen:text has a discrepancy but carmen:text_en
// allows a text match to occur.
var conf2 = {
    country: new mem({ maxzoom: 6 }, function() {}),
    region: new mem({ maxzoom: 6 }, function() {}),
    place: new mem({ maxzoom: 6, geocoder_inherit_score: true }, function() {})
};

var c2 = new Carmen(conf2);

tape('index country', function(t) {
    queueFeature(conf2.country, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 1,
            'carmen:text':'saudi arabia'
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

tape('index region', function(t) {
    queueFeature(conf2.region, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 1,
            'carmen:text': 'مكة',
            'carmen:text_en':'Makkah'
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
    queueFeature(conf2.place, {
        id: 1,
        properties: {
            'carmen:center': [0,0],
            'carmen:score': 1,
            'carmen:text':'Makkah Al Mukarramah',
            'carmen:text_en':'Makkah'
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

tape('build queued features', function(t) {
    var q = queue();
    Object.keys(conf2).forEach(function(c) {
        q.defer(function(cb) {
            buildQueued(conf2[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('find makkah', function(t) {
    c2.geocode('makkah', {}, function(err, res) {
        t.equal(res.features[0].id, 'place.1');
        t.equal(res.features[0].relevance, 0.99);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

