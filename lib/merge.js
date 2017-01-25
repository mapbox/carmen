var stream = require('stream');
var queue = require('d3-queue').queue,
    extend = require('util')._extend,
    dawgCache = require('dawg-cache'),
    fork = require('child_process').fork,
    fs = require('fs');

module.exports = merge;
module.exports.multimerge = multimerge;
module.exports.getOutputConf = getOutputConf;

var pairwiseGeocoderIterator = function(from1, from2, type) {
    var readStream = new stream.Readable({objectMode:true});
    var iterators = [from1.geocoderDataIterator(type), from2.geocoderDataIterator(type)]

    var nexts = [null, null]

    var fetchq = queue();
    var nextq = queue(1);

    var advance = function(num) {
        fetchq.defer(function(cb) { iterators[num].asyncNext(function(err, row) {
            nexts[num] = row;
            cb(err);
        })});
    }
    advance(0);
    advance(1);

    readStream._read = function() {
        nextq.defer(function(cb) {
            fetchq.awaitAll(function(err) {
                if (err) readStream.emit('error', err);

                // reset the fetch queue so we can call await on it again
                fetchq = queue();
                var out;
                if (nexts[0].done && nexts[1].done) {
                    // both sides are done
                    readStream.push(null);
                } else if (!nexts[0].done && (nexts[1].done || nexts[0].value.shard < nexts[1].value.shard)) {
                    // return and advance next[0]
                    out = nexts[0];
                    advance(0);
                    readStream.push({ shard: out.value.shard, data1: out.value.data, data2: undefined });
                } else if (!nexts[1].done && (nexts[0].done || nexts[1].value.shard < nexts[0].value.shard)) {
                    // return and advance next[1]
                    out = nexts[1];
                    advance(1);
                    readStream.push({ shard: out.value.shard, data2: out.value.data, data1: undefined });
                } else if (nexts[0].value.shard == nexts[1].value.shard) {
                    // return and advance both
                    var out1 = nexts[0], out2 = nexts[1];
                    advance(0);
                    advance(1);
                    readStream.push({ shard: out1.value.shard, data1: out1.value.data, data2: out2.value.data });
                } else {
                    readStream.emit(new Error("merge error"));
                }

                cb();
            });
        });
    };

    return readStream;
}

var mergeType = function(from1, from2, to, type, mergeOp, completeCallback) {
    var pairStream = pairwiseGeocoderIterator(from1, from2, type);
    var mergeQueue = queue();
    var mergeStream = new stream.Transform({objectMode:true});
    mergeStream.pending = 0;
    mergeStream._transform = function(row, enc, callback) {
        if (mergeStream.pending > 1000) {
            return setImmediate(mergeStream._transform.bind(mergeStream), row, enc, callback);
        }
        mergeStream.pending++;
        mergeQueue.defer(function(shard, data1, data2, qcallback) {
            if (data1 !== undefined && data2 !== undefined) {
                mergeOp(shard, data1, data2, function(err, data3) {
                    // this is where errors come back from carmen-cache
                    if (err) { throw err; }
                    to.putGeocoderData(type, shard, data3, function(err) {
                        if (err) mergeStream.emit('error', err);
                        mergeStream.pending--;
                        qcallback(err);
                    });
                });
            } else {
                to.putGeocoderData(type, shard, data1 || data2, function(err) {
                    if (err) mergeStream.emit('error', err);
                    mergeStream.pending--;
                    qcallback(err);
                });
            }
        }, row.shard, row.data1, row.data2);
        callback();
    };
    mergeStream._flush = function(callback) {
        mergeQueue.awaitAll(callback);
    };

    pairStream.pipe(mergeStream).pipe(new stream.PassThrough());
    pairStream.on('error', done)
    mergeStream.on('end', done);
    mergeStream.on('error', done);

    function done(err) {
        if (err) throw err;
        completeCallback && completeCallback(err);
        completeCallback = false;
    }
}

