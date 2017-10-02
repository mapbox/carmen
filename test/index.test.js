const fs = require('fs');
const path = require('path');
const Stream = require('stream');
const Carmen = require('..');
const index = require('../lib/index');
const indexdocs = require('../lib/indexer/indexdocs.js');
const mem = require('../lib/api-mem');
const token = require('../lib/util/token');

const UPDATE = process.env.UPDATE;
const test = require('tape');
const termops = require('../lib/util/termops');

test('index - streaming interface', t => {
    const inputStream = fs.createReadStream(
        path.resolve(__dirname, './fixtures/small-docs.jsonl'),
        { encoding: 'utf8' }
    );

    const outputStream = new Stream.Writable();
    outputStream._write = (chunk, encoding, done) => {
        let doc = JSON.parse(chunk.toString());

        //Only print on error or else the logs are super long
        if (!doc.id) t.ok(doc.id, 'has id: ' + doc.id);
        done();
    };

    const conf = {
        to: new mem([], null, () => {})
    };

    const carmen = new Carmen(conf);
    t.test('index docs.json', q => {
        carmen.index(
            inputStream,
            conf.to,
            {
                zoom: 6,
                output: outputStream
            },
            err => {
                q.ifError(err);
                q.end();
            }
        );
    });
    t.test('ensure index was successful', q => {
        carmen.analyze(conf.to, (err, stats) => {
            q.ifError(err);
            // Updates the mem-analyze.json fixture on disk.
            if (UPDATE)
                fs.writeFileSync(
                    __dirname + '/fixtures/mem-analyze-small.json',
                    JSON.stringify(stats, null, 4)
                );
            q.deepEqual(require('./fixtures/mem-analyze-small.json'), stats);
            q.end();
        });
    });
    t.end();
});

test('index.generateStats', t => {
    let docs = [
        {
            type: 'Feature',
            properties: {
                'carmen:text': 'main street',
                'carmen:score': 2
            },
            geometry: {}
        },
        {
            type: 'Feature',
            properties: {
                'carmen:text': 'Main Road',
                'carmen:score': 1
            },
            geometry: {}
        }
    ];
    let geocoder_tokens = token.createReplacer({ street: 'st', road: 'rd' });
    t.deepEqual(indexdocs.generateFrequency(docs, {}), {
        __COUNT__: [4],
        __MAX__: [2],
        main: [2],
        road: [1],
        street: [1]
    });
    // @TODO should 'main' in this case collapse down to 2?
    t.deepEqual(indexdocs.generateFrequency(docs, geocoder_tokens), {
        __COUNT__: [8],
        __MAX__: [2],
        main: [4],
        rd: [1],
        st: [1],
        street: [1],
        road: [1]
    });
    t.end();
});

test('index.update -- error', t => {
    const memdocs = require('./fixtures/mem-docs.json');
    const conf = { to: new mem(memdocs, null, () => {}) };
    const carmen = new Carmen(conf);
    t.ok(carmen);
    t.test('update 1', q => {
        index.update(
            conf.to,
            [
                {
                    id: 1,
                    type: 'Feature',
                    properties: {
                        'carmen:text': 'main st',
                        'carmen:score': 10,
                        'carmen:center': [0, 0]
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [0, 0]
                    }
                }
            ],
            { zoom: 6 },
            err => {
                q.ifError(err);
                q.deepEqual(conf.to._geocoder.freq.get('__COUNT__'), [2]);
                q.deepEqual(conf.to._geocoder.freq.get('__MAX__'), [10]);
                q.end();
            }
        );
    });
    t.test('update 2', q => {
        index.update(
            conf.to,
            [
                {
                    id: 1,
                    type: 'Feature',
                    properties: {
                        'carmen:text': 'main st',
                        'carmen:score': 0,
                        'carmen:center': [0, 0]
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [0, 0]
                    }
                }
            ],
            { zoom: 6 },
            err => {
                q.ifError(err);
                q.deepEqual(conf.to._geocoder.freq.get('__COUNT__'), [4]);
                q.deepEqual(conf.to._geocoder.freq.get('__MAX__'), [10]);
                q.end();
            }
        );
    });
    t.end();
});

