// Unit tests for IO-deduping when loading grid shards during spatialmatch.
// Setups up multiple indexes representing logical equivalents.

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

// Setup includes the api-mem `timeout` option to simulate asynchronous I/O.
var conf = {
    place1: new mem({ maxzoom:6, geocoder_name: 'place', timeout:10 }, function() {}),
    place2: new mem({ maxzoom:6, geocoder_name: 'place', timeout:10 }, function() {}),
    place3: new mem({ maxzoom:6, geocoder_name: 'place', timeout:10 }, function() {}),
    street1: new mem({ maxzoom:6, geocoder_name: 'street', timeout:10, geocoder_address:1 }, function() {}),
    street2: new mem({ maxzoom:6, geocoder_name: 'street', timeout:10, geocoder_address:1 }, function() {}),
    street3: new mem({ maxzoom:6, geocoder_name: 'street', timeout:10, geocoder_address:1 }, function() {})
};
var c = new Carmen(conf);

tape('ready', function(assert) {
    c._open(assert.end);
});

[1,2,3].forEach(function(i) {
    tape('index place ' + i, function(t) {
        addFeature(conf['place'+i], {
            id:1,
            properties: {
                'carmen:text':'springfield',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, t.end);
    });
    tape('index street ' + i, function(t) {
        addFeature(conf['street'+i], {
            id:1,
            properties: {
                'carmen:text':'winding river rd',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, t.end);
    });
    tape('index street ' + i, function(t) {
        addFeature(conf['street'+i], {
            id:2,
            properties: {
                'carmen:text':'river rd',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, t.end);
    });
    tape('index street ' + i, function(t) {
        addFeature(conf['street'+i], {
            id:3,
            properties: {
                'carmen:text':'springfield st',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, t.end);
    });
});

function reset() {
    context.getTile.cache.reset();
    [1,2,3].forEach(function(i) {
        conf['place'+i]._geocoder.unloadall('grid');
        conf['place'+i]._original.logs.getGeocoderData = [];
        conf['place'+i]._original.logs.getTile = [];
        conf['street'+i]._geocoder.unloadall('grid');
        conf['street'+i]._original.logs.getGeocoderData = [];
        conf['street'+i]._original.logs.getTile = [];
    });
}

tape('winding river rd springfield', function(t) {
    reset();
    c.geocode('winding river rd  springfield', {}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'winding river rd, springfield');
        t.deepEqual(c.indexes.place1._original.logs.getGeocoderData, ['grid,29750'], 'place1: loads 1 grid');
        t.deepEqual(c.indexes.place1._original.logs.getTile, ['6,32,32'], 'place1: loads 1 tile');

        t.deepEqual(c.indexes.street1._original.logs.getGeocoderData.sort(), ['feature,1', 'feature,2', 'grid,12737', 'grid,29789'], 'street1: loads 1 grid, 1 feature per result');
        t.deepEqual(c.indexes.street1._original.logs.getTile, [], 'street1: loads no tiles (most specific index)');
        t.end();
    });
});

tape('springfield', function(t) {
    reset();
    c.geocode('springfield', {}, function(err, res) {
        t.ifError(err);

        t.deepEqual(res.features.length, 2);
        t.deepEqual(res.features[0].place_name, 'springfield');
        t.deepEqual(res.features[0].id, 'place.1');
        t.deepEqual(res.features[1].place_name, 'springfield st, springfield');
        t.deepEqual(res.features[1].id, 'street.3');

        t.deepEqual(c.indexes.place1._original.logs.getGeocoderData.sort(), ['feature,1','grid,29750'], 'place1: loads 1 grid');
        t.deepEqual(c.indexes.place1._original.logs.getTile, ['6,32,32'], 'place1: loads 1 tile');

        t.deepEqual(c.indexes.street1._original.logs.getGeocoderData.sort(), ['feature,3','grid,29750'], 'street1: loads 1 grid, 1 feature per result');
        t.deepEqual(c.indexes.street1._original.logs.getTile, [], 'street1: loads no tiles (most specific index)');
        t.end();
    });
});

tape('springfield, types=place', function(t) {
    reset();
    c.geocode('springfield', { types:['place'] }, function(err, res) {
        t.ifError(err);

        t.deepEqual(res.features.length, 1);
        t.deepEqual(res.features[0].place_name, 'springfield');
        t.deepEqual(res.features[0].id, 'place.1');

        t.deepEqual(c.indexes.place1._original.logs.getGeocoderData.sort(), ['feature,1','grid,29750'], 'place1: loads 1 grid');
        t.deepEqual(c.indexes.place1._original.logs.getTile, [], 'place1: loads 0 tiles');

        t.deepEqual(c.indexes.street1._original.logs.getGeocoderData.sort(), [], 'street1: no io');
        t.deepEqual(c.indexes.street1._original.logs.getTile, [], 'street1: no io');
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

