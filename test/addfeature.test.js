var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem({maxzoom: 6}, function() {}),
};
var c = new Carmen(conf);

tape('index batch', function(t) {
    var docs = [];
    var country;
    for (var i=1; i < 6; i++) {
        country = {
            id:i,
            type: 'Feature',
            properties: {
                'carmen:text':'united states ' + i,
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        };
        docs.push(country);
    }
    addFeature(conf.country, docs, t.end);
});

tape('query batched features', function(t) {
    c.geocode('united states', null, function(err, res) {
        t.equals(res.features.length, 5, "finds all batched features")
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});