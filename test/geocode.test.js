var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');

describe('geocode', function() {
    var geocoder = new Carmen({
        country: Carmen.auto(__dirname + '/fixtures/01-ne.country.s3'),
        province: Carmen.auto(__dirname + '/fixtures/02-ne.province.s3')
    });
    before(function(done) {
        geocoder._open(done);
    });
    it ('forward', function(done) {
        geocoder.geocode('georgia', {}, function(err, res) {
            assert.ifError(err);
            // fs.writeFileSync(__dirname + '/fixtures/geocode-forward.json', JSON.stringify(res, null, 4));
            assert.deepEqual(require(__dirname + '/fixtures/geocode-forward.json'), res);
            done();
        });
    });
    it ('threshold', function(done) {
        geocoder.geocode('congo', {}, function(err, res) {
            assert.ifError(err);
            assert.equal(1, res.features.length);
            done();
        });
    });
    it ('threshold higher', function(done) {
        geocoder.geocode('congo', { phrasematch: 0.9 }, function(err, res) {
            assert.ifError(err);
            assert.equal(0, res.features.length);
            done();
        });
    });
    it ('reverse', function(done) {
        geocoder.geocode('0, 40', {}, function(err, res) {
            assert.ifError(err);
            // fs.writeFileSync(__dirname + '/fixtures/geocode-reverse.json', JSON.stringify(res, null, 4));
            assert.deepEqual(require(__dirname + '/fixtures/geocode-reverse.json'), res);
            done();
        });
    });
    it ('noresults', function(done) {
        geocoder.geocode('asdfasdf', {}, function(err, res) {
            assert.ifError(err);
            // fs.writeFileSync(__dirname + '/fixtures/geocode-noresults.json', JSON.stringify(res, null, 4));
            assert.deepEqual(require(__dirname + '/fixtures/geocode-noresults.json'), res);
            done();
        });
    });
});
