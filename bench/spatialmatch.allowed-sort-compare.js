var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var assert = require('assert');
var spatialmatch = require('../lib/spatialmatch');
var stacks = require('./fixtures/stacks.json');
var options = require('./fixtures/options.json');
module.exports = benchmark;

function benchmark(cb) {
    if (!cb) cb = function(){};
    console.log('# sort vs allowed');

    suite.add('allowed first, type filter', function() {
        var stk = JSON.parse(JSON.stringify(stacks));
        var opt = JSON.parse(JSON.stringify(options));
        stk = spatialmatch.allowed(stk, opt);
        stk.forEach(function(stack) { stack.sort(spatialmatch.sortByZoomIdx); });
        stk.sort(spatialmatch.sortByRelevLengthIdx);
    })
    .add('allowed first, no type filter', function() {
        var stk = JSON.parse(JSON.stringify(stacks));
        var opt = JSON.parse(JSON.stringify(options));
        opt.allowed_idx = false;
        stk = spatialmatch.allowed(stk, opt);
        stk.forEach(function(stack) { stack.sort(spatialmatch.sortByZoomIdx); });
        stk.sort(spatialmatch.sortByRelevLengthIdx);
    })
    .add('sort first, type filter', function() {
        var stk = JSON.parse(JSON.stringify(stacks));
        var opt = JSON.parse(JSON.stringify(options));
        stk.forEach(function(stack) { stack.sort(spatialmatch.sortByZoomIdx); });
        stk.sort(spatialmatch.sortByRelevLengthIdx);
        stk = stk.slice(0, 100);
        stk = spatialmatch.allowed(stk, opt);
    })
    .add('sort first, no type filter', function() {
        var stk = JSON.parse(JSON.stringify(stacks));
        var opt = JSON.parse(JSON.stringify(options));
        opt.allowed_idx = false;
        stk.forEach(function(stack) { stack.sort(spatialmatch.sortByZoomIdx); });
        stk.sort(spatialmatch.sortByRelevLengthIdx);
        stk = stk.slice(0, 100);
        stk = spatialmatch.allowed(stk, opt);
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