test('index.update freq', t => {
    const conf = { to: new mem(null, () => {}) };
    const carmen = new Carmen(conf);
    t.ok(carmen);
    t.test('error no id', q => {
        index.update(
            conf.to,
            [{ type: 'Point', properties: { 'carmen:text': 'main st' } }],
            { zoom: 6 },
            err => {
                q.equal(err.toString(), 'Error: doc has no id');
                q.end();
            }
        );
    });
    t.test('error no carmen:center', q => {
        index.update(
            conf.to,
            [
                {
                    id: 1,
                    type: 'Feature',
                    properties: { 'carmen:text': 'main st' }
                }
            ],
            { zoom: 6 },
            err => {
                q.equal(
                    err.toString(),
                    'Error: "geometry" member required on id:1'
                );
                q.end();
            }
        );
    });
    t.test('indexes single doc', q => {
        index.update(
            conf.to,
            [
                {
                    id: 1,
                    type: 'Feature',
                    properties: {
                        'carmen:text': 'main st',
                        'carmen:center': [0, 0]
                    },
                    geometry: { type: 'Point', coordinates: [0, 0] }
                }
            ],
            { zoom: 6 },
            err => {
                q.ifError(err);
                q.end();
            }
        );
    });
    t.test('indexes doc with geometry and no carmen:center', q => {
        let doc = {
            id: 1,
            type: 'Feature',
            properties: { 'carmen:text': 'main st' },
            geometry: { type: 'Point', coordinates: [-75.598211, 38.367333] }
        };
        index.update(conf.to, [doc], { zoom: 6 }, (err, res, too) => {
            q.ok(doc.properties['carmen:center'], 'carmen:center has been set');
            q.end();
        });
    });
    t.test('indexes doc with geometry and carmen:center', q => {
        index.update(
            conf.to,
            [
                {
                    id: 1,
                    type: 'Feature',
                    properties: {
                        'carmen:text': 'main st',
                        'carmen:center': [-75.598211, 38.367333]
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [-75.598211, 38.367333]
                    }
                }
            ],
            { zoom: 6 },
            err => {
                q.ifError(err);
                q.end();
            }
        );
    });
    t.end();
});

test('index', t => {
    const inputStream = fs.createReadStream(
        path.resolve(__dirname, './fixtures/docs.jsonl'),
        { encoding: 'utf8' }
    );

    const outputStream = new Stream.Writable();
    outputStream._write = (chunk, encoding, done) => {
        let doc = JSON.parse(chunk.toString());

        //Only print on error or else the logs are super long
        if (!doc.id) t.ok(doc.id, 'has id: ' + doc.id);
        done();
    };

    const memdocs = require('./fixtures/mem-docs.json');
    const conf = {
        to: new mem(
            memdocs,
            { maxzoom: 6, geocoder_languages: ['zh', 'fa'] },
            () => {}
        )
    };

    const carmen = new Carmen(conf);

    t.test('indexes a document', q => {
        carmen.index(
            inputStream,
            conf.to,
            {
                zoom: 6,
                output: outputStream
            },
            err => {
                q.ifError(err);
                // Updates the mem.json fixture on disk.
                let memJson =
                    __dirname +
                    '/fixtures/mem-' +
                    conf.to._dictcache.properties.type +
                    '.json';
                if (UPDATE)
                    fs.writeFileSync(
                        memJson,
                        JSON.stringify(conf.to.serialize(), null, 4)
                    );
                q.equal(
                    JSON.stringify(conf.to.serialize()).length,
                    JSON.stringify(require(memJson)).length
                );
                q.end();
            }
        );
    });
    t.test('analyzes index', q => {
        carmen.analyze(conf.to, (err, stats) => {
            q.ifError(err);
            // Updates the mem-analyze.json fixture on disk.
            if (UPDATE)
                fs.writeFileSync(
                    __dirname + '/fixtures/mem-analyze.json',
                    JSON.stringify(stats, null, 4)
                );
            q.deepEqual(require('./fixtures/mem-analyze.json'), stats);
            q.end();
        });
    });
    t.test('confirm that iterator works', q => {
        let monotonic = true;
        let output = [];
        let iterator = conf.to.geocoderDataIterator('freq');
        let next = (err, n) => {
            q.ifError(err);
            if (!n.done) {
                output.push(n.value.shard);
                if (output.length > 1) {
                    monotonic =
                        monotonic &&
                        output[output.length - 1] > output[output.length - 2];
                }
                iterator.asyncNext(next);
            } else {
                q.ok(monotonic, 'shard iterator produces sorted output');
                q.equal(output.length, 0, 'index has 0 shards');
                q.end();
            }
        };
        iterator.asyncNext(next);
    });
    t.end();
});

