const tape = require('tape');
const feature = require('../lib/util/feature.js');
const Memsource = require('../lib/api-mem.js');
const Carmen = require('../index.js');

const source = new Memsource(
    {
        maxzoom: 6,
        maxscore: 2000
    },
    () => {}
);
const conf = { source: source };
const carmen = new Carmen(conf);

tape('putFeatures', t => {
    t.ok(carmen);
    feature.putFeatures(
        conf.source,
        [
            {
                id: 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'a',
                    'carmen:center': [0, 0],
                    'carmen:zxy': ['6/32/32']
                },
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            },
            {
                id: 2,
                type: 'Feature',
                properties: {
                    'carmen:text': 'b',
                    'carmen:center': [0, 0],
                    'carmen:zxy': ['6/32/32']
                },
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            },
            {
                id: Math.pow(2, 20) + 1,
                type: 'Feature',
                properties: {
                    'carmen:text': 'c',
                    'carmen:center': [360 / 64 + 0.001, 0],
                    'carmen:zxy': ['6/33/32']
                },
                geometry: {
                    type: 'Point',
                    coordinates: [360 / 64 + 0.001, 0]
                }
            },
            {
                id: 2814870916619710,
                type: 'Feature',
                properties: {
                    'carmen:text': 'Frankenstein',
                    'carmen:center': [0, 0],
                    'carmen:zxy': ['6/32/32'],
                    'carmen:score': 1500
                },
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            },
            {
                id: 11111222222183870,
                type: 'Feature',
                properties: {
                    'carmen:text': 'Dr Jekyll',
                    'carmen:center': [0, 0],
                    'carmen:zxy': ['6/32/32'],
                    'carmen:score': 10
                },
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            },
            {
                id: 6832527855771070,
                type: 'Feature',
                properties: {
                    'carmen:text': 'Mr Hyde',
                    'carmen:center': [0, 0],
                    'carmen:zxy': ['6/32/32'],
                    'carmen:score': 1000
                },
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0]
                }
            }
        ],
        err => {
            t.ifError(err);
            t.equal(
                source._shards.feature[1],
                '{"1":{"id":1,"type":"Feature","properties":{"carmen:text":"a","carmen:center":[0,0],"carmen:zxy":["6/32/32"]},"geometry":{"type":"Point","coordinates":[0,0]}},"1048577":{"id":1048577,"type":"Feature","properties":{"carmen:text":"c","carmen:center":[5.626,0],"carmen:zxy":["6/33/32"]},"geometry":{"type":"Point","coordinates":[5.626,0]}}}',
                'has feature shard 1'
            );
            t.equal(
                source._shards.feature[2],
                '{"2":{"id":2,"type":"Feature","properties":{"carmen:text":"b","carmen:center":[0,0],"carmen:zxy":["6/32/32"]},"geometry":{"type":"Point","coordinates":[0,0]}}}',
                'has feature shard 2'
            );
            t.end();
        }
    );
});

tape('getFeatureByCover', t => {
    feature.getFeatureByCover(
        conf.source,
        { id: 1, x: 32, y: 32 },
        (err, data) => {
            t.equal(data.id, 1);
            t.end();
        }
    );
});

tape('getFeatureByCover', t => {
    feature.getFeatureByCover(
        conf.source,
        { id: 1, x: 33, y: 32 },
        (err, data) => {
            t.equal(data.id, 1048577);
            t.end();
        }
    );
});

tape('getFeatureByCover, collision', t => {
    feature.getFeatureByCover(
        conf.source,
        { id: 187838, x: 32, y: 32, score: 2000, text: 'Mr Hyde' },
        (err, data) => {
            t.equal(data.id, 6832527855771070);
            t.end();
        }
    );
});

tape('getFeatureById', t => {
    feature.getFeatureById(conf.source, 1, (err, data) => {
        t.equal(data.id, 1);
        t.end();
    });
});
