var EventEmitter = require('events').EventEmitter,
    fs = require('fs'),
    inherits = require('util').inherits;

module.exports = MemSource;

inherits(MemSource, EventEmitter);

function MemSource(docs, info, callback) {
    if (typeof info === 'function') {
        callback = info;
        info = docs;
        docs = null;
    }

    this._shards = {};
    this._grids = {};
    this._info = info || { maxzoom: 6, timeout: 0 };
    this._info.geocoder_version = this._info.geocoder_version !== undefined ? this._info.geocoder_version : 6;
    this.open = true;
    this.docs = docs;
    this.logs = {
        getGeocoderData: [],
        putGeocoderData: [],
        getTile: [],
        putTile: []
    };
    return callback(null, this);
}

// Implements carmen#getGeocoderData method.
MemSource.prototype.getGeocoderData = function(type, shard, callback) {
    this.logs.getGeocoderData.push(type + ',' + shard);
    if (this._info.timeout) {
        setTimeout(function() { callback(null, this._shards[type] && this._shards[type][shard]); }.bind(this), this._info.timeout);
    } else {
        callback(null, this._shards[type] && this._shards[type][shard]);
    }
};

// Implements carmen#putGeocoderData method.
MemSource.prototype.putGeocoderData = function(type, shard, data, callback) {
    this.logs.putGeocoderData.push(type + ',' + shard + ',' + data.length);
    if (this._shards[type] === undefined) this._shards[type] = {};
    this._shards[type][shard] = data;
    if (this._info.timeout) {
        setTimeout(function() { callback(null); }, 10);
    } else {
        callback(null);
    }
};

// Implements carmen#getGeocoderData method.
MemSource.prototype.geocoderDataForEach = function(type, callback, completeCallback) {
    var shards = this._shards[type] || {};
    var shardKeys = Object.keys(shards).map(function(k) { return parseInt(k, 10); });
    shardKeys = shardKeys.sort(function(a, b) { return a - b; });
    shardKeys.forEach(function(key) {
        callback(key, shards[key]);
    });
    completeCallback();
};

// Implements carmen#getIndexableDocs method.
MemSource.prototype.getIndexableDocs = function(pointer, callback) {
    pointer = pointer || {};
    if (pointer.done) return callback(null, [], pointer);
    return callback(null, this.docs, {done:true});
};

// Adds carmen schema to startWriting.
MemSource.prototype.startWriting = function(callback) {
    return callback(null);
};

// Shards are stored as binary buffers, so we need to convert them to base64
// strings in order for them to be safe for JSON.stringify
MemSource.prototype.serialize = function(name, callback) {
    function shardify(shards) {
        var o = {};
        for (var i in shards) {
            o[i] = strings(shards[i]);
        }
        return o;
    }

    function strings(shards) {
        var o = {};
        for (var i in shards) {
            o[i] = shards[i].toString('base64');
        }
        return o;
    }

    return {
        shards: shardify(this._shards),
        geocoder: this._geocoder
    };
};

MemSource.prototype.stopWriting = function(callback) {
    return callback(null);
};

MemSource.prototype.getInfo = function(callback) {
    callback(null, this._info);
};

MemSource.prototype.getTile = function(z,x,y,callback) {
    this.logs.getTile.push(z + ',' + x + ',' + y);
    var key = z + '/' + x + '/' + y;
    if (this._grids[key]) return callback(null, this._grids[key]);
    return callback(new Error('Tile does not exist'));
};

MemSource.prototype.putTile= function(z,x,y,grid,callback) {
    this.logs.putTile.push(z + ',' + x + ',' + y);
    var key = z + '/' + x + '/' + y;
    this._grids[key] = grid;
    return callback && callback();
};
