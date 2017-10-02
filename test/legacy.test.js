const tape = require('tape');
const Carmen = require('..');
const mem = require('../lib/api-mem');

tape('legacy version (pre-v1 => ok)', t => {
    const c = new Carmen({
        test: new mem({ maxzoom: 6, geocoder_version: null }, () => {})
    });
    c.geocode('test', {}, (err, res) => {
        t.ifError(err);
        t.equal(res.features.length, 0);
        t.end();
    });
});

tape('legacy version (v1 => error)', t => {
    const c = new Carmen({
        test: new mem({ maxzoom: 6, geocoder_version: 1 }, () => {})
    });
    c.geocode('test', {}, (err, res) => {
        t.ok(err);
        t.deepEqual(
            err.toString(),
            'Error: geocoder version is not 8, index: test'
        );
        t.end();
    });
});

tape('current version (v2 => error)', t => {
    const c = new Carmen({
        test: new mem({ maxzoom: 6, geocoder_version: 2 }, () => {})
    });
    c.geocode('test', {}, (err, res) => {
        t.ok(err);
        t.deepEqual(
            err.toString(),
            'Error: geocoder version is not 8, index: test'
        );
        t.end();
    });
});

tape('current version (v3 => error)', t => {
    const c = new Carmen({
        test: new mem({ maxzoom: 6, geocoder_version: 3 }, () => {})
    });
    c.geocode('test', {}, (err, res) => {
        t.ok(err);
        t.deepEqual(
            err.toString(),
            'Error: geocoder version is not 8, index: test'
        );
        t.end();
    });
});

tape('current version (v4 => error)', t => {
    const c = new Carmen({
        test: new mem({ maxzoom: 6, geocoder_version: 4 }, () => {})
    });
    c.geocode('test', {}, (err, res) => {
        t.ok(err);
        t.deepEqual(
            err.toString(),
            'Error: geocoder version is not 8, index: test'
        );
        t.end();
    });
});

tape('current version (v5 => error)', t => {
    const c = new Carmen({
        test: new mem({ maxzoom: 6, geocoder_version: 5 }, () => {})
    });
    c.geocode('test', {}, (err, res) => {
        t.ok(err);
        t.deepEqual(
            err.toString(),
            'Error: geocoder version is not 8, index: test'
        );
        t.end();
    });
});

tape('current version (v6 => error)', t => {
    const c = new Carmen({
        test: new mem({ maxzoom: 6, geocoder_version: 6 }, () => {})
    });
    c.geocode('test', {}, (err, res) => {
        t.ok(err);
        t.deepEqual(
            err.toString(),
            'Error: geocoder version is not 8, index: test'
        );
        t.end();
    });
});

tape('current version (v6 => error)', t => {
    const c = new Carmen({
        test: new mem({ maxzoom: 6, geocoder_version: 7 }, () => {})
    });
    c.geocode('test', {}, (err, res) => {
        t.ok(err);
        t.deepEqual(
            err.toString(),
            'Error: geocoder version is not 8, index: test'
        );
        t.end();
    });
});
