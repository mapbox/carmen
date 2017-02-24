var tape = require('tape');
var Carmen = require('..');
var mem = require('../lib/api-mem');

tape('legacy version (pre-v1 => ok)', function(assert) {
    var c = new Carmen({
        test: new mem({ maxzoom:6, geocoder_version:null }, function() {})
    });
    c.geocode('test', {}, function(err, res) {
        assert.ifError(err);
        assert.equal(res.features.length, 0);
        assert.end();
    });
});


tape('legacy version (v1 => error)', function(assert) {
    var c = new Carmen({
        test: new mem({ maxzoom:6, geocoder_version:1 }, function() {})
    });
    c.geocode('test', {}, function(err, res) {
        assert.ok(err);
        assert.deepEqual(err.toString(), 'Error: geocoder version is not 7, index: test');
        assert.end();
    });
});

tape('current version (v2 => error)', function(assert) {
    var c = new Carmen({
        test: new mem({ maxzoom:6, geocoder_version:2 }, function() {})
    });
    c.geocode('test', {}, function(err, res) {
        assert.ok(err);
        assert.deepEqual(err.toString(), 'Error: geocoder version is not 7, index: test');
        assert.end();
    });
});

tape('current version (v3 => error)', function(assert) {
    var c = new Carmen({
        test: new mem({ maxzoom:6, geocoder_version:3 }, function() {})
    });
    c.geocode('test', {}, function(err, res) {
        assert.ok(err);
        assert.deepEqual(err.toString(), 'Error: geocoder version is not 7, index: test');
        assert.end();
    });
});

tape('current version (v4 => error)', function(assert) {
    var c = new Carmen({
        test: new mem({ maxzoom:6, geocoder_version:4 }, function() {})
    });
    c.geocode('test', {}, function(err, res) {
        assert.ok(err);
        assert.deepEqual(err.toString(), 'Error: geocoder version is not 7, index: test');
        assert.end();
    });
});

tape('current version (v5 => error)', function(assert) {
    var c = new Carmen({
        test: new mem({ maxzoom:6, geocoder_version:5 }, function() {})
    });
    c.geocode('test', {}, function(err, res) {
        assert.ok(err);
        assert.deepEqual(err.toString(), 'Error: geocoder version is not 7, index: test');
        assert.end();
    });
});

tape('current version (v6 => error)', function(assert) {
    var c = new Carmen({
        test: new mem({ maxzoom:6, geocoder_version:6 }, function() {})
    });
    c.geocode('test', {}, function(err, res) {
        assert.ok(err);
        assert.deepEqual(err.toString(), 'Error: geocoder version is not 7, index: test');
        assert.end();
    });
});

