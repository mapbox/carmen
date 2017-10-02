var stream = require('stream');
var queue = require('d3-queue').queue,
    extend = require('util')._extend,
    dawgCache = require('dawg-cache'),
    carmenDawg = require('./util/dawg'),
    cxxcache = require('./util/cxxcache'),
    fork = require('child_process').fork,
    fs = require('fs-extra'),
    iterTools = require('iter-tools');

module.exports = merge;
module.exports.multimerge = multimerge;
module.exports.getOutputConf = getOutputConf;

var _randomChars = function(length) {
    var s = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.apply(null, { length: length })
        .map(function() {
            return s.charAt(Math.floor(Math.random() * s.length));
        })
        .join('');
};

var getBaseFilenameOrTmp = function(source) {
    return source.getBaseFilename
        ? source.getBaseFilename()
        : '/tmp/tmp-idx.' + _randomChars(9);
};

var pairwiseGeocoderIterator = function(from1, from2, type) {
    var readStream = new stream.Readable({ objectMode: true });
    var iterators = [
        from1.geocoderDataIterator(type),
        from2.geocoderDataIterator(type)
    ];

    var nexts = [null, null];

    var fetchq = queue();
    var nextq = queue(1);

    var advance = function(num) {
        fetchq.defer(function(cb) {
            iterators[num].asyncNext(function(err, row) {
                nexts[num] = row;
                cb(err);
            });
        });
    };
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
                } else if (
                    !nexts[0].done &&
                    (nexts[1].done ||
                        nexts[0].value.shard < nexts[1].value.shard)
                ) {
                    // return and advance next[0]
                    out = nexts[0];
                    advance(0);
                    readStream.push({
                        shard: out.value.shard,
                        data1: out.value.data,
                        data2: undefined
                    });
                } else if (
                    !nexts[1].done &&
                    (nexts[0].done ||
                        nexts[1].value.shard < nexts[0].value.shard)
                ) {
                    // return and advance next[1]
                    out = nexts[1];
                    advance(1);
                    readStream.push({
                        shard: out.value.shard,
                        data2: out.value.data,
                        data1: undefined
                    });
                } else if (nexts[0].value.shard == nexts[1].value.shard) {
                    // return and advance both
                    var out1 = nexts[0],
                        out2 = nexts[1];
                    advance(0);
                    advance(1);
                    readStream.push({
                        shard: out1.value.shard,
                        data1: out1.value.data,
                        data2: out2.value.data
                    });
                } else {
                    readStream.emit(new Error('merge error'));
                }

                cb();
            });
        });
    };

    return readStream;
};

var mergeType = function(from1, from2, to, type, mergeOp, completeCallback) {
    var pairStream = pairwiseGeocoderIterator(from1, from2, type);
    var mergeQueue = queue();
    var mergeStream = new stream.Transform({ objectMode: true });
    mergeStream.pending = 0;
    mergeStream._transform = function(row, enc, callback) {
        if (mergeStream.pending > 1000) {
            return setImmediate(
                mergeStream._transform.bind(mergeStream),
                row,
                enc,
                callback
            );
        }
        mergeStream.pending++;
        mergeQueue.defer(
            function(shard, data1, data2, qcallback) {
                if (data1 !== undefined && data2 !== undefined) {
                    mergeOp(shard, data1, data2, function(err, data3) {
                        // this is where errors come back from carmen-cache
                        if (err) {
                            throw err;
                        }
                        to.putGeocoderData(type, shard, data3, function(err) {
                            if (err) mergeStream.emit('error', err);
                            mergeStream.pending--;
                            qcallback(err);
                        });
                    });
                } else {
                    to.putGeocoderData(type, shard, data1 || data2, function(
                        err
                    ) {
                        if (err) mergeStream.emit('error', err);
                        mergeStream.pending--;
                        qcallback(err);
                    });
                }
            },
            row.shard,
            row.data1,
            row.data2
        );
        callback();
    };
    mergeStream._flush = function(callback) {
        mergeQueue.awaitAll(callback);
    };

    pairStream.pipe(mergeStream).pipe(new stream.PassThrough());
    pairStream.on('error', done);
    mergeStream.on('end', done);
    mergeStream.on('error', done);

    function done(err) {
        if (err) throw err;
        completeCallback && completeCallback(err);
        completeCallback = false;
    }
};

