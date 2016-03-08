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
var count = 0;

test('index - streaming interface', function(assert) {

    function getIndex(start, end) {

    var inputStream = fs.createReadStream(path.resolve(__dirname, './fixtures/docs.jsonl'), { encoding: 'utf8' });
    var transformStream = new Stream.Transform();
    transformStream._transform = function(data, encoding, done) { 
        if (data) {
            count ++;
    }   
        if (count > start && count <= end) {
        this.push(data+"\n");
        //console.log(count);
        //console.log(data.toString());

            }

        done();
    };
     return inputStream.pipe(split()).pipe(transformStream);

} 

    var outputStream = new Stream.Writable();
    outputStream._write = function(chunk, encoding, done) {
        var doc = JSON.parse(chunk.toString());

        //Only print on error or else the logs are super long
        if (!doc.id) assert.ok(doc.id, 'has id: ' + doc.id);
        done();
    };

    var conf = {
        to: new mem([], null, function() {})
    };
    
    var carmen = new Carmen(conf);

    assert.test('index docs.json', function(q) {
        carmen.index(getIndex(0,100), conf.to, {
            zoom: 6,
            output: outputStream
        }, function(err) {
            q.ifError(err);
            q.end();
        });
    }); 
    assert.test('ensure index was successful for index A', function(q) {
        carmen.geocode("India", {}, function(err, result) {
            assert.ifError(err, "error");
            assert.equal(result.features[0].text, "India", "found India");
            q.end();
        });
    });
    assert.test("can't find Turkmenistan, not in Index A", function(q) {
            carmen.geocode("Turkmenistan", {}, function(err, result) {
            assert.ifError(err, "error");
            assert.equal(result.features.length, 0, "Can't find Turkmenistan");
            q.end();
        });
    });

     assert.test('index docs.json', function(q) {
        carmen.index(getIndex(101,200), conf.to, {
            zoom: 6,
            output: outputStream
        }, function(err) {
            q.ifError(err);
            q.end();
        });
    }); 
    assert.test('ensure index was successful for index B', function(q) {
        carmen.geocode("Paraguay", {}, function(err, result) {
            assert.ifError(err, "error");
            assert.equal(result.features[0].text, "Paraguay", "found Paraguay");
            q.end();
        });
    });
    assert.test("no feature", function(q) {
            carmen.geocode("India", {}, function(err, result) {
            assert.ifError(err, "error");
            assert.equal(result.features.length, 0, "no feature");
            q.end();
        });
    });
    assert.end();

});


