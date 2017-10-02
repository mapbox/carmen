var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var assert = require('assert');
var termops = require('../lib/util/termops');

module.exports = benchmark;

function benchmark(cb) {
    if (!cb) cb = function() {};
    console.log('# tokenize');

    suite.add('tokenize', function() {
        assert.deepEqual(termops.tokenize('Chamonix-Mont-Blanc'), [
            'chamonix',
            'mont',
            'blanc'
        ]);
    });
    suite
        .add('tokenize - cjk', function() {
            assert.deepEqual(termops.tokenize('北京市'), ['北', '京', '市']);
        })
        .on('cycle', function(event) {
            console.log(String(event.target));
        })
        .on('complete', function() {
            console.log();
            cb(null, suite);
        })
        .run();
}

if (!process.env.runSuite) benchmark();
