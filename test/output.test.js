var tape = require('tape');
var Carmen = require('..');
var context = require('../lib/context');
var mem = require('../lib/api-mem');
var addFeature = require('../lib/util/addfeature');
var fs = require('fs');

var conf = {
    country: new mem(null, function() {}),
    region: new mem(null, function() {}),
    place: new mem(null, function() {})
};
var c = new Carmen(conf);

tape('index country', function(assert) {
    var country = {
        id:1,
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-40,-40],
                [-40,40],
                [40,40],
                [40,-40],
                [-40,-40]
            ]]
        },
        properties: {
            'carmen:text': 'Canada',
            'carmen:score': 100,
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.country, country, assert.end);
});

tape('index region', function(assert) {
    var region = {
        id:1,
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-40,-40],
                [-40,40],
                [40,40],
                [40,-40],
                [-40,-40]
            ]]
        },
        properties: {
            'carmen:text':'Ontario',
            'carmen:score': 10,
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.region, region, assert.end);
});

tape('index place', function(assert) {
    var place = {
        id:1,
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [-40,-40],
                [-40,40],
                [40,40],
                [40,-40],
                [-40,-40]
            ]]
        },
        properties: {
            // Public properties
            'wikidata': 'Q172',
            // Internal text properties
            'carmen:text':'Toronto',
            'carmen:text_ru':'Торонто',
            'carmen:text_zh':'多伦多',
            // Internal score property
            'carmen:score': 1,
            'carmen:center':[0,0]
        }
    };
    addFeature(conf.place, place, assert.end);
});

tape('Toronto', function(assert) {
    c.geocode('Toronto', {}, function(err, res) {
        assert.ifError(err);
        var filepath = __dirname + '/fixtures/output.default.geojson';
        if (process.env.UPDATE) fs.writeFileSync(filepath, JSON.stringify(res, null, 4));
        assert.deepEqual(JSON.parse(JSON.stringify(res)), JSON.parse(fs.readFileSync(filepath)));
        assert.end();
    });
});

tape('Toronto (dev mode)', function(assert) {
    c.geocode('Toronto', { debug: true }, function(err, res) {
        assert.ifError(err);
        var filepath = __dirname + '/fixtures/output.dev.geojson';
        if (process.env.UPDATE) fs.writeFileSync(filepath, JSON.stringify(res, null, 4));
        assert.deepEqual(JSON.parse(JSON.stringify(res)), JSON.parse(fs.readFileSync(filepath)));
        assert.end();
    });
});

tape('0,0 (dev mode)', function(assert) {
    c.geocode('0,0', { debug: true }, function(err, res) {
        assert.ifError(err);
        var filepath = __dirname + '/fixtures/output.reverse-dev.geojson';
        if (process.env.UPDATE) fs.writeFileSync(filepath, JSON.stringify(res, null, 4));
        assert.deepEqual(JSON.parse(JSON.stringify(res)), JSON.parse(fs.readFileSync(filepath)));
        assert.end();
    });
});

tape('teardown', function(assert) {
    context.getTile.cache.reset();
    assert.end();
});

