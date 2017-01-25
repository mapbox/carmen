var Cache = require('@mapbox/carmen-cache').Cache;
var queue = require('d3-queue').queue;
var uniq = require('./uniq');
var types = {
    freq: 2,
    stat: 0,
    grid: 4
};

// This file wraps the Cache object coming from C++
//
// This object internally uses two caches: one to
// store fully materialized data (called 'memory' cache)
// and another that stores a raw protobuf representation
// of the data (called 'lazy' cache) which needs extra
// work to decode before being usable.
//
// This object offers to JS these functions:
//
// Returns whether the Cache has data loaded for a given
// index type and shard by looking in both the memory cache
// and the lazy cache.
// - has(type, shard)
//
// Load data into memory synchronously (recommend)
// This adds data to the lazy cache only because this
// is faster than fully materializing the data into the
// memory cache and also takes up less memory.
// - loadSync(buffer, type, shard)
//
// Loads data into memory asynchronously
// NOT recommended to use at this time / experimental
// Note: if no callback is passed this dispatches to loadSync
// - load(buffer, type, shard, callback)
//
// Gets data for a given type, shard, and id
// Wrapped by the JS land function 'get'
// - _get(type, shard, id)
//
// Adds a JS array to the cache for given type, shard,
// and id. This adds data directly to the fully materialized
// cache and leaves the lazy protobuf cache untouched
// which is in contrast to the load method.
// Wrapped by the JS land function 'set'
// - _set(type, shard, id, data)
//
// Returns a buffer containing the protobuf
// representation for a given type and shard that
// is already loaded into the cache. This searches
// both the memory cache and the lazy cache for a match
// and throws if none is found.
// - pack(type, shard)
//
// If one arg (type) is passed then list returns the
// available shards ids for a given type. If two args are
// passed (both type and shard) then list returns the
// ids for all arrays for the matching shard. This method
// looks in both the memory cache and the lazy cache for
// matches.
// - list(type, [shard])
//
// Removes cached data for given type and shard from
// both the memory and lazy caches.
// - unload(type, shard)

exports = module.exports = Cache;

Cache.mp = {};
for (var i = 0; i <= 52; i++) Cache.mp[i] = Math.pow(2,i);

// Return the shard for a given shardlevel + id.
Cache.shard = function(type, id) {
    if (id > Cache.mp[52]) throw new Error('id is not <= 2^52');
    if (id === undefined) return false;

    var level = types[type];
    if (level === undefined) throw new Error('Unknown type: ' + type);

    if (level === 0) return 0;
    var bits = 52 - (level*4);
    return Math.floor(id/Cache.mp[bits]);
};

// Group a queue of IDs by their respective shards.
Cache.shards = function(type, queue) {
    var level = types[type];
    if (!level) throw new Error('Unknown type: ' + type);

    var bits = 52 - (level*4);
    var shards = {};
    var i = queue.length;
    while (i--) {
        var shard = Math.floor(queue[i]/Cache.mp[bits]);
        shards[shard] = shards[shard] || [];
        shards[shard].push(queue[i]);
    }
    return shards;
};

// Store a id->data pair into this cache, computing the appropriate shard
Cache.prototype.set = function(type, id, data, append) {
    var shard = Cache.shard(type, +id);
    this._set(type, shard, +id, data, append);
};

// Get the data that belongs to a specific `data` member.
Cache.prototype.get = function(type, id) {
    var shard = Cache.shard(type, +id);
    return this._get(type, shard, +id);
};

// Check whether given data exists
Cache.prototype.dict = function(type, id) {
    var shard = Cache.shard(type, +id);
    return this._dict(type, shard, +id);
};

// # getall
//
// @param {Function} getter a function that accepts `(type, shard, callback)`
// and given a type and shard, grabs all possible results.
// @param {String} type
// @param {Array} ids an array of ids as numbers
// @param {Function} callback a function invoked with `(error, unique results)`
Cache.prototype.getall = function(getter, type, ids, callback) {
    var cache = this;
    this.loadall(getter, type, ids, function(err, shards, queues) {
        if (err) return callback(err);

        // Queue shard has been loaded into memory.
        var a = shards.length;
        var result = [];
        while (a--) {
            var shard = shards[a];
            var queue = queues[shard];
            var b = queue.length;
            while (b--) {
                var id = queue[b];
                var match = cache._get(type,+shard,+id);
                if (match) {
                    var i = match.length;
                    while (i--) result.push(match[i]);
                }
            }
        }

        result = type === 'grid' ? result : uniq(result);
        callback(null, result);
    });
};

// Load all shards for a given type/queue of ids.
// Does not retrieve values from cache as hopping from cpp => js
// divide can be expensive.
Cache.prototype.loadall = function(getter, type, ids, callback) {
    var cache = this;
    var queues = Cache.shards(type, ids);

    var allshards = Object.keys(queues);
    var shards = [];
    for (var i = 0; i < allshards.length; i++) {
        if (!cache.has(type, +allshards[i])) shards.push(allshards[i]);
    }

    var q = queue(10);
    for (var k = 0; k < shards.length; k++) {
        q.defer(getter, type, +shards[k]);
    }

    q.awaitAll(function(err, buffers) {
        if (err) return callback(err);
        for (var i = 0; i < buffers.length; i++) {
            if (!buffers[i]) continue;
            // Sync load is used because async call is
            // experimental/not yet stable
            try {
                cache.loadSync(buffers[i], type, +shards[i]);
            } catch (e) {
                return callback(e);
            }
        }
        callback(err, allshards, queues);
    });
};

// # unloadall
//
// @param {String} type
Cache.prototype.unloadall = function(type) {
    var level = types[type];
    if (level === undefined) throw new Error('Unknown type: ' + type);
    var i = Math.pow(16, level);
    while (i--) this.unload(type, i);
    return true;
};

