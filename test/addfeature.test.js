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
var tiles = [];
var tiles1 = [];
var tiles2 = [];
var tile;
for (var k=0; k<32; k++) {
    for (var l=0; l<32; l++) {
        tile = '6/' + k + '/' + l;
        tiles.push(tile);
    }
}
tiles1 = tiles.slice(200);
tiles2 = tiles.slice(0, -200);

tape('index country (batch)', function(t) {
    var docs = [];
    var country;

    country = {
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'United States',
            'carmen:score':'10000',
            'carmen:zxy':tiles1,
            'carmen:center':[-1,1]
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[[-10,0],[-10,10],[0,10],[0,0],[-10,0]]]
        }
    };
    docs.push(country);

    country = {
        id:2,
        type: 'Feature',
        properties: {
            'carmen:text':'United States Minor Outlying Islands',
            'carmen:score':'1000',
            'carmen:zxy':tiles2,
            'carmen:center':[-60,60]
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[[-70,50],[-70,70],[-50,70],[-50,50],[-70,50]]]
        }
    };
    docs.push(country);

    country = {
        id:3,
        type: 'Feature',
        properties: {
            'carmen:text':'United Arab Emirates',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    docs.push(country);

    country = {
        id:4,
        type: 'Feature',
        properties: {
            'carmen:text':'United Kingdom',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0]
        }
    };
    docs.push(country);

    addFeature(conf.country, docs, t.end);
});

tape('index region', function(t) {
    var docs = []
    var midway = {
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'Midway',
            'carmen:score':'100',
            'carmen:zxy':tiles1,
            'carmen:center':[-60,60]
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[[-70,50],[-70,70],[-50,70],[-50,50],[-70,50]]]
        }
    };
    docs.push(midway);

    var usvi = {
        id:2,
        type: 'Feature',
        properties: {
            'carmen:text':'United States Virgin Islands',
            'carmen:score':'100',
            'carmen:zxy':tiles2,
            'carmen:center':[-6,6]
        },
        geometry: {
            type: 'Polygon',
            coordinates: [[[-7,5],[-7,7],[-5,7],[-5,5],[-7,5]]]
        }
    };
    docs.push(usvi)
    addFeature(conf.region, docs, t.end);
});

tape('index place', function(t) {
    var docs = [];
    var place;
    for (var i=1; i<5; i++) {
        place = {
            id:i,
            type: 'Feature',
            properties: {
                'carmen:text':'Midway',
                'carmen:score':'100',
                'carmen:zxy':tiles2,
                'carmen:center':[-1,1]
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[[-1,0],[-1,1],[0,1],[0,0],[-1,0]]]
            }
        };
        docs.push(place);
    }
    for (var j=101; j<105; j++) {
        place = {
            id: j,
            type: 'Feature',
            properties: {
                'carmen:text': 'United States',
                'carmen:score':'100',
                'carmen:zxy': tiles2,
                'carmen:center': [-3, 3]
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[[-4,2],[-4,4],[-2,4],[-2,2],[-4,2]]]
            }
        }
        docs.push(place);
    }
    addFeature(conf.place, docs, t.end);
    
});

tape('query batched features', function(t) {
    c.geocode('united', {allow_dupes: true}, function(err, res) {
        t.equals(res.features.length, 5, "finds batched features")
        t.end();
    });
});

tape('check relevance', function(t) {
    context.getTile.cache.reset();
    addFeature.resetLogs();
    c.geocode('midway united states', {allow_dupes: true, types:['place', 'region']}, function(err, res) {
        t.equals(res.features[0].id, 'region.1', 'finds region feature first');
        t.equals(res.features[0].relevance, 1, 'region has relevance of 1');
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});