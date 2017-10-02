const Carmen = require('..');
const index = require('../lib/index');
const mem = require('../lib/api-mem');
const tape = require('tape');

// Creates an index with fuzzed data
function fuzzIndex(limit, callback) {
    const conf = { street: new mem({ maxzoom: 14 }, () => {}) };
    const c = new Carmen(conf);
    const docs = require('fs')
        .readFileSync(
            __dirname + '/../bench/fixtures/lake-streetnames.txt',
            'utf8'
        )
        .split('\n')
        .filter(text => {
            return !!text;
        })
        .sort((a, b) => {
            return Math.random() - Math.random();
        });
    let features = [];
    for (let i = 0; i < limit; i++) {
        let text = docs[i % docs.length];
        let lat = Math.random() * 85 * (Math.random() < 0.5 ? -1 : 1);
        let lon = Math.random() * 180 * (Math.random() < 0.5 ? -1 : 1);
        features.push({
            id: Math.floor(Math.random() * Math.pow(2, 25)),
            type: 'Feature',
            properties: {
                'carmen:text': text,
                'carmen:center': [lon, lat]
            },
            geometry: { type: 'Point', coordinates: [lon, lat] }
        });
    }
    index.update(conf.street, features, { zoom: 14 }, err => {
        if (err) return callback(err);
        index.store(conf.street, err => {
            if (err) return callback(err);
            callback(null, c, conf.street);
        });
    });
}

let sources = {};

tape('setup a', t => {
    let start = +new Date();
    fuzzIndex(50000, (err, geocoder, a) => {
        let time = +new Date() - start;
        t.ifError(err, 'completed indexing a in ' + time + 'ms');
        sources.a = a;
        t.end();
    });
});

tape('setup b', t => {
    let start = +new Date();
    fuzzIndex(50000, (err, geocoder, b) => {
        let time = +new Date() - start;
        t.ifError(err, 'completed indexing b in ' + time + 'ms');
        sources.b = b;
        t.end();
    });
});

tape('merge a + b = c', t => {
    const conf = { street: new mem({ maxzoom: 14 }, () => {}) };
    const c = new Carmen(conf);
    c.merge(sources.a, sources.b, conf.street, {}, (err, stats) => {
        t.ifError(err);
        t.ok(stats.freq, 'merged freq in ' + stats.freq + 'ms');
        t.ok(stats.grid, 'merged grid in ' + stats.grid + 'ms');
        t.ok(stats.feature, 'merged feature in ' + stats.feature + 'ms');
        t.ok(stats.stat, 'merged stat in ' + stats.stat + 'ms');
        t.end();
    });
});
