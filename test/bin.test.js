const fs = require('fs-extra');
const path = require('path');
const tape = require('tape');
const exec = require('child_process').exec;
const tmpdir = require('os').tmpdir();
const bin = path.resolve(path.join(__dirname, '..', 'scripts'));

const Carmen = require('../index.js');
const MBTiles = require('@mapbox/mbtiles');
const rand = Math.random()
    .toString(36)
    .substr(2, 5);
const tmpindex = path.join(tmpdir, 'test-carmen-index-' + rand + '.mbtiles');
const tmpindex2 = path.join(tmpdir, 'test-carmen-index2-' + rand + '.mbtiles');
const tmpindex3 = path.join(tmpdir, 'test-carmen-index3-' + rand + '.mbtiles');
const addFeature = require('../lib/util/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

tape('clean tmp index', t => {
    try {
        fs.unlinkSync(tmpindex);
        fs.removeSync(tmpindex.replace('.mbtiles', '.freq.rocksdb'));
        fs.removeSync(tmpindex.replace('.mbtiles', '.grid.rocksdb'));

        fs.unlinkSync(tmpindex2);
        fs.removeSync(tmpindex2.replace('.mbtiles', '.freq.rocksdb'));
        fs.removeSync(tmpindex2.replace('.mbtiles', '.grid.rocksdb'));

        fs.unlinkSync(tmpindex3);
        fs.removeSync(tmpindex3.replace('.mbtiles', '.freq.rocksdb'));
        fs.removeSync(tmpindex3.replace('.mbtiles', '.grid.rocksdb'));
    } catch (err) {
        //File does not exist
    } finally {
        t.end();
    }
});

tape('index', t => {
    try {
        fs.unlinkSync(tmpindex);
        fs.removeSync(tmpindex.replace('.mbtiles', '.freq.rocksdb'));
        fs.removeSync(tmpindex.replace('.mbtiles', '.grid.rocksdb'));
    } catch (err) {
        //'file not found'
    }
    const conf = { index: new MBTiles(tmpindex, () => {}) };
    const carmen = new Carmen(conf);
    carmen.on('open', start);
    function start(err) {
        t.ifError(err);
        conf.index.startWriting(write1);
    }
    function write1(err) {
        t.ifError(err);
        queueFeature(
            conf.index,
            {
                id: 38,
                properties: {
                    'carmen:text': 'Canada',
                    'carmen:text_en': 'Canada',
                    'carmen:text_es': 'Canadá',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0]
                }
            },
            write2
        );
    }
    function write2(err) {
        t.ifError(err);
        queueFeature(
            conf.index,
            {
                id: 39,
                properties: {
                    'carmen:text': 'Brazil',
                    'carmen:text_en': 'Brazil',
                    'carmen:text_es': 'Brasil',
                    'carmen:zxy': ['6/32/32'],
                    'carmen:center': [0, 0]
                }
            },
            store
        );
    }
    function store(err) {
        t.ifError(err);
        buildQueued(conf.index, stop);
    }
    function stop(err) {
        t.ifError(err);
        conf.index.stopWriting(t.end);
    }
});

tape('bin/carmen-index', t => {
    exec(bin + '/carmen-index.js', (err, stdout, stderr) => {
        t.ifError(err);
        t.equal(/\[options\]:/.test(stdout), true, 'finds help menu');
        t.end();
    });
});

tape('bin/carmen-index', t => {
    exec(bin + '/carmen-index.js --config="/tmp"', (err, stdout, stderr) => {
        t.ok(err);
        t.end();
    });
});

tape('bin/carmen-index', t => {
    exec(
        bin +
            '/carmen-index.js --config="' +
            __dirname +
            '/fixtures/index-bin-config.json" --tokens="' +
            __dirname +
            '/fixtures/tokens.json" --index="' +
            tmpindex2 +
            '" < ./test/fixtures/small-docs.jsonl',
        (err, stdout, stderr) => {
            t.ifError(err);
            t.end();
        }
    );
});

tape('bin/carmen-index', t => {
    exec(
        bin +
            '/carmen-index.js --config="' +
            __dirname +
            '/fixtures/index-bin-config.json" --tokens="' +
            __dirname +
            '/fixtures/tokens.js" --index="' +
            tmpindex3 +
            '" < ./test/fixtures/small-docs.jsonl',
        (err, stdout, stderr) => {
            t.ifError(err);
            t.end();
        }
    );
});

tape('bin/carmen DEBUG', t => {
    exec(
        bin + '/carmen.js ' + tmpindex + ' --query="canada" --debug="38"',
        (err, stdout, stderr) => {
            t.ifError(err);
            t.equal(/\d+\.\d+ Canada/.test(stdout), true, 'finds canada');
            t.ok(
                stdout.indexOf('PhraseMatch\n-----------') !== -1,
                'debug phrase match'
            );
            t.ok(
                stdout.indexOf('SpatialMatch\n------------') !== -1,
                'debug spatial'
            );
            t.ok(
                stdout.indexOf('spatialmatch position: 0') !== -1,
                'debug spatial'
            );
            t.ok(
                stdout.indexOf('VerifyMatch\n-----------') !== -1,
                'debug verify match'
            );
            t.ok(
                stdout.indexOf('verifymatch position: 0') !== -1,
                'debug verify match'
            );
            t.end();
        }
    );
});

