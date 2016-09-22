// byId debug geocoding queries

var tape = require('tape');
var Carmen = require('..');
var index = require('../lib/index');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature');

//Tests string value for index level geocoder_stack
(function() {
    var conf = {
        us: new mem({
            maxzoom: 6,
            geocoder_name: 'country',
            geocoder_stack: 'us'
        }, function() {}),
        ca: new mem({
            maxzoom: 6,
            geocoder_name: 'country',
            geocoder_stack: 'ca'
        }, function() {})
    };
    var c = new Carmen(conf);

    tape('index country ca', function(t) {
        addFeature(conf.ca, {
            id:1,
            properties: {
                'carmen:text':'Canada',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, t.end);
    });

    tape('index country us', function(t) {
        addFeature(conf.us, {
            id:1,
            properties: {
                'carmen:text': 'United States',
                'carmen:zxy': ['6/32/32'],
                'carmen:center': [0,0]
            }
        }, t.end);
    });

    tape('Invalid stack - not a stack name', function(t) {
        c.geocode('0,0', { stacks: ['zz'] }, function(err, res) {
            t.ok(err, 'throws error');
            t.equal(err.validStacks.length, 2, 'error includes valid stacks')
            t.end();
        });
    });

    tape('Invalid stack - not an array', function(t) {
        c.geocode('0,0', { stacks: 'zz' }, function(err, res) {
            t.ok(err, 'throws error');
            t.end();
        });
    });

    tape('query filter', function(t) {
        c.geocode('0,0', { stacks: ['ca'] }, function(err, res) {
            t.ifError(err);
            t.equals(res.features[0].place_name, 'Canada');
            t.end();
        });
    });

    tape('query filter', function(t) {
        c.geocode('United States', { stacks: ['ca'] }, function(err, res) {
            t.ifError(err);
            t.equals(res.features.length, 0);
            t.end();
        });
    });

    tape('query filter - reverse (ca)', function(t) {
        c.geocode('0,0', { stacks: ['ca'] }, function(err, res) {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].place_name, 'Canada');
            t.end();
        });
    });
    tape('query filter - reverse (us)', function(t) {
        c.geocode('0,0', { stacks: ['us'] }, function(err, res) {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].place_name, 'United States');
            t.end();
        });
    });
})();

//Tests array values for index level geocoder_stack
(function() {
    var conf = {
        country: new mem({
            maxzoom: 6,
            geocoder_stack: [ 'us', 'ca' ]
        }, function() {}),
        place: new mem({
            maxzoom: 6,
            geocoder_stack: [ 'ca', 'us' ]
        }, function() {})
    };
    var c = new Carmen(conf);

    tape('index country ca', function(t) {
        addFeature(conf.country, {
            id:1,
            properties: {
                'carmen:text':'Canada',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0],
                'carmen:geocoder_stack': 'ca'
            }
        }, t.end);
    });
    tape('index country us', function(t) {
        addFeature(conf.country, {
            id:2,
            properties: {
                'carmen:text':'United States',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0],
                'carmen:geocoder_stack': 'us'
            }
        }, t.end);
    });
    tape('index place us', function(t) {
        addFeature(conf.place, {
            id:1,
            properties: {
                'carmen:text':'Place',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0],
                'carmen:geocoder_stack': 'us'
            }
        }, t.end);
    });
    tape('index place ca', function(t) {
        addFeature(conf.place, {
            id:2,
            properties: {
                'carmen:text':'Place',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0],
                'carmen:geocoder_stack': 'ca'
            }
        }, t.end);
    });

    //Features are first filtered by the index level geocoder_stack
    //At the end each feature is then filtered by the feature level geocoder_stack
    tape('dual filter', function(t) {
        c.geocode('Place', { stacks: ['us'] }, function(err, res) {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'place.1');
            t.end();
        });
    });
    tape('dual filter', function(t) {
        c.geocode('Place', { stacks: ['ca'] }, function(err, res) {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'place.2');
            t.end();
        });
    });
})();

