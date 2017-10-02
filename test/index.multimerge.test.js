const fs = require('fs');
const path = require('path');
const Stream = require('stream');
const split = require('split');
const Carmen = require('..');
const mem = require('../lib/api-mem');
const de = require('deep-equal');
const queue = require('d3-queue').queue;

const test = require('tape');
const merge = require('../lib/merge');

const randomMBtiles = () => {
    return (
        '/tmp/' +
        (new Date().getTime() + Math.random()).toString().replace('.', '_') +
        '.mbtiles'
    );
};

test('index - streaming interface', t => {
    function getIndex(start, end) {
        let count = 0;
        let inputStream = fs.createReadStream(
            path.resolve(__dirname, './fixtures/docs.jsonl'),
            { encoding: 'utf8' }
        );
        let transformStream = new Stream.Transform();
        transformStream._transform = (data, encoding, done) => {
            if (data) {
                count++;
            }
            if (count > start && count <= end) {
                transformStream.push(data + '\n');
            }
            done();
        };
        inputStream.pipe(split()).pipe(transformStream);
        return transformStream;
    }

    let outputStream = new Stream.Writable();
    outputStream._write = (chunk, encoding, done) => {
        let doc = JSON.parse(chunk.toString());

        //Only print on error or else the logs are super long
        if (!doc.id) t.ok(doc.id, 'has id: ' + doc.id);
        done();
    };

    let files = {
        A: randomMBtiles(),
        B1: randomMBtiles(),
        B2: randomMBtiles()
    };
    const carmens = {},
        confs = {};
    t.test('open carmens', t => {
        const q = queue();
        Object.keys(files).forEach(key => {
            q.defer((key, callback) => {
                merge.getOutputConf(
                    files[key],
                    { maxzoom: 6, geocoder_languages: ['zh'] },
                    _oc => {
                        confs[key] = { country: _oc.to };
                        carmens[key] = new Carmen(confs[key]);
                        callback();
                    }
                );
            }, key);
        });
        q.awaitAll(err => {
            t.ifError(err);
            t.end();
        });
    });

    const chunks = {
        A: getIndex(0, 100),
        B1: getIndex(100, 150),
        B2: getIndex(150, 200)
    };
    Object.keys(chunks).forEach(key => {
        t.test('index docs.json chunk ' + key, t => {
            carmens[key].index(
                chunks[key],
                confs[key].country,
                {
                    zoom: 6,
                    output: outputStream
                },
                err => {
                    t.ifError(err);
                    t.end();
                }
            );
        });
    });

    const memObjectD = new mem(
        [],
        { maxzoom: 6, geocoder_languages: ['zh'] },
        () => {}
    );
    confs.D = {
        country: memObjectD
    };

    carmens.D = new Carmen(confs.D);
    t.test('index docs.json in its entirety', q => {
        carmens.D.index(
            getIndex(0, 200),
            confs.D.country,
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

    t.test('multi-way merged indexes', q => {
        files.C = randomMBtiles();
        merge.multimerge(
            [files.A, files.B1, files.B2],
            files.C,
            { maxzoom: 6, geocoder_languages: ['zh'] },
            err => {
                if (err) throw err;

                const auto = Carmen.auto(files.C, () => {
                    const conf = {
                        country: auto
                    };
                    confs.C = conf;
                    carmens.C = new Carmen(conf);
                    q.end();
                });
            }
        );
    });
    t.test('ensure index was successful for index A after merging', q => {
        carmens.C.geocode('India', {}, (err, result) => {
            t.ifError(err, 'error');
            t.equal(result.features[0].text, 'India', 'found India');
            q.end();
        });
    });
    t.test('ensure index was successful for index B1 after merging', q => {
        carmens.C.geocode('Paraguay', {}, (err, result) => {
            t.ifError(err, 'error');
            t.equal(result.features[0].text, 'Paraguay', 'found Paraguay');
            q.end();
        });
    });
    t.test('ensure index was successful for index B2 after merging', q => {
        carmens.C.geocode('Palau', {}, (err, result) => {
            t.ifError(err, 'error');
            t.equal(result.features[0].text, 'Palau', 'found Palau');
            q.end();
        });
    });

    t.test(
        'ensure geocode of a term that occurs in both indexes produces the same results',
        q => {
            carmens.C.geocode('Republic', {}, (err, resultC) => {
                t.ifError(err, 'error');
                carmens.D.geocode('Republic', {}, (err, resultD) => {
                    t.ifError(err, 'error');
                    t.ok(
                        de(resultC, resultD),
                        'geocoding "Republic" produces identical results in merged and complete index'
                    );
                    q.end();
                });
            });
        }
    );

    t.test('clean up', t => {
        Object.keys(files).forEach(key => {
            fs.unlinkSync(files[key]);
        });
        t.end();
    });

    t.end();
});
