var _ = require('underscore');
var S3 = require('tilelive-s3');
var url = require('url');
var path = require('path');
var retry = require('retry');
var iconv = new require('iconv').Iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE');
var retryCfg = {};

// Wrap tilelive-s3.
// Configure retry logic.
module.exports = function(opts) {
    setupRetry(opts);
    return S3;
}

// Set up retry configuration.
// Default to zero retries.
function setupRetry(opts) {
    retryCfg = _(opts).defaults({
        retries: 0
    });
}

// Converts a doc into an array of search terms.
// Terms that are part of a larger phrase are suffixed with an '-' indicating
// that they do not represent the complete text of the document, e.g.
//
//   united states =>
//     united-
//     states-
//     united_states
//
// A full normalized version of the doc is ensured to be the last entry making
// it possible to .pop() a normalized string usable as a search query prefix.
S3.terms = function(doc) {
    try {
        var converted = iconv.convert(doc).toString();
        doc = converted;
    } catch(err) {}

    var terms = [];
    doc.split(',').forEach(function(doc) {
        var parts = doc.split(/[ -]/g)
            .map(function(w) { return w.replace(/[^\w]/g, '').toLowerCase(); })
            .filter(function(w) { return w.length });
        terms = terms
            .concat(parts
                .filter(function(w) { return w.length > 1 })
                .map(function(w) { return parts.length > 1 ? w + '-' : w }))
            .concat(parts.length > 1 ? parts.join('_') : []);
    });
    return _(terms).uniq();
};

// Implements carmen#search method.
S3.prototype.search = function(query, id, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));
    if (!this.client) return callback(new Error('No S3 client found'));

    // Parse carmen URL.
    try { var uri = url.parse(this.data._carmen); }
    catch (err) { return callback(new Error('Carmen not supported')); }

    // Reduce callback for object keys.
    var toDocs = function(memo, obj) {
        var key = obj.split('/').pop().split('.');
        memo[key[1]] = memo[key[1]] || { text:[] };
        memo[key[1]].id = key[1];
        memo[key[1]].zxy = (memo[key[1]].zxy || [])
            .concat(key.slice(2).map(function(v) { return v.replace(/,/g,'/') }));
        memo[key[1]].text.push(key[0].replace(/_/g,' '));
        return memo;
    };

    // ID search.
    if (id) return this.feature(id, function(err, data) {
        if (err) return callback(err);
        var docs = _(data._terms).chain()
            .reduce(toDocs, {})
            .map(function(res) {
                res.zxy = _(res.zxy).uniq();
                res.text = _(res.text).uniq()
                    .filter(function(t) { return t.indexOf('-') === -1 })
                    .join(',');
                return res;
            })
            .value();
        return callback(null, docs);
    }, true);

    // Query search.
    var prefix = path.join(uri.pathname, 'term/' + S3.terms(query).pop()).substr(1);
    var tilejson = this;
    var operation = retry.operation(retryCfg);

    operation.attempt(function(current) {
        this.client.getFile('?prefix=' + prefix, function(err, res){
            if (err) {
                if (operation.retry(err)) return;
            }
            if (err) return callback(err);
            var xml = '';
            res.on('data', function(chunk){ xml += chunk; });
            res.on('end', function() {
                var parsed = xml.match(new RegExp('[^>]+(?=<\\/Key>)', 'g')) || [];
                var docs = _(parsed).chain()
                    .reduce(toDocs, {})
                    .map(function(res) {
                        res.zxy = _(res.zxy).uniq();
                        res.text = _(res.text).uniq().join(',');
                        return res;
                    })
                    .value();
                return callback(null, docs);
            });
            res.on('error', function(err) {
                if (operation.retry(err)) return;
                callback(err);
            });
        }.bind(this));
    }.bind(this));
};

// Implements carmen#feature method.
S3.prototype.feature = function(id, callback, raw) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    // Parse carmen URL.
    try { var uri = url.parse(this.data._carmen); }
    catch (err) { return callback(new Error('Carmen not supported')); }

    uri.pathname = path.join(uri.pathname, 'data/' + id + '.json');
    new S3.get({
        uri: url.format(uri),
        headers: {Connection:'Keep-Alive'},
        agent: S3.agent,
        timeout: 5000
    }).asBuffer(function(err, buffer) {
        if (err) return callback(err);
        try { var data = JSON.parse(buffer.toString('utf8')); }
        catch (err) { return callback(err); }
        if (!raw) delete data._terms;
        return callback(null, data);
    });
};

