// Reverse geocoding itp&pt (presidence)

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');

(function() {
    var conf = {
        address: new mem({maxzoom: 6, geocoder_address: 1}, function() {})
    };
    var c = new Carmen(conf);
    tape('index address pt', function(t) {
        var address = {
            _id:1,
            _text:'majestic drive',
            _zxy:['6/20/22'],
            _center: '-66.19295954704285, 45.32757192213404',
            _cluster: {
                "28": {
                    "type": "Point",
                    "coordinates": [ -66.19295954704285, 45.32757192213404 ]
                }
            },
            _geometry: {
                "type": "Point",
                "coordinates": [ -66.19295954704285, 45.32757192213404 ]
            }
        };
        addFeature(conf.address, address, t.end);
    });
    tape('index address itp', function(t) {
        var address = {
            _id:2,
            _text:'majestic drive',
            _zxy:['6/20/22'],
            _rangetype:'tiger',
            _rfromhn: ['28','30'],
            _rtohn: ['30','32'],
            _parityr: ['E','E'],
            _center: '-66.19305342435837, 45.32779820975496',
            _geometry: {
               "type": "LineString",
                "coordinates": [
                    [ -66.19361937046050, 45.32768695178765 ],
                    [ -66.19305342435837, 45.32779820975496 ],
                    [ -66.19213342666626, 45.3278132955642 ]
                ]
            }
        };
        addFeature(conf.address, address, t.end);
    });
    tape('test address query with address range', function(t) {
        c.geocode('28 majestic drive', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].id, 'address.1', 'result is pt');
            t.equals(res.features[0].place_name, '28 majestic drive', 'found 28 majestic drive');
            t.equals(res.features[0].relevance, 0.99);
            t.end();
        });
    });

    //This result should return the PT - due to mapnik this is currently not the case
    tape('reverse geocode pt', function(t) {
        c.geocode('-66.19295954704285, 45.32757192213404', { limit_verify: 1 }, function (err, res) {
            t.ifError(err);
            t.equals(res.features[0].id, 'address.2', 'result is itp');
            t.equals(res.features[0].place_name, '28 majestic drive', 'found 28 majestic drive');
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });
})();

tape('index.teardown', function(assert) {
    index.teardown();
    assert.end();
});