tape('bin/carmen', t => {
    exec(bin + '/carmen.js', (err, stdout, stderr) => {
        t.equal(1, err.code);
        t.equal('Usage: carmen.js [file|dir] --query="<query>"\n', stdout);
        t.end();
    });
});
tape('bin/carmen version', t => {
    exec(bin + '/carmen.js --version', (err, stdout, stderr) => {
        t.error(err);
        t.ok(stdout.indexOf('carmen@') !== -1);
        t.end();
    });
});
tape('bin/carmen query', t => {
    exec(
        bin + '/carmen.js ' + tmpindex + ' --query=brazil',
        (err, stdout, stderr) => {
            t.ifError(err);
            t.equal(/\d+\.\d+ Brazil/.test(stdout), true, 'finds brazil');
            t.end();
        }
    );
});

tape('bin/carmen query w/ stats', t => {
    exec(
        bin + '/carmen.js ' + tmpindex + ' --query=brazil --stats',
        (err, stdout, stderr) => {
            t.ifError(err);
            const warmup_re = new RegExp(/warmup\:\s+(\d+)ms/);
            const phrasematch_re = new RegExp(/phrasematch\:\s+(\d+)ms/);
            const spatialmatch_re = new RegExp(/spatialmatch\:\s+(\d+)ms/);
            const verifymatch_re = new RegExp(/verifymatch\:\s+(\d+)ms/);
            const totaltime_re = new RegExp(/totaltime\:\s+(\d+)ms/);

            const warmup_match = warmup_re.exec(stdout);
            const phrasematch_match = phrasematch_re.exec(stdout);
            const spatialmatch_match = spatialmatch_re.exec(stdout);
            const verifymatch_match = verifymatch_re.exec(stdout);
            const totaltime_match = totaltime_re.exec(stdout);

            t.ok(
                warmup_match[1] < 3600000,
                'ensure load stat is an elapsed delta of less than an hour'
            );
            t.ok(
                phrasematch_match[1] < 3600000,
                'ensure phrasematch stat is an elapsed delta of less than an hour'
            );
            t.ok(
                spatialmatch_match[1] < 3600000,
                'ensure spatialmatch stat is an elapsed delta of less than an hour'
            );
            t.ok(
                verifymatch_match[1] < 3600000,
                'ensure verifymatch stat is an elapsed delta of less than an hour'
            );
            t.ok(
                totaltime_match[1] < 3600000,
                'ensure totaltime stat is an elapsed delta of less than an hour'
            );
            t.end();
        }
    );
});

//Index was not indexed witht the brazil=canada token so this should produce Canada as a result
tape('bin/carmen query w/ global tokens', t => {
    exec(
        bin +
            '/carmen.js ' +
            tmpindex +
            ' --query=brazil --tokens="' +
            __dirname +
            '/fixtures/tokens.json"',
        (err, stdout, stderr) => {
            t.ifError(err);
            t.equal(/\d+\.\d+ Canada/.test(stdout), true, 'finds canada');
            t.end();
        }
    );
});

tape('bin/carmen query types', t => {
    exec(
        bin +
            '/carmen.js ' +
            tmpindex +
            ' --query=brazil --types="test-carmen-index-' +
            rand +
            '"',
        (err, stdout, stderr) => {
            t.ifError(err);
            t.equal(/\d+\.\d+ Brazil/.test(stdout), true, 'finds brazil');
            t.end();
        }
    );
});
tape('bin/carmen query wrong types', t => {
    exec(
        bin + '/carmen.js ' + tmpindex + ' --query=brazil --types="not a type"',
        (err, stdout, stderr) => {
            t.ok(err, 'not a type');
            t.end();
        }
    );
});
tape('bin/carmen query wrong stacks', t => {
    exec(
        bin +
            '/carmen.js ' +
            tmpindex +
            ' --query=brazil --stacks="not a stack"',
        (err, stdout, stderr) => {
            t.ok(err, 'not a stack');
            t.end();
        }
    );
});
tape('bin/carmen query language=es', t => {
    exec(
        bin + '/carmen.js ' + tmpindex + ' --query=brazil --language="es"',
        (err, stdout, stderr) => {
            t.ifError(err);
            t.equal(/\d+\.\d+ Brasil/.test(stdout), true, 'finds brasil');
            t.end();
        }
    );
});
tape('bin/carmen query language=es,en', t => {
    exec(
        bin + '/carmen.js ' + tmpindex + ' --query=brazil --language="es,en"',
        (err, stdout, stderr) => {
            t.ifError(err);
            t.equal(/\d+\.\d+ Brasil/.test(stdout), true, 'finds brasil');
            t.end();
        }
    );
});
tape('bin/carmen-copy noargs', t => {
    exec(bin + '/carmen-copy.js', (err, stdout, stderr) => {
        t.equal(1, err.code);
        t.equal('Usage: carmen-copy.js <from> <to>\n', stdout);
        t.end();
    });
});
tape('bin/carmen-copy 1arg', t => {
    exec(bin + '/carmen-copy.js ' + tmpindex, (err, stdout, stderr) => {
        t.equal(1, err.code);
        t.equal('Usage: carmen-copy.js <from> <to>\n', stdout);
        t.end();
    });
});
tape('bin/carmen-copy', t => {
    const dst = tmpdir + '/carmen-copy-test-' + rand + '.mbtiles';
    exec(
        bin + '/carmen-copy.js ' + tmpindex + ' ' + dst,
        (err, stdout, stderr) => {
            t.ifError(err);
            t.equal(/Copying/.test(stdout), true);
            t.equal(/Done\./.test(stdout), true);
            t.equal(fs.statSync(dst).size > 20e3, true);
            t.equal(fs.unlinkSync(dst), undefined, 'cleanup');
            t.end();
        }
    );
});