test('error -- zoom too high', t => {
    const inputStream = fs.createReadStream(
        path.resolve(__dirname, './fixtures/docs.jsonl'),
        { encoding: 'utf8' }
    );

    const outputStream = new Stream.Writable();
    outputStream._write = (chunk, encoding, done) => {
        let doc = JSON.parse(chunk.toString());

        //Only print on error or else the logs are super long
        if (!doc.id) t.ok(doc.id, 'has id: ' + doc.id);
        done();
    };

    const conf = {
        to: new mem([], null, () => {})
    };

    const carmen = new Carmen(conf);
    carmen.index(
        inputStream,
        conf.to,
        {
            zoom: 15,
            output: outputStream
        },
        err => {
            t.equal(
                'Error: zoom must be less than 15 --- zoom was 15',
                err.toString()
            );
            t.end();
        }
    );
});

test('error -- zoom too low', t => {
    const inputStream = fs.createReadStream(
        path.resolve(__dirname, './fixtures/docs.jsonl'),
        { encoding: 'utf8' }
    );

    const outputStream = new Stream.Writable();
    outputStream._write = (chunk, encoding, done) => {
        let doc = JSON.parse(chunk.toString());

        //Only print on error or else the logs are super long
        if (!doc.id) t.ok(doc.id, 'has id: ' + doc.id);
        done();
    };

    const conf = {
        to: new mem([], null, () => {})
    };
    const carmen = new Carmen(conf);
    carmen.index(
        inputStream,
        conf.to,
        {
            zoom: -1,
            output: outputStream
        },
        err => {
            t.equal(
                'Error: zoom must be greater than 0 --- zoom was -1',
                err.toString()
            );
            t.end();
        }
    );
});

test('index phrase collection', t => {
    const conf = { test: new mem(null, { maxzoom: 6 }, () => {}) };
    const c = new Carmen(conf);
    t.ok(c);
    let docs = [
        {
            id: 1,
            type: 'Feature',
            properties: {
                'carmen:text': 'a',
                'carmen:center': [0, 0]
            },
            geometry: {
                type: 'Point',
                coordinates: [0, 0]
            }
        },
        {
            id: 2,
            type: 'Feature',
            properties: {
                'carmen:text': 'a',
                'carmen:center': [0, 0]
            },
            geometry: {
                type: 'Point',
                coordinates: [0, 0]
            }
        }
    ];
    index.update(conf.test, docs, { zoom: 6 }, afterUpdate);
    function afterUpdate(err) {
        t.ifError(err);
        let id1 = termops.encodePhrase('a');
        t.deepEqual(
            conf.test._geocoder.grid.list(),
            [[id1.toString(), [0]]],
            '1 phrase'
        );
        t.deepEqual(
            conf.test._geocoder.grid.get(id1, [0]),
            [6755949230424066, 6755949230424065],
            'grid has 2 zxy+feature ids'
        );
        t.end();
    }
});

test('error -- _geometry too high resolution', t => {
    let docs = JSON.parse(
        fs.readFileSync(__dirname + '/fixtures/hugedoc.json')
    );

    const s = new Stream.Readable();
    s._read = function noop() {}; // redundant? see update below
    s.push(JSON.stringify(docs[0]) + '\n');
    s.push(null);

    let outputStream = new Stream.Writable();
    outputStream._write = (chunk, encoding, done) => {
        let doc = JSON.parse(chunk.toString());

        //Only print on error or else the logs are super long
        if (!doc.id) t.ok(doc.id, 'has id: ' + doc.id);
        done();
    };

    const conf = {
        to: new mem(docs, null, () => {})
    };

    const carmen = new Carmen(conf);
    carmen.index(
        s,
        conf.to,
        {
            zoom: 6,
            output: outputStream
        },
        err => {
            t.equal(
                'Error: Polygons may not have more than 50k vertices. Simplify your polygons, or split the polygon into multiple parts on id:1',
                err.toString()
            );
            t.end();
        }
    );
});

test('index.cleanDocs', t => {
    const sourceWithAddress = { geocoder_address: true };
    const sourceWithoutAddress = { geocoder_address: false };

    t.equal(
        typeof index.cleanDocs(sourceWithAddress, [{ geometry: {} }])[0]
            .geometry,
        'object',
        'with address: preserves geometry'
    );
    t.equal(
        typeof index.cleanDocs(sourceWithoutAddress, [{ geometry: {} }])[0]
            .geometry,
        'undefined',
        'without address: removes geometry'
    );
    t.equal(
        typeof index.cleanDocs(sourceWithAddress, [
            { geometry: {}, properties: { 'carmen:addressnumber': {} } }
        ])[0]._geometry,
        'undefined',
        'with carmen:addressnumber: preserves geometry'
    );
    t.end();
});
