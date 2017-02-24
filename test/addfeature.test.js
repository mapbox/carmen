var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var queue = require('d3-queue').queue;
var addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

var conf = {
    address : new mem({maxzoom: 6}, function() {}),
    poi : new mem({maxzoom: 6}, function() {})
};
var c = new Carmen(conf);

tape('index address', function(t) {
    var docs = [];
    var address;
    
    for (var i=0; i<1; i++) {
        address = {
            id:1,
            type: 'Feature',
            properties: {
                'carmen:text':'lake view road,lake view',
                'carmen:center':[0,10]
            },
            geometry: {
                type: 'Point',
                coordinates: [0,10]
            }
        };
        docs.push(address);
    }
    for (var j=2; j<=103; j++) {
        address = {
            id:2,
            type: 'Feature',
            properties: {
                'carmen:text':'main road',
                'carmen:center':[0,10]
            },
            geometry: {
                type: 'Point',
                coordinates: [0,10]
            }
        };
        docs.push(address);
    }
    queueFeature(conf.address, docs, t.end);
});

tape('index pois', function(t) {
    var docs = [];
    var poi;
    
    for (var k=103; k<=104; k++) {
        poi = {
            id:3,
            type: 'Feature',
            properties: {
                'carmen:text':'Starbucks',
                'carmen:score':'150',
                'carmen:center':[0,10]
            },
            geometry: {
                type: 'Point',
                coordinates: [0,10]
            }
        };
        docs.push(poi);
    }
    queueFeature(conf.poi, docs, t.end);
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

tape('Search for Starbucks', function(t) {
    c.geocode('starbucks lake view', {autocomplete: false, limit_verify: 2}, function(err, res) {
        t.equal(res.features[0].relevance, 1, 'stacked relevance');
        t.equal(res.features.length, 2, 'two features returned');
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});