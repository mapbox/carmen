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
    c.geocode('san', {debug: 1, proximity: [3, -3]}, function(err, res) {
        console.log("Res", res.features)
        t.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});