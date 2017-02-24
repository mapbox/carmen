// Unit tests for IO-deduping when loading grid shards during spatialmatch.
// Setups up multiple indexes representing logical equivalents.

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

// Setup includes the api-mem `timeout` option to simulate asynchronous I/O.
var conf = {
    place: new mem({ maxzoom:6, geocoder_name: 'place', timeout:10 }, function() {}),
};
var c = new Carmen(conf);

tape('ready', function(assert) {
    c._open(assert.end);
});

tape('index place', function(assert) {
    var docs = [];
    for (var i = 1; i < 100; i++) {
        var text = Math.random().toString().split('.').pop().toString(36);
        docs.push({
            id:i,
            properties: {
                'carmen:text': 'aa' + text,
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        });
    }
    queueFeature(conf.place, docs, function() { buildQueued(conf.place, assert.end) })
});

function reset() {
    context.getTile.cache.reset();
    conf.place._original.logs.getGeocoderData = [];
    conf.place._original.logs.getTile = [];
}

tape('io', function(t) {
    reset();
    c.geocode('aa', {}, function(err, res) {
        t.ifError(err);
        t.deepEqual(res.features.length, 5, 'returns 5 features');
        var loaded = c.indexes.place._original.logs.getGeocoderData.filter(function(id) { return /grid/.test(id) }).length;
        t.deepEqual(loaded <= 10, true, '<= 10 shards loaded: ' + loaded);
        t.end();
    });
});

tape('index.teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

