//Ensure that results that have equal relev in phrasematch
//are matched against the 0.5 relev bar instead of 0.75

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var conf = {
    test: new mem({ maxzoom:6 }, function() {})
};
var c = new Carmen(conf);
tape('index 京都市', function(t) {
    queueFeature(conf.test, {
        id:1,
        properties: {
            'carmen:text':'京都市',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index москва', function(t) {
    queueFeature(conf.test, {
        id:2,
        properties: {
            'carmen:text':'москва',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});
tape('index josé', function(t) {
    queueFeature(conf.test, {
        id:3,
        properties: {
            'carmen:text':'josé',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    }, t.end);
});

tape('build queued features', function(t) {
    var q = queue();
    Object.keys(conf).forEach(function(c) {
        q.defer(function(cb) {
            buildQueued(conf[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('京 => 京都市', function(t) {
    c.geocode('京', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, '京都市');
        t.end();
    });
});
tape('京都市 => 京都市', function(t) {
    c.geocode('京都市', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, '京都市');
        t.end();
    });
});
tape('jing !=> 京都市', function(t) {
    c.geocode('jing', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features.length, 0, 'CJK transliteration disabled 1');
        t.end();
    });
});
tape('jing du shi !=> 京都市', function(t) {
    c.geocode('jing du shi', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features.length, 0, 'CJK transliteration disabled 2');
        t.end();
    });
});
// partial unidecoded terms do not match
tape('ji => no results', function(t) {
    c.geocode('ji', { limit_verify:1 }, function(err, res) {
        t.equal(res.features.length, 0);
        t.end();
    });
});

tape('м => москва', function(t) {
    c.geocode('м', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, 'москва');
        t.end();
    });
});
tape('москва => москва', function(t) {
    c.geocode('москва', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, 'москва');
        t.end();
    });
});
tape('m => москва', function(t) {
    c.geocode('m', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, 'москва');
        t.end();
    });
});
tape('moskva => москва', function(t) {
    c.geocode('moskva', { limit_verify:1 }, function(err, res) {
        t.deepEqual(res.features[0].place_name, 'москва');
        t.end();
    });
});

tape('j => josé', function(t) {
    c.geocode('j', { limit_verify:1 }, function(err, res) {
        t.equal(res.features[0].place_name, 'josé');
        t.end();
    });
});
tape('jose => josé', function(t) {
    c.geocode('jose', { limit_verify:1 }, function(err, res) {
        t.equal(res.features[0].place_name, 'josé');
        t.end();
    });
});
tape('josé => josé', function(t) {
    c.geocode('josé', { limit_verify:1 }, function(err, res) {
        t.equal(res.features[0].place_name, 'josé');
        t.end();
    });
});


tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

