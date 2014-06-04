var path = require('path'),
    EventEmitter = require('events').EventEmitter,
    queue = require('queue-async');

var Cache = require('./lib/util/cxxcache'),
    getContext = require('./lib/context'),
    loader = require('./lib/loader'),
    geocode = require('./lib/geocode'),
    analyze = require('./lib/analyze'),
    verify = require('./lib/verify'),
    loadall = require('./lib/loadall'),
    termops = require('./lib/util/termops'),
    wipe = require('./lib/wipe'),
    copy = require('./lib/copy'),
    index = require('./lib/index');

require('util').inherits(Geocoder, EventEmitter);
module.exports = Geocoder;

// Initialize and load Geocoder, with a selection of indexes.
function Geocoder(options) {
    if (!options) throw new Error('Geocoder options required.');

    var q = queue(),
        indexes = pairs(options);

    indexes.forEach(function(index) {
        q.defer(loadIndex, index);
    });

    q.awaitAll(function(err, results) {
        this._error = err;
        this._opened = true;
        this.emit('open', err);
    }.bind(this));

    this.indexes = indexes.reduce(toObject, {});

    function loadIndex(sourceindex, callback) {
        var source = sourceindex[1],
            key = sourceindex[0];

        source = source.source ? source.source : source;

        if (source.open === true) return source.getInfo(loadedinfo);
        if (typeof source.open === 'function') return source.open(opened);
        return source.once('open', opened);

        function opened(err) {
            if (err) return callback(err);
            source.getInfo(loadedinfo);
        }

        function loadedinfo(err, info) {
            if (err) return callback(err);
            source._geocoder = source._geocoder || new Cache(key, +info.geocoder_shardlevel || 0);
            source._geocoder.geocoder_address = !!parseInt(info.geocoder_address||0,10);
            source._geocoder.geocoder_vector_tolerance = info.geocoder_vector_tolerance ? parseInt(info.geocoder_vector_tolerance, 10) : 50
            source._geocoder.geocoder_layer = (info.geocoder_layer||'').split('.').shift();
            source._geocoder.geocoder_tokens = termops.tokenizeMapping(info.geocoder_tokens||{});
            source._geocoder.maxzoom = info.maxzoom;
            source._geocoder.zoom = info.maxzoom + parseInt(info.geocoder_resolution||0,10);
            source._geocoder.format = info.format || '';
            source._geocoder.group = info.geocoder_group || '';
            source._geocoder.name = key;
            source._geocoder.idx = Object.keys(options).indexOf(key);
            return callback();
        }
    }
}

function pairs(o) {
    var a = [];
    for (var k in o) a.push([k, o[k]]);
    return a;
}

function toObject(mem, s) {
    mem[s[0]] = s[1].source ? s[1].source : s[1];
    return mem;
}

// Ensure that all carmen sources are opened.
Geocoder.prototype._open = function(callback) {
    return this._opened ? callback(this._error) : this.once('open', callback);
};

// Main geocoding API entry point.
// Returns results across all indexes for a given query.
//
// Actual searches are delegated to `Geocoder.prototype.search` over each
// enabled backend.
//
// `query` is a string of text, like "Chester, NJ"
// `options` is an object with additional parameters
// `callback` is called with (error, results)
Geocoder.prototype.geocode = function(query, options, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            geocode(this, query, options, callback);
        }.bind(this));
    }
    return geocode(this, query, options, callback);
};

// Index docs from one source to another.
Geocoder.prototype.index = function(from, to, pointer, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            index(this, from, to, pointer, callback);
        }.bind(this));
    }
    return index(this, from, to, pointer, callback);
};

// Verify the integrity of a source's index.
Geocoder.prototype.verify = function(source, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            verify(source, callback);
        }.bind(this));
    }
    return verify(source, callback);
};


// Analyze a source's index.
Geocoder.prototype.analyze = function(source, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            analyze(source, callback);
        }.bind(this));
    }
    return analyze(source, callback);
};

// Wipe a source's index.
Geocoder.prototype.wipe = function(source, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            wipe(source, callback);
        }.bind(this));
    }
    return wipe(source, callback);
};

// Load all shards for a source.
Geocoder.prototype.loadall = function(source, concurrency, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            loadall(source, concurrency, callback);
        }.bind(this));
    }
    return loadall(source, concurrency, callback);
};

// Copy a source's index to another.
Geocoder.prototype.copy = function(from, to, callback) {
    if (!this._opened) {
        return this._open(function(err) {
            if (err) return callback(err);
            copy(from, to, callback);
        }.bind(this));
    }
    return copy(from, to, callback);
};

Geocoder.auto = loader.auto;
Geocoder.autodir = loader.autodir;
