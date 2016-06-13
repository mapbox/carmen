// Tests Windsor CT (city) vs Windsor Ct (street name)
// Windsor CT should win via stacky bonus.

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

var conf = {
    province: new mem(null, function() {}),
    postcode: new mem(null, function() {}),
    city: new mem(null, function() {}),
    street: new mem({ maxzoom:6, geocoder_address:1 }, function() {})
};
var c = new Carmen(conf);
tape('index province', function(t) {
    var province = {
        id:1,
        properties: {
            'carmen:text':'connecticut, ct',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.province, province, t.end);
});
tape('index city', function(t) {
    var city = {
        id:1,
        properties: {
            'carmen:text':'windsor',
            'carmen:zxy':['6/32/32','6/33/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.city, city, t.end);
});
tape('index street', function(t) {
    var street = {
        id:1,
        properties: {
            'carmen:text':'windsor ct',
            'carmen:zxy':['6/33/32'],
            'carmen:center':[360/64,0]
        }
    };
    addFeature(conf.street, street, t.end);
});
// city beats street at context sort
tape('windsor ct (limit 2)', function(t) {
    c.geocode('windsor ct', { limit_verify:2 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'windsor, connecticut');
        t.deepEqual(res.features[0].id, 'city.1');
        t.end();
    });
});
// street beats city
tape('windsor ct windsor', function(t) {
    c.geocode('windsor ct windsor', { limit_verify:2 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'windsor ct, windsor');
        t.deepEqual(res.features[0].id, 'street.1');
        t.deepEqual(res.features[0].relevance, 1);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});
