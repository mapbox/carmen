var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    place: new mem(null, function() {}),
};
var c = new Carmen(conf);

tape('index unicode place', function(t) {
    var place = {
        id: 1,
        properties: {
            'carmen:text': '京都市',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.place, place, t.end);
});

tape('valid match', function(t) {
    c.geocode('京都市', { limit_verify:1 }, function(err, res) {
        t.ifError(err);
        t.equal(res.features.length, 1);
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});


