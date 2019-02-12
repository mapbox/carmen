const suite = new require('benchmark').Suite();

const Carmen = require('..');
const index = require('../lib/indexer/index');
const phrasematch = require('../lib/geocoder/phrasematch');
const mem = require('../lib/sources/api-mem');
const { queueFeature, buildQueued } = require('../lib/indexer/addfeature');

const conf = { street: new mem({ maxzoom:14, geocoder_shardlevel:2 }, function() {}) };
const c = new Carmen(conf);

module.exports = setup;

function setup(cb) {
    if (!cb) cb = function(){};
    console.log('# phrasematch');

    const start = +new Date;
    // streetnames with "Lake" from TIGER
    let seq = 1;
    let docs = require('fs').readFileSync(__dirname + '/fixtures/lake-streetnames.txt', 'utf8')
        .split('\n')
        .filter(function(text) { return !!text; })
        .slice(0,50)
        .reduce(function(memo, text) {
            // generate between 1-100 features with this text.
            const seed = 2000;
            for (let i = 0; i < seed; i++) {
                const lat = Math.random() * 170 - 85;
                const lon = Math.random() * 360 - 180;
                memo.push({
                    id: ++seq,
                    type: 'Feature',
                    properties: {
                        'carmen:text': text,
                        'carmen:center': [lon, lat]
                    },
                    geometry: { type:'Point', coordinates:[lon,lat] }
                });
            }
            return memo;
        }, []);
    queueFeature(conf.street, docs, () => {
        buildQueued(conf.street, () => {
            runphrasematch(cb);
        });
    });
}

function runphrasematch(cb) {
    suite.add('phrasematch', {
        'defer': true,
        'fn': function(deferred) {
            phrasematch(conf.street, {
               tokens: ['Westside', 'Lake', 'Rd'],
               separators: [' ', ' ', ''],
               owner: [0, 1, 2]
            }, {}, function(err, result) {
                if (!result) throw new Error("Did not get result");
                deferred.resolve();
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