function merge(geocoder, from1, from2, to, options, callback) {
    var q = queue(1);
    var stats = {
        freq: 0,
        grid: 0,
        feature: 0,
        stat: 0
    };

    // merge freq
    q.defer(function(cb) {
        var start = +(new Date());
        mergeType(from1, from2, to, "freq", function(shard, data1, data2, callback) {
            from1._geocoder.merge(data1, data2, 'freq', callback);
        }, function() {
            stats.freq = +(new Date()) - start;
            to._commit ? to._commit(cb) : cb();
        });
    });

    // merge grid
    q.defer(function(cb) {
        var start = +(new Date());
        mergeType(from1, from2, to, "grid", function(shard, data1, data2, callback) {
            from1._geocoder.merge(data1, data2, 'grid', callback);
        }, function() {
            stats.grid = +(new Date()) - start;
            to._commit ? to._commit(cb) : cb();
        });
    });

    // merge features
    q.defer(function(cb) {
        var start = +(new Date());
        mergeType(from1, from2, to, "feature", function(shard, data1, data2, callback) {
            data1 = data1.toString();
            data2 = data2.toString();
            callback(null, data1.substr(0, data1.length-1) + ',' + data2.substr(1));
        }, function() {
            stats.feature = +(new Date()) - start;
            to._commit ? to._commit(cb) : cb();
        });
    });

    // merge dawg
    q.defer(function(cb) {
        var start = +(new Date());

        var dawg1 = from1._dictcache,
            dawg2 = from2._dictcache;

        var mergedDawg = new dawgCache.Dawg();

        var iterator1 = dawg1.iterator(),
            iterator2 = dawg2.iterator();

        var next1 = iterator1.next(),
            next2 = iterator2.next();

        var remainingNext, remainingIterator;

        while (true) {
            if (next1.done) {
                remainingNext = next2;
                remainingIterator = iterator2;
                break;
            }
            if (next2.done) {
                remainingNext = next1;
                remainingIterator = iterator1;
                break;
            }
            if (next1.value < next2.value) {
                mergedDawg.insert(next1.value);
                next1 = iterator1.next();
            } else if (next1.value > next2.value) {
                mergedDawg.insert(next2.value);
                next2 = iterator2.next();
            } else if (next1.value == next2.value) {
                // pull both but only add once
                mergedDawg.insert(next1.value);
                next1 = iterator1.next();
                next2 = iterator2.next();
            } else {
                throw new Error("DAWG value comparison error");
            }
        }

        // one structure is done, so flush the remaining input structure
        while (!remainingNext.done) {
            mergedDawg.insert(remainingNext.value);
            remainingNext = remainingIterator.next();
        }

        // we're done; finalize and collapse
        mergedDawg.finish();
        to.putGeocoderData("stat", 0, mergedDawg.toCompactDawgBuffer(), function() {
            stats.stat = +(new Date()) - start;
            to._commit ? to._commit(cb) : cb();
        });
    });

    q.awaitAll(function(err) {
        if (err) return callback(err);
        to.stopWriting(function(err) {
            if (err) return callback(err);
            return callback(null, stats);
        });
    });
}

function getOutputConf(filename, options, callback) {
    var Carmen = require('../index.js');

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
            outputConf.to.stopWriting(function() {
                callback(outputConf);
            });
        }
    });
    return tmp;
}

var _randomChars = function(length) {
    var s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    return Array.apply(null, {length: length}).map(function() { return s.charAt(Math.floor(Math.random() * s.length)); }).join('');
}

function multimerge(fromFiles, toFile, options, callback) {
    var toMerge = [], inProgress = 0;
    fromFiles.forEach(function(fromFile) { toMerge.push(fromFile); });

    var tmpDir = '/tmp/mrg.' + _randomChars(9),
        tmpCounter = 0;
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir);
    }

    var q = queue(4);
    var queueJobs = function() {
        while (toMerge.length >= 2) {
            var from1File = toMerge.shift(),
                from2File = toMerge.shift();
            inProgress += 2;

            var enqueueTask = function(from1File, from2File, mergeToFile, isFinal) {
                q.defer(function(from1File, from2File, mergeToFile, cb) {
                    var worker = fork(__dirname + '/merge-worker.js');
                    worker.send({from1File: from1File, from2File: from2File, mergeToFile: mergeToFile, options: options});
                    worker.on('exit', function exit(code) {
                        if (code == 0) {
                            inProgress -= 2;

                            if (isFinal) {
                                // we're done
                                // clean up intermediate products

                                fs.readdir(tmpDir, function(err, files) {
                                    var deleteQ = queue();
                                    for (var i = 0; i < files.length; i++) deleteQ.defer(function(file, cb) {
                                        fs.unlink(tmpDir + '/' + file, cb);
                                    }, files[i]);
                                    deleteQ.awaitAll(function() {
                                        fs.rmdir(tmpDir, function() {
                                            // done with clean up; call callback
                                            console.log('Merge worker cleanup complete');
                                            callback();
                                        });
                                    });
                                });
                            } else {
                                toMerge.push(mergeToFile);
                                queueJobs();
                            }
                            return cb();
                        }
                        console.warn('Merge worker exited with ' + code);
                        process.exit(code ? code : 1);
                    });
                }, from1File, from2File, mergeToFile);
            }

            if (inProgress == 2 && toMerge.length == 0) {
                // nobody else is working on anything and we've grabbed the last
                // two things to merge, so merge into the final output
                enqueueTask(from1File, from2File, toFile, true);
            } else {
                // we need a temporary thing to merge into
                // (wrap in an iffe to preserve the current from1 and from2)
                (function(from1File, from2File) {
                    var filename = tmpDir + '/merge-' + ("0000" + tmpCounter).substr(-4,4) + '.mbtiles';
                    tmpCounter += 1;
                    enqueueTask(from1File, from2File, filename, false);
                })(from1File, from2File);
            }

        }
    }
    queueJobs();
}
