var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var termops = require('../lib/util/termops');

module.exports = benchmark;

var inputs = [
    ['2##', 'main'],
    ['###', 'main'],
    ['main', 'st'],
    ['main'],
    ['###'],
    ['20009']
];

function oldGetPhraseDegens(tokens) {
    var text = typeof tokens === 'string' ? tokens : tokens.join(' ');
    var length = text.length + 1;
    var degens = [];
    var leadsWithNumToken = /#/.test(text.split(' ')[0]);

    // Iterate through subsets of each term to generate degens.
    for (var i = 1; !i || (i < length && length - i > 0); i++) {
        var degen = text.substr(0, i);
        if (degen.charAt(degen.length - 1) === ' ') continue;
        if (leadsWithNumToken && degen.indexOf(' ') === -1) continue;
        degens.push(degen);
    }

    return degens;
}

function benchmark(cb) {
    if (!cb) cb = function() {};
    console.log('# token.replaceToken');

    suite
        .add('old getPhraseDegens', function() {
            var outputs = inputs.map(function(input) {
                return oldGetPhraseDegens(input);
            });
        })
        .add('getPhraseDegens', function() {
            var outputs = inputs.map(function(input) {
                return termops.getPhraseDegens(input);
            });
        })
        .on('cycle', function(event) {
            console.log(String(event.target));
        })
        .on('complete', function() {
            console.log(
                'Fastest is ' + this.filter('fastest').map('name'),
                '\n'
            );
            cb(null, suite);
        })
        .run();
}

if (!process.env.runSuite) benchmark();
