var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

var conf = {
    test: new mem({ maxzoom:6, geocoder_address: 1 }, function() {})
};
var c = new Carmen(conf);
tape('index "av francisco de aguirre #"', function(t) {
    addFeature(conf.test, {
        id:1,
        properties: {
            'carmen:text':'av francisco de aguirre',
            'carmen:center': [0,0],
            'carmen:addressnumber': ['2']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    }, t.end);
});
tape('index "# r ademar da silva neiva"', function(t) {
    addFeature(conf.test, {
        id:2,
        properties: {
            'carmen:text':'r ademar da silva neiva',
            'carmen:center':[0,0],
            'carmen:addressnumber': ['2']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0,0]]
        }
    }, t.end);
});
// partial unidecoded terms do not match
tape('search: "av francisco de aguirre 2 la serena"', function(t) {
    c.geocode('av francisco de aguirre 2 la serena', { limit_verify:2 }, function(err, res) {
        t.equal(res.features.length, 1);
        t.equal(res.features[0].id, 'test.1');
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

