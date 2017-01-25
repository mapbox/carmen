var suite = new require('benchmark').Suite();

var Carmen = require('..');
var index = require('../lib/index');
var phrasematch = require('../lib/phrasematch');
var mem = require('../lib/api-mem');

var conf = { street: new mem({ maxzoom:14, geocoder_shardlevel:2 }, function() {}) };
var c = new Carmen(conf);

module.exports = setup;

function setup(cb) {
    if (!cb) cb = function(){};
    console.log('# phrasematch');

    var start = +new Date;
    // streetnames with "Lake" from TIGER
    var seq = 1;
    var docs = require('fs').readFileSync(__dirname + '/fixtures/lake-streetnames.txt', 'utf8')
        .split('\n')
        .filter(function(text) { return !!text; })
        .slice(0,50)
        .reduce(function(memo, text) {
            // generate between 1-100 features with this text.
            var seed = 2000;
            for (var i = 0; i < seed; i++) {
                var lat = Math.random() * 170 - 85;
                var lon = Math.random() * 360 - 180;
                memo.push({
                    id: ++seq,
                    type: 'Feature',
                    properties: {
                        'carmen:text': text,
                        'carmen:center': [lon, lat]
                    },
                    geometry: { type:'Point', coordinates:[lon,lat] },
                    bbox: []
                });
            }
            return memo;
        }, []);
    index.update(conf.street, docs, { zoom: 14 }, function(err) {
        if (err) throw err;
        index.store(conf.street, function(err) {
            if (err) throw err;
            console.log('setup time ' + (+new Date - start) + 'ms');
            runphrasematch(cb);
        });
    });
}

function runphrasematch(cb) {
    suite.add('phrasematch', {
        'defer': true,
        'fn': function(deferred) {
                phrasematch(conf.street, 'Westside Lake Rd', {}, function(err, result) {
                if (!result.length) {
                    throw new Error();
                } else {
                    deferred.resolve();
                }
            });
        }
    })
    .on('complete', function(event) {
        console.log(String(event.target), '\n');
        cb(null, suite);
    })
    .run({'async': true});
}

if (!process.env.runSuite) setup();
