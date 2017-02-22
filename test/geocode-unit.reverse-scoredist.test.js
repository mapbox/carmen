var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    address: new mem({
        maxzoom:6,
        geocoder_type: 'address',
        geocoder_name: 'address'
    }, function() {}),
    poi: new mem({
        maxzoom:6,
        geocoder_type: 'poi',
        geocoder_name: 'address'
    }, function() {})
};
var c = new Carmen(conf);

tape('add POIs', function(assert) {
    var docs = [];
    var poi;

    poi = {
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
    docs.push(poi);

    poi = {
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
    docs.push(poi);

    poi = {
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
    docs.push(poi);

    poi = {
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
    docs.push(poi);

    addFeature(conf.poi, docs, assert.end);

});

tape('add address', function(assert) {
    var docs = [];
    var address;

    address = {
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
    docs.push(address);

    addFeature(conf.address, docs, assert.end);

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