const tape = require('tape');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const queue = require('d3-queue').queue;
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

const conf = {
    country: new mem(null, () => {}),
    region: new mem(null, () => {}),
    district: new mem(null, () => {}),
    place: new mem(null, () => {}),
    address: new mem(
        {
            maxzoom: 6,
            geocoder_address: 1
        },
        () => {}
    )
};
const c = new Carmen(conf);

tape('index country', t => {
    let country = {
        id: 1,
        properties: {
            'carmen:text': 'Japan',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.country, country, t.end);
});

tape('index region', t => {
    let region = {
        id: 1,
        properties: {
            'carmen:text': '東京都',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.region, region, t.end);
});

tape('index place 1', t => {
    let place = {
        id: 1,
        properties: {
            'carmen:text': '羽村市',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0]
        }
    };
    queueFeature(conf.place, place, t.end);
});

tape('index address 1', t => {
    let address = {
        id: 1,
        properties: {
            'carmen:text': '神明台三丁目',
            'carmen:zxy': ['6/32/32'],
            'carmen:center': [0, 0],
            'carmen:addressnumber': ['3', '5']
        },
        geometry: {
            type: 'MultiPoint',
            coordinates: [[0, 0], [0, 0]]
        }
    };
    queueFeature(conf.address, address, t.end);
});
tape('build queued features', t => {
    const q = queue();
    Object.keys(conf).forEach(c => {
        q.defer(cb => {
            buildQueued(conf[c], cb);
        });
    });
    q.awaitAll(t.end);
});

tape('Check numeric text', t => {
    c.geocode('神明台三丁目5', { debug: true }, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 1, '1 feature');
        t.equal(res.features[0].address, '5', 'right address');
        t.end();
    });
});

tape('Check numeric text', t => {
    c.geocode('神明台三丁目 5', null, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 1, '1 feature');
        t.equal(res.features[0].address, '5', 'right address');
        t.end();
    });
});

tape('teardown', t => {
    context.getTile.cache.reset();
    t.end();
});
