var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var unidecode = require('unidecode');
var token = require('../lib/util/token');
var tokens = require('./fixtures/tokens.json');

var replacers = token.createReplacer(tokens);

suite.add('token replace', function() {
    var res = token.replaceToken(replacers, 'kanye west');
})
.on('cycle', function(event) {
    console.log(String(event.target));
})
.run();
