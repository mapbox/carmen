var queue = require('d3-queue').queue;
var cxxcache = require('./util/cxxcache');
var stream = require('stream');
var fs = require('fs-extra');

module.exports = function index(from, to, callback) {
    to.startWriting(function(err) {
        if (err) return callback(err);
        var q = queue(2);
        q.defer(copyType, from, to, 'feature');
        q.awaitAll(function(err) {
            if (err) return callback(err);
            to.stopWriting(function(err) {
                if (err) return callback(err);
                var copyQ = queue();
                var rocksDirs = {};

                var copyCache = function(type, cb) {
                    // call pack on the from cache into the to filename
                    var toRdb = to.getBaseFilename() + '.' + type + '.rocksdb';

                    from._geocoder[type].pack(toRdb);

                    rocksDirs[type] = toRdb;
                    cb();
                };

                copyQ.defer(copyCache, "grid");
                copyQ.defer(copyCache, "freq");
                copyQ.defer(function(cb) {
                    var toDawgFile = to.getBaseFilename() + ".dawg";
                    var fromDawgFile = from.getBaseFilename() + ".dawg";

                    if (fs.existsSync(fromDawgFile)) {
                        fs.copy(fromDawgFile, toDawgFile, cb);
                    } else if (from._dictcache.dump) {
                        fs.writeFile(toDawgFile, from._dictcache.dump(), cb);
                    }
                });
                copyQ.await(function() {
                    to._geocoder.grid = new cxxcache.RocksDBCache(to._geocoder.grid.id, rocksDirs.grid);
                    to._geocoder.freq = new cxxcache.RocksDBCache(to._geocoder.freq.id, rocksDirs.freq);
                    callback();
                })
            });
        });
    });
};

function copyType(from, to, type, callback) {
    var getStream = geocoderGetStream(from, type);
    var putStream = geocoderPutStream(to, type);
    getStream.pipe(putStream).pipe(new stream.PassThrough());
    getStream.on('error', done)
    putStream.on('end', done);
    putStream.on('error', done);
    function done(err) {
        callback && callback(err);
        callback = false;
    }
}

function geocoderGetStream(from, type) {
    var readQueue = queue(1);
    var readStream = new stream.Readable({objectMode:true});
    var iterator = from.geocoderDataIterator(type);
    readStream._read = function() {
        readQueue.defer(function(callback) {
            iterator.asyncNext(function(err, row) {
                if (err) {
                    readStream.emit('error', err);
                } else if (row.done) {
                    readStream.push(null);
                } else {
                    readStream.push(row.value);
                }
                callback();
            });
        });
    };
    return readStream;
}

function geocoderPutStream(to, type) {
    var putQueue = queue();
    var putStream = new stream.Transform({objectMode:true});
    putStream.pending = 0;
    putStream._transform = function(row, enc, callback) {
        if (putStream.pending > 1000) {
            return setImmediate(putStream._transform.bind(putStream), row, enc, callback);
        }
        putStream.pending++;
        putQueue.defer(function(shard, data, callback) {
            to.putGeocoderData(type, shard, data, function(err) {
                if (err) putStream.emit('error', err);
                putStream.pending--;
                callback(err);
            });
        }, row.shard, row.data);
        callback();
    };
    putStream._flush = function(callback) {
        putQueue.awaitAll(callback);
    };
    return putStream;
}

