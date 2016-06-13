var queue = require('d3-queue').queue;
var cache = require('./util/cxxcache');

module.exports = {};
module.exports.loadall = loadall;
module.exports.unloadall = unloadall;

function loadall(source, type, concurrency, callback) {
    var q = queue(Math.max(1, concurrency || 10));
    var limit = cache.shard(type, Math.pow(2,52)) || 1;

    for (var i = 0; i < limit; i++) q.defer(function(shard, callback) {
        source.getGeocoderData(type, shard, function(err, buffer) {
            if (err) return callback(err);
            if (!buffer) return callback();
            setTimeout(function() {
                if (type !== 'stat') {
                    source._geocoder.loadSync(buffer, type, shard);
                }
                callback();
            }, Math.ceil(1/concurrency));
        });
    }, i);

    q.awaitAll(callback);
}

function unloadall(source, type, callback) {
    source._geocoder.unloadall(type);
    callback();
}

