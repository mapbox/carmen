var fs = require('fs');
var path = require('path');
var tape = require('tape');
var exec = require('child_process').exec;
var tmpdir = require('os').tmpdir();
var bin = path.resolve(path.join(__dirname, '..', 'scripts'));

var Carmen = require('../index.js');
var MBTiles = require('mbtiles');
var tmpindex = path.join(tmpdir, 'test-carmen-index.mbtiles');
var tmpindex2 = path.join(tmpdir, 'test-carmen-index2.mbtiles');
var addFeature = require('../lib/util/addfeature');

tape('clean tmp index', function(assert) {
    try {
        fs.unlinkSync(tmpindex)
        fs.unlinkSync(tmpindex2)
    } catch (err) {
        //File does not exist
    } finally {
        assert.end();
    }
});

tape('index', function(assert) {
    try {
        fs.unlinkSync(tmpindex);
    } catch (err) {
        //'file not found'
    }
    var conf = { index: new MBTiles(tmpindex, function() {}) };
    var carmen = new Carmen(conf);
    carmen.on('open', start);
    function start(err) {
        assert.ifError(err);
        conf.index.startWriting(write1);
    }
    function write1(err) {
        assert.ifError(err);
        addFeature(conf.index, {
            id:38,
            properties: {
                'carmen:text':'Canada',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, write2);
    }
    function write2(err) {
        assert.ifError(err);
        addFeature(conf.index, {
            id:39,
            properties: {
                'carmen:text':'Brazil',
                'carmen:zxy':['6/32/32'],
                'carmen:center':[0,0]
            }
        }, store);
    }
    function store(err) {
        assert.ifError(err);
        require('../lib/index.js').store(conf.index, stop);
    }
    function stop(err) {
        assert.ifError(err);
        conf.index.stopWriting(assert.end);
    }
});

tape('bin/carmen-index', function(t) {
    exec(bin + '/carmen-index.js', function(err, stdout, stderr) {
        t.ifError(err);
        t.equal(/\[options\]:/.test(stdout), true, 'finds help menu');
        t.end();
    });
});

tape('bin/carmen-index', function(t) {
    exec(bin + '/carmen-index.js --config="/tmp"', function(err, stdout, stderr) {
        t.ok(err);
        t.end();
    });
});

tape('bin/carmen-index', function(t) {
    exec(bin + '/carmen-index.js --config="'+__dirname + '/fixtures/index-bin-config.json" --tokens="'+__dirname + '/fixtures/tokens.json" --index="'+tmpindex2+'" < ./test/fixtures/small-docs.jsonl', function(err, stdout, stderr) {
        t.ifError(err);
        t.end();
    });
});

tape('bin/carmen DEBUG', function(t) {
    exec(bin + '/carmen.js ' + tmpindex + ' --query="canada" --debug="38"', function(err, stdout, stderr) {
        t.ifError(err);
        t.equal(/0\.99 Canada/.test(stdout), true, 'finds canada');
        t.ok(stdout.indexOf('PhraseMatch\n-----------') !== -1, 'debug phrase match');
        t.ok(stdout.indexOf('SpatialMatch\n------------') !== -1, 'debug spatial');
        t.ok(stdout.indexOf('spatialmatch position: 0') !== -1, 'debug spatial');
        t.ok(stdout.indexOf('VerifyMatch\n-----------') !== -1, 'debug verify match');
        t.ok(stdout.indexOf('verifymatch position: 0') !== -1, 'debug verify match');
        t.end();
    });
});

tape('bin/carmen', function(t) {
    exec(bin + '/carmen.js', function(err, stdout, stderr) {
        t.equal(1, err.code);
        t.equal("Usage: carmen.js [file|dir] --query=\"<query>\"\n", stdout);
        t.end();
    });
});
tape('bin/carmen version', function(t) {
    exec(bin + '/carmen.js --version', function(err, stdout, stderr) {
        t.error(err);
        t.ok(stdout.indexOf('carmen@') !== -1);
        t.end();
    });
});
tape('bin/carmen query', function(t) {
    exec(bin + '/carmen.js ' + tmpindex + ' --query=brazil', function(err, stdout, stderr) {
        t.ifError(err);
        t.equal(/0\.99 Brazil/.test(stdout), true, 'finds brazil');
        t.end();
    });
});

tape('bin/carmen query w/ stats', function(t) {
    exec(bin + '/carmen.js ' + tmpindex + ' --query=brazil --stats', function(err, stdout, stderr) {
        t.ifError(err);
        var warmup_re = new RegExp(/warmup\:\s+(\d+)ms/)
        var phrasematch_re = new RegExp(/phrasematch\:\s+(\d+)ms/)
        var spatialmatch_re = new RegExp(/spatialmatch\:\s+(\d+)ms/)
        var verifymatch_re = new RegExp(/verifymatch\:\s+(\d+)ms/)
        var totaltime_re = new RegExp(/totaltime\:\s+(\d+)ms/)

        var warmup_match = warmup_re.exec(stdout);
        var phrasematch_match = phrasematch_re.exec(stdout);
        var spatialmatch_match = spatialmatch_re.exec(stdout);
        var verifymatch_match = verifymatch_re.exec(stdout);
        var totaltime_match = totaltime_re.exec(stdout);

        t.ok(warmup_match[1] < 3600000, "ensure load stat is an elapsed delta of less than an hour");
        t.ok(phrasematch_match[1] < 3600000, "ensure phrasematch stat is an elapsed delta of less than an hour");
        t.ok(spatialmatch_match[1] < 3600000, "ensure spatialmatch stat is an elapsed delta of less than an hour");
        t.ok(verifymatch_match[1] < 3600000, "ensure verifymatch stat is an elapsed delta of less than an hour");
        t.ok(totaltime_match[1] < 3600000, "ensure totaltime stat is an elapsed delta of less than an hour");
        t.end();
    });
});


//Index was not indexed witht the brazil=canada token so this should produce Canada as a result
tape('bin/carmen query w/ global tokens', function(t) {
    exec(bin + '/carmen.js ' + tmpindex + ' --query=brazil --tokens="'+__dirname + '/fixtures/tokens.json"', function(err, stdout, stderr) {
        t.ifError(err);
        t.equal(/0\.99 Canada/.test(stdout), true, 'finds canada');
        t.end();
    });
});

tape('bin/carmen query types', function(t) {
    exec(bin + '/carmen.js ' + tmpindex + ' --query=brazil --types="test-carmen-index"', function(err, stdout, stderr) {
        t.ifError(err);
        t.equal(/0\.99 Brazil/.test(stdout), true, 'finds brazil');
        t.end();
    });
});
tape('bin/carmen query wrong types', function(t) {
    exec(bin + '/carmen.js ' + tmpindex + ' --query=brazil --types="not a type"', function(err, stdout, stderr) {
        t.ok(err, 'not a type');
        t.end();
    });
});
tape('bin/carmen query wrong stacks', function(t) {
    exec(bin + '/carmen.js ' + tmpindex + ' --query=brazil --stacks="not a stack"', function(err, stdout, stderr) {
        t.ok(err, 'not a stack');
        t.end();
    });
});
tape('bin/carmen-copy noargs', function(t) {
    exec(bin + '/carmen-copy.js', function(err, stdout, stderr) {
        t.equal(1, err.code);
        t.equal("Usage: carmen-copy.js <from> <to>\n", stdout);
        t.end();
    });
});
tape('bin/carmen-copy 1arg', function(t) {
    exec(bin + '/carmen-copy.js ' + tmpindex, function(err, stdout, stderr) {
        t.equal(1, err.code);
        t.equal("Usage: carmen-copy.js <from> <to>\n", stdout);
        t.end();
    });
});
tape('bin/carmen-copy', function(t) {
    var dst = tmpdir + '/carmen-copy-test.mbtiles';
    exec(bin + '/carmen-copy.js ' + tmpindex + ' ' + dst, function(err, stdout, stderr) {
        t.ifError(err);
        t.equal(/Copying/.test(stdout), true);
        t.equal(/Done\./.test(stdout), true);
        t.equal(fs.statSync(dst).size > 20e3, true);
        t.equal(fs.unlinkSync(dst), undefined, 'cleanup');
        t.end();
    });
});
