const tape = require('tape');
const zlib = require('zlib');
const DawgCache = require('../lib/util/dawg');

tape('create', t => {
    const dict = new DawgCache();
    t.ok(dict, 'dawg created');
    t.end();
});

tape('dump/load', t => {
    const dict = new DawgCache();
    dict.setText('a1');
    dict.setText('a2');
    dict.setText('a3');
    dict.setText('a4');

    zlib.gzip(dict.dump(), (err, zdata) => {
        t.ifError(err);
        t.ok(zdata.length < 200e3, 'gzipped dictcache < 200k');
        zlib.gunzip(zdata, (err, data) => {
            t.ifError(err);
            let loaded = new DawgCache(data);
            for (let i = 1; i <= 4; i++) {
                t.equal(loaded.hasPhrase('a' + i, false), true, 'has a' + i);
            }
            t.equal(loaded.hasPhrase('a5', false), false, 'not a5');

            t.equal(loaded.hasPhrase('a', false), false, 'not a');
            t.equal(loaded.hasPhrase('a', true), true, 'has a as degen');

            t.end();
        });
    });
});

tape('invalid data', t => {
    const dict = new DawgCache();
    t.throws(() => {
        dict.setText('');
    });
    t.end();
});