//Test mixed string/array index level geocoder stack
// Test mixed feature level / non existant geocoder_stack tags
//    - Lack of geocoder_stack should make them able to appear in all stacks
(function() {
    var conf = {
        country: new mem({
            maxzoom: 6,
            geocoder_stack: [ 'us', 'ca' ]
        }, function() {}),
        place: new mem({
            maxzoom: 6,
            geocoder_stack: 'ca'
        }, function() {})
    };
    var c = new Carmen(conf);

    tape('index country ca', function(t) {
        addFeature(conf.country, {
            id:1,
            properties: {
                'carmen:text':'Canada',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, t.end);
    });
    tape('index country us', function(t) {
        addFeature(conf.country, {
            id:2,
            properties: {
                'carmen:text':'United States',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, t.end);
    });
    tape('index place ca', function(t) {
        addFeature(conf.place, {
            id:1,
            properties: {
                'carmen:text':'Tess',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0],
                'carmen:geocoder_stack': 'ca'
            }
        }, t.end);
    });

    tape('Canada', function(t) {
        c.geocode('Canada', { stacks: ['ca'] }, function(err, res) {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'country.1');
            t.end();
        });
    });
    tape('United States', function(t) {
        c.geocode('United States', { stacks: ['us'] }, function(err, res) {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'country.2');
            t.end();
        });
    });
    tape('Place', function(t) {
        c.geocode('Tess, Canada', { stacks: ['ca'] }, function(err, res) {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'place.1');
            t.end();
        });
    });
})();

// Test idx assignment
(function() {
    var conf = {
        country: new mem({
            maxzoom: 6,
            geocoder_stack: [ 'us', 'ca' ]
        }, function() {}),
        place: new mem({
            maxzoom: 6,
            geocoder_stack: [ 'us', 'ca' ]
        }, function() {})
    };
    var c = new Carmen(conf);

    tape('index country high score (us)', function(t) {
        addFeature(conf.country, {
            id:1,
            properties: {
                'carmen:text': 'XXX',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0],
                'carmen:score': 999,
                'carmen:geocoder_stack': 'us'
            }
        }, t.end);
    });
    tape('index place low score (ca)', function(t) {
        addFeature(conf.place, {
            id:2,
            properties: {
                'carmen:text':'XXX',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0],
                'carmen:score': 0,
                'carmen:geocoder_stack': 'ca'
            }
        }, t.end);
    });

    tape('check stack/idx agreement', function(t) {
        c.geocode('XXX', { stacks: ['ca'] }, function(err, res) {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'place.2');
            t.end();
        });
    });
})();

//Test existing/non-existing index level geocoder_stack
(function() {
    var conf = {
        country: new mem({
            maxzoom: 6
        }, function() {}),
        place: new mem({
            maxzoom: 6,
            geocoder_stack: [ 'ca', 'us' ]
        }, function() {})
    };
    var c = new Carmen(conf);

    tape('index country ca', function(t) {
        addFeature(conf.country, {
            id:1,
            properties: {
                'carmen:text':'Canada',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, t.end);
    });
    tape('index country us', function(t) {
        addFeature(conf.country, {
            id:2,
            properties: {
                'carmen:text':'United States',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, t.end);
    });
    tape('index place ca', function(t) {
        addFeature(conf.place, {
            id:1,
            properties: {
                'carmen:text':'Tess',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, t.end);
    });

    tape('Canada', function(t) {
        c.geocode('Canada', { stacks: ['ca'] }, function(err, res) {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'country.1');
            t.end();
        });
    });
    tape('United States', function(t) {
        c.geocode('United States', { stacks: ['us'] }, function(err, res) {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'country.2');
            t.end();
        });
    });
    tape('Place', function(t) {
        c.geocode('Tess, Canada', { stacks: ['ca'] }, function(err, res) {
            t.ifError(err);
            t.equals(res.features.length, 1);
            t.equals(res.features[0].id, 'place.1');
            t.end();
        });
    });
})();
tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

