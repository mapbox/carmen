var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var conf = {
    country: new mem({ maxzoom: 6 }, function() {})
};

var c = new Carmen(conf);
tape('index emoji country', function(assert) {
    queueFeature(conf.country, {
        id: 1,
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        },
        properties: {
            // Line smiley
            'carmen:text': decodeURIComponent('%E2%98%BA'),
            'carmen:center': [0,0]
        }
    }, assert.end);
});

tape('index non-emoji country', function(assert) {
    queueFeature(conf.country, {
        id: 2,
        geometry: {
            type: 'Point',
            coordinates: [10,10]
        },
        properties: {
            // Line smiley
            'carmen:text': 'Anarres',
            'carmen:center': [10,10]
        }
    }, assert.end);
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

tape('should not find emoji feaure', function(assert) {
    // Line smiley
    c.geocode(decodeURIComponent('%E2%98%BA'), {}, function(err, res) {
        assert.ifError(err);
        assert.equal(res.features.length, 0, 'finds no features');
        assert.end();
    });
});

tape('should not find feaure (atm or ever -- different emoji)', function(assert) {
    // Filled smiley
    c.geocode(decodeURIComponent('%E2%98%BB'), {}, function(err, res) {
        assert.ifError(err);
        assert.equal(res.features.length, 0, 'finds no features');
        assert.end();
    });
});

tape('should handle a query including emoji', function(assert) {
    // Black star
    var query = 'Anarres ' + decodeURIComponent('%E2%98%85');
    c.geocode(query, {}, function(err, res) {
        assert.ifError(err);
        assert.equal(res.features[0].id, 'country.2', 'finds Anarres');
        assert.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});