var fs = require('fs');
var Benchmark = require('benchmark');
var suite = new Benchmark.Suite();
var context = require('../lib/context');

var stats = {
    max_rss: 0,
    max_heap: 0
};

var memusg = function() {
    var mem = process.memoryUsage();
    if (mem.rss > stats.max_rss) stats.max_rss = mem.rss;
    if (mem.heapUsed > stats.max_heap) stats.max_heap = mem.heapUsed;
};

var memcheck = setInterval(memusg, 500);

var source = {
    getTile: function(z, x, y, callback) {
        return callback(
            null,
            fs.readFileSync(__dirname + '/fixtures/0.0.0.vector.pbfz'),
            {
                'content-type': 'application/x-protobuf',
                'content-encoding': 'gzip'
            }
        );
    },
    geocoder_layer: 'data',
    maxzoom: 0,
    minzoom: 0,
    name: 'test',
    id: 'testA',
    idx: 1
};

suite
    .add('context vector', {
        defer: true,
        fn: function(deferred) {
            context.contextVector(
                source,
                -97.4707,
                39.4362,
                false,
                {},
                null,
                false,
                false,
                function(err, data) {
                    deferred.resolve();
                }
            );
        }
    })
    .on('cycle', function(event) {
        console.log(String(event.target));
        console.log(
            'Memory -> peak rss: ' +
                stats.max_rss +
                ' / peak heap: ' +
                stats.max_heap
        );
        clearInterval(memcheck);
    })
    .run();
