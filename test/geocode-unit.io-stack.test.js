// Unit tests for IO-deduping when loading grid shards during spatialmatch.
// Setups up multiple indexes representing logical equivalents.

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
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
[1,2,3].forEach(function(i) {
    tape('index place ' + i, function(t) {
        addFeature(conf['place'+i], {
            _id:1,
            _text:'springfield',
            _zxy:['6/32/32'],
            _center:[0,0]
        }, t.end);
    });
    tape('index street ' + i, function(t) {
        addFeature(conf['street'+i], {
            _id:1,
            _text:'winding river rd',
            _zxy:['6/32/32'],
            _center:[0,0]
        }, t.end);
    });
    tape('index street ' + i, function(t) {
        addFeature(conf['street'+i], {
            _id:2,
            _text:'river rd',
            _zxy:['6/32/32'],
            _center:[0,0]
        }, t.end);
    });
    tape('clear memory, i/o log', function(t) {
        conf['place'+i]._geocoder.unloadall('grid');
        conf['place'+i]._original.logs.getGeocoderData = [];
        conf['place'+i]._original.logs.getTile = [];
        conf['street'+i]._geocoder.unloadall('grid');
        conf['street'+i]._original.logs.getGeocoderData = [];
        conf['street'+i]._original.logs.getTile = [];
        t.end();
    });
});

tape('winding river rd springfield', function(t) {
    c.geocode('winding river rd  springfield', {}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'winding river rd, springfield');
        t.deepEqual(c.indexes.place1._original.logs.getGeocoderData, ['grid,62799'], 'place1: loads 1 grid');
        t.deepEqual(c.indexes.place1._original.logs.getTile, ['6,32,32'], 'place1: loads 1 tile');

        t.deepEqual(c.indexes.street1._original.logs.getGeocoderData.sort(), ['feature,1','feature,2','grid,52975','grid,8765'], 'street1: loads 1 grid, 1 feature per result');
        t.deepEqual(c.indexes.street1._original.logs.getTile, [], 'street1: loads no tiles (most specific index)');
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});

