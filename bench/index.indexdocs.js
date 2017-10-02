const Benchmark = require('benchmark');
const suite = new Benchmark.Suite();
const assert = require('assert');
const indexdocs = require('../lib/indexer/indexdocs');
const docs = require('../test/fixtures/mem-docs.json');
const pointDoc = require('./fixtures/point-doc.json');
const Carmen = require('..');
const context = require('../lib/context');
const mem = require('../lib/api-mem');
const geocoder = new Carmen({
    source: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
});
const options = { zoom: 6 };
const pointDocs = [];
const geocoder_tokens = require('./fixtures/geocoder-tokens.json');

for (var i = 0; i < 500; i++) {
    pointDocs.push(pointDoc);
}

module.exports = benchmark;

function benchmark(cb) {
    if (!cb) cb = function() {};
    console.log('# indexdocs');

    suite.on('complete', function(event) {
        suite.forEach(function(e) {
            console.log(
                e.name +
                    ' x ' +
                    e.hz.toFixed(2) +
                    ' /sec' +
                    ' (' +
                    e.stats.sample.length +
                    ' runs sampled)'
            );
        });
        console.log();
        cb(null, suite);
    });

    // if a custom geojson file is passed, use it instead
    if (process.argv[2]) {
        const fs = require('fs');
        const filepath = process.argv[2];
        const customDocs = fs
            .readFileSync(filepath, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map(JSON.parse);
        const geocoder = new Carmen({
            source: new mem(
                {
                    maxzoom: 6,
                    geocoder_address: 1,
                    geocoder_tokens: geocoder_tokens
                },
                () => {}
            )
        });
        const options = { zoom: 14 };
        suite.add(`index ${filepath}`, {
            defer: true,
            fn: function(deferred) {
                indexdocs(
                    customDocs,
                    geocoder.indexes.source,
                    options,
                    function(err, res) {
                        if (err) throw err;
                        deferred.resolve();
                    }
                );
            }
        });
        suite.run({ async: true });
        return;
    }

    suite.add('index many', {
        defer: true,
        fn: function(deferred) {
            indexdocs(docs, geocoder.indexes.source, options, function(
                err,
                res
            ) {
                if (err) throw err;
                deferred.resolve();
            });
        }
    });
    suite.add('index large polygon', {
        defer: true,
        fn: function(deferred) {
            indexdocs([docs[4]], geocoder.indexes.source, options, function(
                err,
                res
            ) {
                if (err) throw err;
                deferred.resolve();
            });
        }
    });
    suite.add('index small polygon', {
        defer: true,
        fn: function(deferred) {
            indexdocs([docs[16]], geocoder.indexes.source, options, function(
                err,
                res
            ) {
                if (err) throw err;
                deferred.resolve();
            });
        }
    });
    suite.add('index point doc', {
        defer: true,
        fn: function(deferred) {
            indexdocs([pointDoc], geocoder.indexes.source, options, function(
                err,
                res
            ) {
                if (err) throw err;
                deferred.resolve();
            });
        }
    });
    suite.add('index many point docs', {
        defer: true,
        fn: function(deferred) {
            indexdocs(pointDocs, geocoder.indexes.source, options, function(
                err,
                res
            ) {
                if (err) throw err;
                deferred.resolve();
            });
        }
    });
    suite.run({ async: true });
}

if (!process.env.runSuite) benchmark();
