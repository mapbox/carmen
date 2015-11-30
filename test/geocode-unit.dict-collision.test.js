var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('queue-async');
var addFeature = require('../lib/util/addfeature');
var termops = require('../lib/util/termops.js');

var conf = {
    place: new mem(null, function() {}),
};
var c = new Carmen(conf);

tape('index unicode place', function(t) {
    var place = {
        _id: 1,
        _text: '京都市',
        _zxy:['6/32/32'],
        _center:[0,0]
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

tape('find collisions (coalesceSingle)', function(t) {
    c.geocode('j', { limit_verify:1 }, function(err, res) {
        t.equal(res.features.length, 0, 'not in index');
        t.deepEqual(res.waste[0], ['place'], 'has i/o waste for place');
        t.end();
    });
});

tape('index.teardown', function(assert) {
    index.teardown();
    context.getTile.cache.reset();
    assert.end();
});


