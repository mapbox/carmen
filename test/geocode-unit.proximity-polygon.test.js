var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');

var conf = {
    place: new mem({maxzoom: 12}, function() {})
};
var c = new Carmen(conf);
var tiles = [];
var tiles1 = [];
var tiles2 = [];
var tiles3 = [];
var tile;
for (var k=2048; k<2080; k++) {
    for (var l=2048; l<2080; l++) {
        tile = '12/' + k + '/' + l;
        tiles.push(tile);
    }
}
tiles1 = tiles.slice(0, 341);
tiles2 = tiles.slice(341,682);
tiles3 = tiles.slice(682);

tape('index place', function(t) {
    var docs = [];
    var place;

    place = {
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'san francisco',
            'carmen:score':'10000',
            'carmen:zxy':tiles1,
            'carmen:center':[2, -1]
        }
    };
    docs.push(place);

    place = {
        id:2,
        type: 'Feature',
        properties: {
            'carmen:text':'san diego',
            'carmen:score':'1000',
            'carmen:zxy':tiles2,
            'carmen:center':[2, -1]
        }
    };
    docs.push(place);

    place = {
        id:3,
        type: 'Feature',
        properties: {
            'carmen:text':'san jose',
            'carmen:score':'100',
            'carmen:zxy':tiles3,
            'carmen:center':[2, -1]
        }
    };
    docs.push(place);

    addFeature(conf.place, docs, t.end);
});

tape('query', function(t) {
    context.getTile.cache.reset();
    addFeature.resetLogs(conf);
    c.geocode('san', {debug: true, proximity: [3, -3]}, function(err, res) {
        t.equal(res.features[1].id, 'place.3', 'proximity boosts lower-scored place');
        t.equal(res.features[1].properties['carmen:score'] < res.features[2].properties['carmen:score'], true, 'place.3 has a lower score than place.2');
        t.equal(res.features[1].properties['carmen:distance'] < res.features[2].properties['carmen:distance'], true, 'place.3 is closer than place.2 to proximity point');
        t.equal(res.features[1].properties['carmen:scoredist'] > res.features[2].properties['carmen:scoredist'], true, 'place.2 has a higher scoredist than place.3');
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});