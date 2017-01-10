var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    country: new mem({maxzoom: 6}, function() {}),
    region: new mem({maxzoom: 6}, function() {}),
    place: new mem({maxzoom: 6}, function() {})
};
var c = new Carmen(conf);
var tiles1 = [];
var tiles2 = [];
var tile1;
var tile2;
for (var k=27; k<33; k++) {
    for (var l=27; l<33; l++) {
        tile1 = '6/' + k + '/' + l;
        tile2 = '6/' + (k - 6) + '/' + (l - 6);
        tiles1.push(tile1);
        tiles2.push(tile2);
    }
}

tape('index batch country', function(t) {
    var docs = [];
    var country;

    country = {
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'united states',
            'carmen:zxy':tiles1,
            'carmen:center':[0,0]
        }
    };
    docs.push(country);

    country = {
        id:2,
        type: 'Feature',
        properties: {
            'carmen:text':'united states minor outlying islands',
            'carmen:zxy':tiles1,
            'carmen:center':[0,0]
        }
    };
    docs.push(country);

    for (var i=3; i < 260; i++) {
        country = {
            id:i,
            type: 'Feature',
            properties: {
                'carmen:text':'united arab emirates',
                'carmen:zxy':['6/10/10'],
                'carmen:center':[0,0]
            }
        };
        docs.push(country);
    }

    addFeature(conf.country, docs, t.end);
});

tape('index region', function(t) {
    var region = {
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'Texas,TX',
            'carmen:zxy':tiles1,
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.region, region, t.end);
});

tape('index place', function(t) {
    var place = {
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'Dallas',
            'carmen:zxy':tiles1,
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.place, place, t.end);
});

tape('query batched features', function(t) {
    c.geocode('united', {allow_dupes: true}, function(err, res) {
        console.log("Res", res);
        t.equals(res.features.length, 5, "finds batched features")
        t.end();
    });
});

tape('check relevance', function(t) {
    c.geocode('dallas texas united states', {}, function(err, res) {
        // TODO
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});