// Implements carmen#index method.
S3.prototype.index = function(id, text, doc, zxy, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));
    if (!this.client) return callback(new Error('Tilesource not writing'));

    // @TODO get existing document and purge its terms.

    // Parse carmen URL.
    try { var uri = url.parse(this.data._carmen); }
    catch (err) { return callback(new Error('Carmen not supported')); }

    // Add each search term shard.
    var terms = [];
    var puts = [];
    S3.terms(text).forEach(function(shard) {
        var coords = zxy.map(function(zxy) { return zxy.replace(/\//g,',') });
        var prefix = path.join(uri.pathname, 'term/' + shard + '.' + id + '.');
        while (coords.length) {
            var chunk = [];
            do {
                var next = prefix + chunk.join('.') + (coords.length ? '.' + coords[0] : '');
            } while (
                next.length < 1024 &&
                coords.length &&
                chunk.push(coords.shift())
            );
            var key = prefix + chunk.join('.');
            terms.push(key);
            puts.push({ key:key, data:'' });
        }
    });

    // Add actual doc to queue.
    puts.push({
        key:path.join(uri.pathname, 'data/' + id + '.json'),
        data:JSON.stringify(_({_terms:terms}).defaults(doc))
     });

    var put = function(err) {
        if (!puts.length) return callback();
        if (err) {
            console.error(err);
            return setTimeout(put, 500);
        }

        var obj = puts[0];
        var req = this.client.put(obj.key, {
            'x-amz-acl': 'public-read',
            'Connection': 'keep-alive',
            'Content-Length': obj.data ? Buffer.byteLength(obj.data, 'utf8') : 0,
            'Content-Type': 'application/json'
        });
        req.on('close', put);
        req.on('error', put);
        req.setTimeout(60e3, function() {
            req.abort();
            var err = new Error('ESOCKETTIMEDOUT');
            err.code = 'ESOCKETTIMEDOUT';
            req.emit('error', err);
        });
        req.on('response', function(res) {
            res.on('error', put);
            if (res.statusCode === 200) {
                puts.shift();
                return put();
            } else {
                return put(new Error('S3 put failed: ' + res.statusCode));
            }
        });
        req.end(obj.data);
    }.bind(this);

    put();
};

// Implements carmen#indexable method.
S3.prototype.indexable = function(pointer, callback) {
    if (!this.data) return callback(new Error('Tilesource not loaded'));

    // Parse carmen URL.
    try { var uri = url.parse(this.data._carmen); }
    catch (err) { return callback(new Error('Carmen not supported')); }

    pointer = pointer || {};
    pointer.done = pointer.done || false;
    pointer.limit = pointer.limit || 1000;
    pointer.marker = pointer.marker || null;

    // Pointer true means all docs have been read.
    if (pointer.done) return callback(null, [], pointer);

    new S3.get({
        uri: url.format({
            hostname:uri.hostname,
            protocol:uri.protocol,
            query:{
                marker: pointer.marker,
                prefix: path.join(uri.pathname, 'data').substr(1),
                'max-keys':pointer.limit
            }
        }),
        headers: {Connection:'Keep-Alive'},
        agent: S3.agent
    }).asBuffer(function(err, buffer) {
        if (err) return callback(err);
        var xml = buffer.toString('utf8');
        var parsed = xml.match(new RegExp('[^>]+(?=<\\/Key>)', 'g')) || [];
        var truncated = /true<\/IsTruncated>/ig.test(xml);
        if (truncated) {
            pointer.marker = parsed[parsed.length-1];
        } else {
            pointer.done = true;
        }

        // No more results.
        if (!parsed.length) return callback(null, [], pointer);

        var docs = [];
        var next = function() {
            if (!parsed.length) return callback(null, docs, pointer);
            var key = parsed[0];
            new S3.get({
                uri: url.format({
                    hostname:uri.hostname,
                    protocol:uri.protocol,
                    pathname:key
                }),
                headers: {Connection:'Keep-Alive'},
                agent: S3.agent
            }).asBuffer(function(err, buffer) {
                // @TODO consider retry here.
                if (err) return callback(err);

                try { var data = JSON.parse(buffer.toString('utf8')); }
                catch(err) { return callback(err); }

                var zxy = data._terms && data._terms.length &&
                    data._terms[0].split('/').pop().split('.').slice(2)
                    .map(function(zxy) { return zxy.replace(/,/g,'/') });
                var doc = {};
                doc.id = path.basename(key, path.extname(key));
                doc.doc = data;
                doc.text = data.search;
                doc.zxy = zxy || [];
                delete data._terms;

                docs.push(doc);
                parsed.shift();
                next();
            });
        };
        next();
    }.bind(this));
};

