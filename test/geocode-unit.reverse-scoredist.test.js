var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    poi: new mem({ maxzoom:6 }, function() {})
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

    addFeature(conf.poi, docs, assert.end);

});

tape('reverse distance threshold - close enough', function(assert) {
    c.geocode('0.106,-0.106', null, function(err, res) {
        assert.deepEqual(res.features.length, 1, 'finds a feature when coords are off by .006');
    });

    assert.end();
});

tape('reverse distance threshold - too far', function(assert) {
    c.geocode('0.107,-0.107', null, function(err, res) {
        assert.deepEqual(res.features.length, 0, 'does not find a feature when coords are off by .007');
    });

    assert.end();
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});