function merge(geocoder, from1, from2, to, options, callback) {
    var q = queue(1);
    var stats = {
        freq: 0,
        grid: 0,
        feature: 0,
        stat: 0
    };

    // merge grid and freq
    var from1Base = getBaseFilenameOrTmp(from1);
    var from2Base = getBaseFilenameOrTmp(from2);
    var toBase = getBaseFilenameOrTmp(to);

    ['grid', 'freq'].forEach(function(type) {
        q.defer(function(cb) {
            var start = +new Date();

            // FIXME -- this litters grossness all over /tmp
            var rocks = {
                from1: from1Base + '.' + type + '.rocksdb',
                from2: from2Base + '.' + type + '.rocksdb',
                to: toBase + '.' + type + '.rocksdb'
            };

            if (!fs.existsSync(rocks.from1))
                from1._geocoder[type].pack(rocks.from1);
            if (!fs.existsSync(rocks.from2))
                from2._geocoder[type].pack(rocks.from2);
            cxxcache.RocksDBCache.merge(
                rocks.from1,
                rocks.from2,
                rocks.to,
                type,
                function() {
                    to._geocoder[type] = new cxxcache.RocksDBCache(
                        to._geocoder[type].id,
                        rocks.to
                    );
                    stats[type] = +new Date() - start;
                    cb();
                }
            );
        });
    });

    // merge features
    q.defer(function(cb) {
        var start = +new Date();
        mergeType(
            from1,
            from2,
            to,
            'feature',
            function(shard, data1, data2, callback) {
                data1 = data1.toString();
                data2 = data2.toString();
                callback(
                    null,
                    data1.substr(0, data1.length - 1) + ',' + data2.substr(1)
                );
            },
            function() {
                stats.feature = +new Date() - start;
                to._commit ? to._commit(cb) : cb();
            }
        );
    });

    // merge dawg
    q.defer(function(cb) {
        var start = +new Date();

        var use_normalization_cache =
            from1.use_normalization_cache ||
            (from1._info && from1._info.use_normalization_cache);

        var dawg1 = from1._dictcache,
            dawg2 = from2._dictcache;

        if (use_normalization_cache && dawg1.dumpWithNormalizations) {
            let file = toBase + '.tmp1.norm.rocksdb';
            let dump = dawg1.dumpWithNormalizations(file);
            dawg1 = new carmenDawg(dump);
            dawg1.loadNormalizationCache(file);

            file = toBase + '.tmp2.norm.rocksdb';
            dump = dawg2.dumpWithNormalizations(file);
            dawg2 = new carmenDawg(dump);
            dawg2.loadNormalizationCache(file);
        }

        // preload normalization maps
        var norm1 = new Map();
        var norm2 = new Map();

        var norm1Set = new Set();
        var norm2Set = new Set();

        var norm1ToMerged = new Map();
        var norm2ToMerged = new Map();
        var normInBoth = new Map();

        if (use_normalization_cache) {
            // preload normalization maps
            norm1 = new Map(dawg1.normalizationCache.getAll());
            norm2 = new Map(dawg2.normalizationCache.getAll());

            norm1Set = new Set([
                ...norm1.keys(),
                ...iterTools.flatMap(x => x, norm1.values())
            ]);
            norm2Set = new Set([
                ...norm2.keys(),
                ...iterTools.flatMap(x => x, norm2.values())
            ]);
        }

        var mergedDawg = new dawgCache.Dawg();

        var iterator1 = iterTools.enumerate(dawg1.iterator()),
            iterator2 = iterTools.enumerate(dawg2.iterator());

        var next1 = iterator1.next(),
            next2 = iterator2.next();

        var remainingNext,
            remainingIterator,
            remainingMembershipSet,
            remainingMergeMap;
        var mergedCount = 0;

        while (true) {
            if (next1.done) {
                remainingNext = next2;
                remainingIterator = iterator2;
                remainingMembershipSet = norm2Set;
                remainingMergeMap = norm2ToMerged;
                break;
            }
            if (next2.done) {
                remainingNext = next1;
                remainingIterator = iterator1;
                remainingMembershipSet = norm1Set;
                remainingMergeMap = norm1ToMerged;
                break;
            }
            if (next1.value[1] < next2.value[1]) {
                mergedDawg.insert(next1.value[1]);

                if (norm1Set.has(next1.value[0]))
                    norm1ToMerged.set(next1.value[0], mergedCount);
                mergedCount += 1;

                next1 = iterator1.next();
            } else if (next1.value[1] > next2.value[1]) {
                mergedDawg.insert(next2.value[1]);

                if (norm2Set.has(next2.value[0]))
                    norm2ToMerged.set(next2.value[0], mergedCount);
                mergedCount += 1;

                next2 = iterator2.next();
            } else if (next1.value[1] == next2.value[1]) {
                // pull both but only add once
                mergedDawg.insert(next1.value[1]);

                if (norm1Set.has(next1.value[0]))
                    norm1ToMerged.set(next1.value[0], mergedCount);
                if (norm2Set.has(next2.value[0]))
                    norm2ToMerged.set(next2.value[0], mergedCount);
                normInBoth.set(mergedCount, [next1.value[0], next2.value[0]]);
                mergedCount += 1;

                next1 = iterator1.next();
                next2 = iterator2.next();
            } else {
                throw new Error('DAWG value comparison error');
            }
        }

        // one structure is done, so flush the remaining input structure
        while (!remainingNext.done) {
            mergedDawg.insert(remainingNext.value[1]);

            if (remainingMembershipSet.has(remainingNext.value[0]))
                remainingMergeMap.set(remainingNext.value[0], mergedCount);
            mergedCount += 1;

            remainingNext = remainingIterator.next();
        }

        // we're done; finalize and collapse
        mergedDawg.finish();
        var dawgFile = toBase + '.dawg';
        var mergedData = mergedDawg.toCompactDawgBuffer(
            use_normalization_cache
        );
        fs.writeFile(dawgFile, mergedData, function(err) {
            stats.stat = +new Date() - start;

            to._dictcache = new carmenDawg(mergedData);

            if (use_normalization_cache) {
                var normFile = toBase + '.norm.rocksdb';
                var normCache = new cxxcache.NormalizationCache(
                    normFile,
                    false
                );

                [[norm1, norm1ToMerged], [norm2, norm2ToMerged]].map(args => {
                    let [normMap, normToMerged] = args;
                    normCache.writeBatch(
                        Array.from(
                            iterTools.map(function(normalization) {
                                let mergedKey = normToMerged.get(
                                    normalization[0]
                                );
                                let mergedVals;
                                if (normInBoth.has(mergedKey)) {
                                    let sourceKeys = normInBoth.get(mergedKey);
                                    // this term was in both sides of the merge
                                    // if it has normalizations in both, we combine their normalizations
                                    // if it has a normalization in one and not in the other, that means
                                    // in one side of the merge it was in there as itself, so we need to preserve
                                    // that by adding it to the merged normalization list
                                    let norm1Vals = norm1.get(sourceKeys[0]);
                                    let norm2Vals = norm2.get(sourceKeys[1]);

                                    let combined = new Set([
                                        ...(norm1Vals || []).map(function(
                                            target
                                        ) {
                                            return norm1ToMerged.get(target);
                                        }),
                                        ...(norm2Vals || []).map(function(
                                            target
                                        ) {
                                            return norm2ToMerged.get(target);
                                        })
                                    ]);
                                    if (!norm1Vals || !norm2Vals)
                                        combined.add(mergedKey);

                                    mergedVals = Array.from(combined).sort();
                                } else {
                                    mergedVals = normalization[1].map(function(
                                        target
                                    ) {
                                        return normToMerged.get(target);
                                    });
                                }
                                return [mergedKey, mergedVals];
                            }, normMap)
                        )
                    );
                });

                to._dictcache.normalizationCache = normCache;
            }

            cb(err);
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

function multimerge(fromFiles, toFile, options, callback) {
    var toMerge = [],
        inProgress = 0;
    fromFiles.forEach(function(fromFile) {
        toMerge.push(fromFile);
    });

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

            var enqueueTask = function(
                from1File,
                from2File,
                mergeToFile,
                isFinal
            ) {
                q.defer(
                    function(from1File, from2File, mergeToFile, cb) {
                        var worker = fork(__dirname + '/merge-worker.js');
                        worker.send({
                            from1File: from1File,
                            from2File: from2File,
                            mergeToFile: mergeToFile,
                            options: options
                        });
                        worker.on('exit', function exit(code) {
                            if (code == 0) {
                                inProgress -= 2;

                                if (isFinal) {
                                    // we're done
                                    // clean up intermediate products

                                    fs.readdir(tmpDir, function(err, files) {
                                        var deleteQ = queue();
                                        for (var i = 0; i < files.length; i++)
                                            deleteQ.defer(function(file, cb) {
                                                fs.unlink(
                                                    tmpDir + '/' + file,
                                                    cb
                                                );
                                            }, files[i]);
                                        deleteQ.awaitAll(function() {
                                            fs.rmdir(tmpDir, function() {
                                                // done with clean up; call callback
                                                console.log(
                                                    'Merge worker cleanup complete'
                                                );
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
                    },
                    from1File,
                    from2File,
                    mergeToFile
                );
            };

            if (inProgress == 2 && toMerge.length == 0) {
                // nobody else is working on anything and we've grabbed the last
                // two things to merge, so merge into the final output
                enqueueTask(from1File, from2File, toFile, true);
            } else {
                // we need a temporary thing to merge into
                // (wrap in an iffe to preserve the current from1 and from2)
                (function(from1File, from2File) {
                    var filename =
                        tmpDir +
                        '/merge-' +
                        ('0000' + tmpCounter).substr(-4, 4) +
                        '.mbtiles';
                    tmpCounter += 1;
                    enqueueTask(from1File, from2File, filename, false);
                })(from1File, from2File);
            }
        }
    };
    queueJobs();
}
