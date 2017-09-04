const fs = require('fs');
const path = require('path');
const Stream = require('stream');
const split = require('split');
const Carmen = require('..');
const mem = require('../lib/api-mem');
const de = require('deep-equal');

const test = require('tape');

test('index - streaming interface', (t) => {
    function getIndex(start, end) {

        let count = 0;
        let inputStream = fs.createReadStream(path.resolve(__dirname, './fixtures/docs.jsonl'), { encoding: 'utf8' });
        let transformStream = new Stream.Transform();
        transformStream._transform = (data, encoding, done) => {
            if (data) {
                count ++;
            }
            if (count > start && count <= end) {
                transformStream.push(data+"\n");
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

    const memObjectA = new mem([], { use_normalization_cache: true, geocoder_tokens: {'South': 'S'}, maxzoom: 6, geocoder_languages: ['fa', 'zh'] }, () => {});
    const confA = {
        country : memObjectA
    };

    const carmenA = new Carmen(confA);
    const indexA = getIndex(0,100);
    t.test('index docs.json', (q) => {
        carmenA.index(indexA, confA.country, {
            zoom: 6,
            output: outputStream
        }, (err) => {
            q.ifError(err);
            q.end();
        });
    });
    t.test('ensure index was successful for index A', (q) => {
        carmenA.geocode("India", {}, (err, result) => {
            t.ifError(err, "error");
            t.equal(result.features[0].text, "India", "found India");
            q.end();
        });
    });
    t.test("can't find Turkmenistan, not in Index A", (q) => {
        carmenA.geocode("Turkmenistan", {}, (err, result) => {
            t.ifError(err, "error");
            t.equal(result.features.length, 0, "Can't find Turkmenistan");
            q.end();
        });
    });

    const memObjectB = new mem([], { use_normalization_cache: true, geocoder_tokens: {'South': 'S'}, maxzoom: 6, geocoder_languages: ['fa', 'zh'] }, () => {});
    const confB = {
        country: memObjectB
    };

    const carmenB = new Carmen(confB);
    const indexB = getIndex(100,200);
    t.test('index docs.json', (q) => {
        carmenB.index(indexB, confB.country, {
            zoom: 6,
            output: outputStream
        }, (err) => {
            q.ifError(err);
            q.end();
        });
    });
    t.test('ensure index was successful for index B', (q) => {
        carmenB.geocode("Paraguay", {}, (err, result) => {
            t.ifError(err, "error");
            t.equal(result.features[0].text, "Paraguay", "found Paraguay");
            q.end();
        });
    });
    t.test("can't find Nauru, not in index B", (q) => {
        carmenB.geocode("Nauru", {}, (err, result) => {
            t.ifError(err, "error");
            t.equal(result.features.length, 0, "can't find Nauru");
            q.end();
        });
    });

    const memObjectD = new mem([], { use_normalization_cache: true, geocoder_tokens: {'South': 'S'}, maxzoom: 6, geocoder_languages: ['fa', 'zh'] }, () => {});
    const confD = {
        country: memObjectD
    };

    const carmenD = new Carmen(confD);
    const indexD = getIndex(0,200);
    t.test('index docs.json', (q) => {
        carmenD.index(indexD, confD.country, {
            zoom: 6,
            output: outputStream
        }, (err) => {
            q.ifError(err);
            q.end();
        });
    });

    const memObjectC = new mem([], { use_normalization_cache: true, geocoder_tokens: {'South': 'S'}, maxzoom: 6, geocoder_languages: ['fa', 'zh'] }, () => {});
    const confC = { country: memObjectC };
    const carmenC = new Carmen(confC);

    t.test('merged indexes', (q) => {
        carmenC.merge(memObjectA, memObjectB, memObjectC, {}, (err) => {
            if (err) throw err;
            // the dictcache has been reloaded, so copy it over to the carmen object
            carmenC.indexes.country._dictcache = memObjectC._dictcache;
            console.log(carmenC.indexes.country._dictcache.normalizationCache);
            q.end();
        });
    });
    t.test('ensure index was successful for index A after merging', (q) => {
        carmenC.geocode("India", {}, (err, result) => {
            t.ifError(err, "error");
            t.equal(result.features[0].text, "India", "found India");
            q.end();
        });
    });
    t.test('ensure index was successful for index B after merging', (q) => {
        carmenC.geocode("Paraguay", {}, (err, result) => {
            t.ifError(err, "error");
            t.equal(result.features[0].text, "Paraguay", "found Paraguay");
            q.end();
        });
    });

    t.test('ensure total indexes in C is greater than A and B', (q) => {
        carmenA.analyze(memObjectA, (err, stats) => {
            let a = stats.total;
            carmenB.analyze(memObjectB, (err, stats) => {
                let b = stats.total;
                carmenC.analyze(memObjectC, (err, stats) => {
                    let c = stats.total;
                    t.ok((c > a && c > b), "ok");
                    q.end();
                });
            });
        });
    });

    t.test('ensure geocode of a term that occurs in both indexes produces the same results', (q) => {
        carmenC.geocode('Republic', {}, (err, resultC) => {
            t.ifError(err, "error");
            carmenD.geocode('Republic', {}, (err, resultD) => {
                t.ifError(err, "error");
                t.ok(de(resultC, resultD), 'geocoding "Republic" produces identical results in merged and complete index');
                q.end();
            });
        });
    });

    t.test('ensure merged index features and original features are identical', (q) => {
        let count = 0;
        for (let i = 1; i <= 200; i++) {
            count += de(memObjectC._shards.feature[i], memObjectD._shards.feature[i], "==") ? 1 : 0;
        }
        let percentage = (count/200)*100;
        t.ok(percentage == 100, "features are identical");
        q.end();
    });

    ["freq", "grid"].forEach((type) => {
        t.test('ensure merged index ' + type + ' and original ' + type + ' are 98 percent similar', (q) => {
            let stringify = (key) => {
                return key[0] + "-" + (key[1] ? key[1].map((k) => { return "" + k; }).sort().join("-") : "null");
            }
            let cSet = new Set(carmenC.indexes.country._geocoder[type].list().map(stringify));
            let dSet = new Set(carmenD.indexes.country._geocoder[type].list().map(stringify));
            let intersection = new Set(Array.from(cSet).filter((x) => { return dSet.has(x) }));
            let union = new Set(Array.from(cSet).concat(Array.from(dSet)));
            let percentage = 100 * intersection.size / (union.size);
            t.ok(percentage >= 97, type + ' matches > 97%: ' + percentage);

            q.end();
        });
    });

    t.test("normalizer comparison", (q) => {
        var cNormalizations = memObjectC._dictcache.normalizationCache.getAll().map(function(row) {
            return [
                memObjectC._dictcache.lookupCounts(row[0]).text,
                memObjectC._dictcache.lookupCounts(row[1]).text,
            ]
        });

        var dNormalizations = Array.from(memObjectD._dictcache.normalizationMap.keys()).sort().map((x) => { return [x, memObjectD._dictcache.normalizationMap.get(x)]; })

        t.deepEquals(cNormalizations, dNormalizations, "normalization maps match");

        q.end();
    })

    t.end();
});
