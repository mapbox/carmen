var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var token = require('../lib/util/token');
var tokens = require('./fixtures/tokens.json');

module.exports = benchmark;

function benchmark(cb) {
    if (!cb) cb = function(){};
    console.log('# token.replaceTokenGroups');

    suite.add('token replace - no group replacement', function() {
        var replacers = token.createReplacer({
            "\\d+": "###"
        });
        var res = token.replaceToken(replacers, 'abc ' + Math.round(Math.random() * 1000) + ' def');
    })
    suite.add('token replace - numbered groups', function() {
        var replacers = token.createReplacer({
            "(\\d+)": "#$1#"
        });
        var res = token.replaceToken(replacers, 'abc ' + Math.round(Math.random() * 1000) + ' def');
    })
    .add('token replace - named groups', function() {
        var replacers = token.createReplacer({
            "(?<num>\\d+)": "#${num}#"
        });
        var res = token.replaceToken(replacers, 'abc ' + Math.round(Math.random() * 1000) + ' def');
    })
    .on('cycle', function(event) {
        console.log(String(event.target));
    })
    .on('complete', function() {
      console.log('Fastest is ' + this.filter('fastest').map('name'), '\n');
      cb(null, suite);
    })
    .run();
}

if (!process.env.runSuite) benchmark();
