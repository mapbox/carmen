var fs = require('fs');
var path = require('path');
var Stream = require('stream');
var split = require('split');
var Carmen = require('..');
var mem = require('../lib/api-mem');
var de = require('deep-equal');

var test = require('tape');

test('index - streaming interface', function(assert) {
    function getIndex(start, end) {

        var count = 0;
        var inputStream = fs.createReadStream(path.resolve(__dirname, './fixtures/docs.jsonl'), { encoding: 'utf8' });
        var transformStream = new Stream.Transform();
        transformStream._transform = function(data, encoding, done) {
            if (data) {
                count ++;
            }
            if (count > start && count <= end) {
                this.push(data+"\n");
            }
            done();
        };
        inputStream.pipe(split()).pipe(transformStream);
        return transformStream;
    }

    var outputStream = new Stream.Writable();
    outputStream._write = function(chunk, encoding, done) {
        var doc = JSON.parse(chunk.toString());

        //Only print on error or else the logs are super long
        if (!doc.id) assert.ok(doc.id, 'has id: ' + doc.id);
        done();
    };

    var memObjectA = new mem([], null, function() {});
    var confA = {
        country : memObjectA
    };

    var carmenA = new Carmen(confA);
    var indexA = getIndex(0,100);
    assert.test('index docs.json', function(q) {
        carmenA.index(indexA, confA.country, {
            zoom: 6,
            output: outputStream
        }, function(err) {
            q.ifError(err);
            q.end();
        });
    });
    assert.test('ensure index was successful for index A', function(q) {
        carmenA.geocode("India", {}, function(err, result) {
            assert.ifError(err, "error");
            assert.equal(result.features[0].text, "India", "found India");
            q.end();
        });
    });
    assert.test("can't find Turkmenistan, not in Index A", function(q) {
        carmenA.geocode("Turkmenistan", {}, function(err, result) {
            assert.ifError(err, "error");
            assert.equal(result.features.length, 0, "Can't find Turkmenistan");
            q.end();
        });
    });

    var memObjectB = new mem([], null, function() {});
    var confB = {
        country: memObjectB
    };

    var carmenB = new Carmen(confB);
    var indexB = getIndex(100,200);
    assert.test('index docs.json', function(q) {
        carmenB.index(indexB, confB.country, {
            zoom: 6,
            output: outputStream
        }, function(err) {
            q.ifError(err);
            q.end();
        });
    });
    assert.test('ensure index was successful for index B', function(q) {
        carmenB.geocode("Paraguay", {}, function(err, result) {
            assert.ifError(err, "error");
            assert.equal(result.features[0].text, "Paraguay", "found Paraguay");
            q.end();
        });
    });
    assert.test("can't find Nauru, not in index B", function(q) {
        carmenB.geocode("Nauru", {}, function(err, result) {
            assert.ifError(err, "error");
            assert.equal(result.features.length, 0, "can't find Nauru");
            q.end();
        });
    });

    var memObjectD = new mem([], null, function() {});
    var confD = {
        country: memObjectD
    };

    var carmenD = new Carmen(confD);
    var indexD = getIndex(0,200);
    assert.test('index docs.json', function(q) {
        carmenD.index(indexD, confD.country, {
            zoom: 6,
            output: outputStream
        }, function(err) {
            q.ifError(err);
            q.end();
        });
    });

    var memObjectC = new mem([], null, function() {});
    var confC = { country: memObjectC };
    var carmenC = new Carmen(confC);

    assert.test('merged indexes', function(q) {
        carmenC.merge(memObjectA, memObjectB, memObjectC, {}, function(err) {
            if (err) throw err;
            // the dictcache has been reloaded, so copy it over to the carmen object
            carmenC.indexes.country._dictcache = memObjectC._dictcache;
            q.end();
        });
    });
    assert.test('ensure index was successful for index A after merging', function(q) {
        carmenC.geocode("India", {}, function(err, result) {
            assert.ifError(err, "error");
            assert.equal(result.features[0].text, "India", "found India");
            q.end();
        });
    });
    assert.test('ensure index was successful for index B after merging', function(q) {
        carmenC.geocode("Paraguay", {}, function(err, result) {
            assert.ifError(err, "error");
            assert.equal(result.features[0].text, "Paraguay", "found Paraguay");
            q.end();
        });
    });

    assert.test('ensure total indexes in C is greater than A and B', function(q) {
        carmenA.analyze(memObjectA, function(err, stats) {
            var a = stats.total;
            carmenB.analyze(memObjectB, function(err, stats) {
                var b = stats.total;
                carmenC.analyze(memObjectC, function(err,stats) {
                    var c = stats.total;
                    assert.ok((c > a && c > b), "ok");
                    q.end();
                });
            });
        });
    });

    assert.test('ensure geocode of a term that occurs in both indexes produces the same results', function(q) {
        carmenC.geocode('Republic', {}, function(err, resultC) {
            assert.ifError(err, "error");
            carmenD.geocode('Republic', {}, function(err, resultD) {
                assert.ifError(err, "error");
                assert.ok(de(resultC, resultD), 'geocoding "Republic" produces identical results in merged and complete index');
                q.end();
            });
        });
    });

    assert.test('ensure merged index features and original features are identical', function(q) {
        var count = 0;
        for (var i = 1; i <= 200; i++) {
            count += de(memObjectC._shards.feature[i], memObjectD._shards.feature[i], "==") ? 1 : 0;
        }
        var percentage = (count/200)*100;
        assert.ok(percentage == 100, "features are identical");
        q.end();
    });

    ["freq", "grid"].forEach(function(type) {
        assert.test('ensure merged index ' + type + ' and original ' + type + ' are 98 percent similar', function(q) {
            var cSet = new Set(carmenC.indexes.country._geocoder[type].list());
            var dSet = new Set(carmenD.indexes.country._geocoder[type].list());
            var intersection = new Set(Array.from(cSet).filter(function(x) { return dSet.has(x) }));
            var union = new Set(Array.from(cSet).concat(Array.from(dSet)));
            var percentage = 100 * intersection.size / (union.size);
            assert.ok(percentage >= 97, type + ' matches > 97%: ' + percentage);

            q.end();
        });
    });

    assert.end();
});
