var mp32 = Math.pow(2,32);
var termops = require('./util/termops'),
    token = require('./util/token'),
    feature = require('./util/feature'),
    uniq = require('./util/uniq'),
    ops = require('./util/ops'),
    queue = require('queue-async'),
    indexdocs = require('./indexer/indexdocs'),
    split = require('split'),
    TIMER = process.env.TIMER;

module.exports = merge;

var pairwiseGDFE = function(from1, from2, type, callback, completeCallback) {
    var q = [[], []], done = [false, false];
    var mergeRows = function() {
        while (q[0].length && q[1].length) {
            if (q[0][0].shard < q[1][0].shard) {
                var data0 = q[0].shift();
                callback(data0.shard, data0.data, undefined);
            } else if (q[0][0].shard > q[1][0].shard) {
                var data1 = q[1].shift();
                callback(data1.shard, undefined, data1.data);
            } else if (q[0][0].shard == q[0][0].shard) {
                var data0 = q[0].shift(),
                    data1 = q[1].shift();
                callback(data0.shard, data0.data, data1.data);
            }
        }
    }
    var onRow = function(shard, data, myIdx) {
        var otherIdx = myIdx == 0 ? 1 : 0;
        q[myIdx].push({shard: shard, data: data});
        if (q[otherIdx].length) {
            mergeRows();
        }
    }

    var onComplete = function(myIdx) {
        var otherIdx = myIdx == 0 ? 1 : 0;
        done[myIdx] = true;
        if (done[otherIdx]) {
            mergeRows();
            // one or the other of the queues should be empty, but the other might not be
            var remaining = q[myIdx].length ? myIdx : otherIdx;
            while (q[remaining].length) {
                var data = q[remaining].shift();
                callback(data.shard, myIdx == 0 ? data.data : undefined, myIdx == 0 ? undefined : data.data);
            }
            if (completeCallback) {
                completeCallback();
            }
        }
    }

    from1.geocoderDataForEach(
        type,
        function(shard, data) { onRow(shard, data, 0); },
        function() { onComplete(0); }
    );
    from2.geocoderDataForEach(
        type,
        function(shard, data) { onRow(shard, data, 1); },
        function() { onComplete(1); }
    );
}

var mergeType = function(from1, from2, to, type, mergeOp, completeCallback) {
    var q = queue(0);
    pairwiseGDFE(from1, from2, type, function(shard, data1, data2) {
        var data;
        if (data1 === undefined) {
            data = data2;
        } else if (data2 === undefined) {
            data = data1;
        } else {
            data = mergeOp(shard, data1, data2);
        }
        q.defer(function(cb) {
            to.putGeocoderData(type, shard, data2, cb);
        })
    }, function() { q.awaitAll(completeCallback); });
}

function merge(geocoder, from1, from2, to, options, callback) {
    var q = queue(1);
    q.defer(function(cb) {
        mergeType(from1, from2, to, "freq", function(shard, data1, data2) {
            // load both of the buffers into their respective caches
            var combined = {};
            [from1, from2].forEach(function(from) {
                from._geocoder.loadSync(from == from1 ? data1 : data2, "freq", shard)
                from._geocoder.list("freq", shard).forEach(function(id) {
                    combined[id] = true;
                });
            });

            Object.keys(combined).forEach(function(id) {
                id = +id;
                if (id == 1) {
                    // 1 is a max score, so take the higher rather than summing
                    var total = Math.max((from1._geocoder._get("freq", shard, id) || [0])[0],
                        (from2._geocoder._get("freq", shard, id) || [0])[0]);
                } else {
                    var total = (from1._geocoder._get("freq", shard, id) || [0])[0] +
                        (from2._geocoder._get("freq", shard, id) || [0])[0];
                }
                to._geocoder._set("freq", shard, id, [total]);
            });

            return to._geocoder.pack("freq", shard);
        }, function() { setTimeout(function() { to._commit ? to._commit(cb) : cb(); }, 0) })
    })
    q.awaitAll(function() {
        to.stopWriting(callback);
    });
}