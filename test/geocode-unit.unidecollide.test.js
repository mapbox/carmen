// test separation of character sets, avoiding unidecode problems like:
// 'Alberta' aka 'アルバータ州' =[unidecode]=> 'arubataZhou' => false positives for 'Aruba'

var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

(function() {

    var conf = {
        place_a: new mem({maxzoom:6, geocoder_name:'region'}, function() {}),
    };
    var c = new Carmen(conf);
    tape('index Alberta', function(t) {
        queueFeature(conf.place_a, {
            id:1,
            properties: {
                'carmen:text':'Alberta',
                'carmen:text_ja':'アルバータ州',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, function() { buildQueued(conf.place_a, t.end) });
    });

    tape('heading to Aruba, I hope you packed warm clothes', function(t) {
        c.geocode('aruba', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features.length, 0, 'Alberta feature does not match \'Aruba\'');
            t.end();
        });
    });

    tape('JP query works', function(t) {
        c.geocode('アルバータ州', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Alberta');
            t.deepEqual(res.features[0].id, 'region.1');
            t.end();
        });
    });

    tape('Latin query works', function(t) {
        c.geocode('Alber', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.deepEqual(res.features[0].place_name, 'Alberta');
            t.deepEqual(res.features[0].id, 'region.1');
            t.end();
        });
    });


    tape('teardown', function(assert) {
        context.getTile.cache.reset();
        assert.end();
    });

})();

(function() {

    var conf = {
        place_a: new mem({maxzoom:6, geocoder_name:'region'}, function() {}),
    };
    var c = new Carmen(conf);
    tape('index abc xyz', function(t) {
        queueFeature(conf.place_a, {
            id:1,
            properties: {
                'carmen:text':'abc Xyz',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, function() { buildQueued(conf.place_a, t.end) });
    });

    tape('check for collisions based on char prefixing', function(t) {
        c.geocode('yz', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features.length, 0, 'search for yz returned no results');
            t.end();
        });
    });

    tape('check for collisions based on char prefixing', function(t) {
        c.geocode('a yz', { limit_verify:1 }, function(err, res) {
            t.ifError(err);
            t.equals(res.features.length, 0, 'search for \'a yz\' returned no results');
            t.end();
        });
    });

    tape('teardown', function(assert) {
        context.getTile.cache.reset();
        assert.end();
    });

})();
