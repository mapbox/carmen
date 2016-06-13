var queue = require('d3-queue').queue;
var stream = require('stream');

module.exports = function index(from, to, callback) {
    to.startWriting(function(err) {
        if (err) return callback(err);
        var q = queue(2);
        q.defer(copyType, from, to, 'freq');
        q.defer(copyType, from, to, 'grid');
        q.defer(copyType, from, to, 'stat');
        q.defer(copyType, from, to, 'feature');
        q.awaitAll(function(err) {
            if (err) return callback(err);
            to.stopWriting(function(err) {
                if (err) return callback(err);
                to._geocoder.unloadall('freq');
                to._geocoder.unloadall('grid');
                to._geocoder.unloadall('stat');
                callback();
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

