var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var conf = {
    address: new mem({
        maxzoom:6,
        geocoder_type: 'address',
        geocoder_name: 'address'
    }, function() {}),
    poi: new mem({
        maxzoom:6,
        geocoder_type: 'poi',
        geocoder_name: 'address',
        geocoder_reverse_mode: true
    }, function() {})
};
var c = new Carmen(conf);

tape('add POIs', function(assert) {
    var poi = {
        id: 1,
        type: 'Feature',
        properties: {
            'carmen:text':'a',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        },
        geometry: {
            type: 'Point',
            coordinates: [0,0]
        }
    }
    queueFeature(conf.poi, poi, assert.end);
});

tape('add POIs', function(assert) {
    var poi = {
        id: 2,
        type: 'Feature',
        properties: {
            'carmen:text':'b',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0.1,-0.1]
        },
        geometry: {
            type: 'Point',
            coordinates: [0.1,-0.1]
        }
    }
    queueFeature(conf.poi, poi, assert.end);
});

tape('add POIs', function(assert) {
    var poi = {
        id: 3,
        type: 'Feature',
        properties: {
            'carmen:text':'c',
            'carmen:score':'10000',
            'carmen:zxy':['6/32/31'],
            'carmen:center':[1.005,1.005]
        },
        geometry: {
            type: 'Point',
            coordinates: [1.005,1.005]
        }
    }
    queueFeature(conf.poi, poi, assert.end);
});

tape('add POIs', function(assert) {
    var poi = {
        id: 4,
        type: 'Feature',
        properties: {
            'carmen:text':'d',
            'carmen:score':'10',
            'carmen:zxy':['6/32/31'],
            'carmen:center':[1.006,1.006]
        },
        geometry: {
            type: 'Point',
            coordinates: [1.006,1.006]
        }
    }
    queueFeature(conf.poi, poi, function() { buildQueued(conf.poi, assert.end) });
});

tape('add address', function(assert) {
    var address = {
        id: 1,
        type: 'Feature',
        properties: {
            'carmen:text':'e',
            'carmen:score':'1',
            'carmen:zxy':['6/32/31'],
            'carmen:center':[1.0071,1.0071]
        },
        geometry: {
            type: 'Point',
            coordinates: [1.006,1.006]
        }
    }

    queueFeature(conf.address, address, function() { buildQueued(conf.address, assert.end) });

});

tape('invalid', function(assert) {
    c.geocode('0,0', {reverseMode: 'foo'}, function(err, res) {
        assert.deepEqual(err && err.toString(), 'Error: foo is not a valid reverseMode. Must be one of: score, distance');
    });

    assert.end();
});

tape('reverse distance threshold - close enough', function(assert) {
    c.geocode('0.106,-0.106', {}, function(err, res) {
        assert.deepEqual(res.features.length, 1, 'finds a feature when coords are off by .006');
    });

    assert.end();
});

tape('reverse distance threshold - too far', function(assert) {
    c.geocode('0.107,-0.107', {}, function(err, res) {
        assert.deepEqual(res.features.length, 0, 'does not find a feature when coords are off by .007');
    });

    assert.end();
});

tape('get the higher-scored, more distant feature first', function(assert) {
    c.geocode('1.007, 1.007', {reverseMode: 'score'}, function(err, res) {
        assert.deepEqual(res.features[0].id, 'poi.3', 'higher-scored feature comes back first');
    });

    assert.end();
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});