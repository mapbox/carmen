var fs = require('fs');
var path = require('path');
var Stream = require('stream');
var util = require('util');
var split = require('split');
var Carmen = require('..');
var index = require('../lib/index');
var MBTiles = require('mbtiles');
var mem = require('../lib/api-mem');
var byline = require('byline');

var UPDATE = process.env.UPDATE;
var test = require('tape');
var termops = require('../lib/util/termops');
var token = require('../lib/util/token');


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

    var confA = {
        to: new mem([], null, function() {})
    };
    
    var carmenA = new Carmen(confA);
    var indexA = getIndex(0,100);
    assert.test('index docs.json', function(q) {
        carmenA.index(indexA, confA.to, {
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

    var confB = {
        to: new mem([], null, function() {})
    };

    var carmenB = new Carmen(confB);
    var indexB = getIndex(101,200);
    assert.test('index docs.json', function(q) {
        carmenB.index(indexB, confB.to, {
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

    var confC = {
        to: new mem([], null, function() {})
    };
    var carmenC = new Carmen(confC);

    var indexC = getIndex(201,254);
    assert.test('index docs.json', function(q) {
        carmenC.index(indexC, confC.to, {
            zoom: 6,
            output: outputStream
        }, function(err) {
            q.ifError(err);
            q.end();
        });
    });
    assert.test('ensure index was successful for index C', function(q) {
        carmenC.geocode("Monaco", {}, function(err, result) {
            assert.ifError(err, "error");
            assert.equal(result.features[0].text, "Monaco", "found Monaco");
            q.end();
        });
    });
    assert.test("can't find Oman, not in index C", function(q) {
        carmenC.geocode("Oman", {}, function(err, result) {
            assert.ifError(err, "error");
            assert.equal(result.features.length, 0, "can't find Oman");
            q.end();
        });
    });



    assert.end();

});
