// Tests Windsor CT (city) vs Windsor Ct (street name)
// Windsor CT should win via stacky bonus.

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem(null, function() {}),
    province: new mem(null, function() {}),
    place: new mem(null, function() {})
};
var c = new Carmen(conf);
tape('index country', function(t) {
    addFeature(conf.country, {
        id:1,
        properties: {
            'carmen:text':'australia',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index province', function(t) {
    addFeature(conf.province, {
        id:2,
        properties: {
            'carmen:text':'western australia',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index place', function(t) {
    addFeature(conf.place, {
        id:3,
        properties: {
            'carmen:text':'albany',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
// should reflect relevance of albany + australia (relev ~ 1), not albany + western australia (relev ~ 0.8)
tape('albany australia', function(t) {
    c.geocode('albany australia', {}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features[0].place_name, 'albany, western australia, australia');
        t.deepEqual(res.features[0].relevance, 0.999);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

