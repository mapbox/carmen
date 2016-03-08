var mp32 = Math.pow(2,32);
var termops = require('./util/termops'),
    token = require('./util/token'),
    feature = require('./util/feature'),
    uniq = require('./util/uniq'),
    ops = require('./util/ops'),
    queue = require('queue-async'),
    indexdocs = require('./indexer/indexdocs'),
    split = require('split'),
    crypto = require('crypto'),
    extend = require('util')._extend,
    TIMER = process.env.TIMER;

module.exports = merge;
module.exports.multimerge = multimerge;

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
            to.putGeocoderData(type, shard, data, cb);
        })
    }, function() { q.awaitAll(completeCallback); });
}

function merge(geocoder, from1, from2, to, options, callback) {
    var q = queue(1);

    // merge freq
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
        }, function() { to._commit ? to._commit(cb) : cb(); });
    });

    // merge grid
    q.defer(function(cb) {
        mergeType(from1, from2, to, "grid", function(shard, data1, data2) {
            // load one of the buffers into the destination cache, then append from the second onto it
            to._geocoder.loadSync(data1, "grid", shard);
            from2._geocoder.loadSync(data2, "grid", shard);

            from2._geocoder.list("grid", shard).forEach(function(id) {
                id = +id;
                var newData = from2._geocoder._get("grid", shard, id)
                to._geocoder.set('grid', id, newData, true);
            });

            return to._geocoder.pack("grid", shard);
        }, function() { to._commit ? to._commit(cb) : cb(); });
    });

    // merge features
    q.defer(function(cb) {
        mergeType(from1, from2, to, "feature", function(shard, data1, data2) {
            var current1 = JSON.parse(data1);
            var current2 = JSON.parse(data2);

            for (var i = 0; i < current2.length; i++) {
                current1[current2[i].id] = current2[i];
            }
            return JSON.stringify(current1);
        }, function() { to._commit ? to._commit(cb) : cb(); });
    });

    q.awaitAll(function() {
        to.stopWriting(callback);
    });
}

var getTmpCarmen = function(geocoder, options, callback) {
    var Carmen = require('../index.js');

    var filename = '/tmp/merge-' +
        crypto.randomBytes(4).readUInt32LE(0) + '' +
        crypto.randomBytes(4).readUInt32LE(0) + '.mbtiles';

    var tmp = Carmen.auto(filename, function() {
        var outputConf = {
            to: tmp
        };

        var outputConfig = extend({}, options);
        delete outputConfig.output;
        outputConf.to.startWriting(writeMeta);

        function writeMeta(err) {
            if (err) throw err;
            outputConf.to.putInfo(outputConfig, stopWriting);
        }

        function stopWriting(err) {
            if (err) throw err;
            outputConf.to.stopWriting(open);
        }

        function open(err) {
            if (err) throw err;
            var carmen = new Carmen(outputConf);
            outputConfig.output = process.stdout;

            carmen.on('open', function() {
                callback(outputConf.to);
            });
        }

    })
}

function multimerge(geocoder, froms, to, options, callback) {
    var toMerge = [], inProgress = 0;
    froms.forEach(function(from) { toMerge.push(from); });

    var q = queue(4);
    var queueJobs = function() {
        while (toMerge.length >= 2) {
            var from1 = toMerge.shift(),
                from2 = toMerge.shift();
            inProgress += 2;

            var enqueueTask = function(from1, from2, mergeTo) {
                q.defer(function(from1, from2, mergeTo, cb) {
                    console.log("queueing merge of " + from1._original.filename + " and " +
                        from2._original.filename + " into " + mergeTo._original.filename
                    );
                    merge(geocoder, from1, from2, mergeTo, options, function() {
                        console.log("completed merge of " + from1._original.filename + " and " +
                            from2._original.filename + " into " + mergeTo._original.filename
                        );
                        inProgress -= 2;

                        if (mergeTo == to) {
                            // we're done
                            callback();
                        } else {
                            toMerge.push(mergeTo);
                            queueJobs();
                        }
                        cb();
                    })
                }, from1, from2, mergeTo);
            }

            if (inProgress == 2 && toMerge.length == 0) {
                // nobody else is working on anything and we've grabbed the last
                // two things to merge, so merge into the final output
                enqueueTask(from1, from2, to);
            } else {
                // we need a temporary thing to merge into
                // (wrap in an iffe to preserve the current from1 and from2)
                (function(from1, from2) {
                    getTmpCarmen(geocoder, options, function(mergeTo) {
                        enqueueTask(from1, from2, mergeTo);
                    })
                })(from1, from2);
            }

        }
    }
    queueJobs();
}