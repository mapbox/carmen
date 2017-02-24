// Tests Windsor CT (city) vs Windsor Ct (street name)
// Windsor CT should win via stacky bonus.

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var conf = {
    // make maxscore a string to simulate how carmen will encounter it after pulling it from the meta table in an mbtiles file
    place: new mem({geocoder_name: 'place', maxzoom: 6, minscore: '0', maxscore: '0', geocoder_stack: 'us'}, function() {}),
};

var c = new Carmen(conf);

tape('index place', function(t) {
    queueFeature(conf.place, {
        id:1,
        properties: {
            'carmen:score':0,
            'carmen:text':'Chicago',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, function() { buildQueued(conf.place, t.end) });
});

// this should have been indexed properly despite having a zero score in an index with zero maxscore
tape('geocode against an all-zero-score index', function(t) {
    c.geocode('chicago', { limit_verify: 1 }, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 1, '1 result');
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});