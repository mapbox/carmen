'use strict';
const verifymatch = require('../../../lib/geocoder/verifymatch');
const tape = require('tape');
const bigAddress = require('../../fixtures/bigaddress.json');

tape('verifymatch.sortFeature', (t) => {
    const input = [
        { id: 8, properties: { 'carmen:relevance': 0.99, 'carmen:spatialmatch': { relev: 0.9 }, 'carmen:address': null, 'carmen:scoredist': 4, 'carmen:position': 2 }, geometry: { omitted: true } },
        { id: 7, properties: { 'carmen:relevance': 0.99, 'carmen:spatialmatch': { relev: 0.9 }, 'carmen:address': null, 'carmen:scoredist': 4, 'carmen:position': 1 }, geometry: { omitted: true } },
        { id: 6, properties: { 'carmen:relevance': 0.99, 'carmen:spatialmatch': { relev: 0.9 }, 'carmen:address': null, 'carmen:scoredist': 4 }, geometry: { omitted: true } },
        { id: 5, properties: { 'carmen:relevance': 0.99, 'carmen:spatialmatch': { relev: 0.9 }, 'carmen:address': null, 'carmen:scoredist': 5 }, geometry: { omitted: true } },
        { id: 4, properties: { 'carmen:relevance': 0.99, 'carmen:spatialmatch': { relev: 0.9 }, 'carmen:address': null }, geometry: {} },
        { id: 3, properties: { 'carmen:relevance': 0.99, 'carmen:spatialmatch': { relev: 0.9 }, 'carmen:address': '26' } },
        { id: 2, properties: { 'carmen:relevance': 0.99, 'carmen:spatialmatch': { relev: 1.0 } } },
        { id: 1, properties: { 'carmen:relevance': 1.0 } }
    ];
    input.sort(verifymatch.sortFeature);
    t.deepEqual(input.map((f) => { return f.id; }), [1,2,3,4,5,6,7,8]);

    t.end();
});

tape('verifymatch.sortContext', (t) => {
    let c;
    const arr = [];

    c = [{ id: 11, properties: { 'carmen:relevance': 0.9, 'carmen:scoredist': 9, 'carmen:address': '26', 'carmen:addresspos': 1, 'carmen:position': 1 }, geometry: { interpolated: true, omitted: true } }];
    c._relevance = 0.9;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 10, properties: { 'carmen:relevance': 0.9, 'carmen:scoredist': 9, 'carmen:address': '26', 'carmen:addresspos': 1, 'carmen:position': 1 }, geometry: { interpolated: true, omitted: true } }];
    c._relevance = 0.9;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 9, properties: { 'carmen:relevance': 0.9, 'carmen:scoredist': 9, 'carmen:address': '26', 'carmen:addresspos': 1, 'carmen:position': 0 }, geometry: { interpolated: true, omitted: true } }];
    c._relevance = 0.9;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 8, properties: { 'carmen:relevance': 0.9, 'carmen:scoredist': 9, 'carmen:address': '26', 'carmen:addresspos': 1 }, geometry: { interpolated: true, omitted: true } }];
    c._relevance = 0.9;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 7, properties: { 'carmen:relevance': 0.9, 'carmen:scoredist': 9, 'carmen:address': '26', 'carmen:addresspos': 1 }, geometry: { interpolated: true } }];
    c._relevance = 0.9;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 6, properties: { 'carmen:relevance': 0.9, 'carmen:scoredist': 9, 'carmen:address': '26', 'carmen:addresspos': 1 }, geometry: {} }];
    c._relevance = 0.9;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 5, properties: { 'carmen:relevance': 0.9, 'carmen:scoredist': 9, 'carmen:address': '26', 'carmen:addresspos': 1, 'carmen:addressnumber': [] }, geometry: {} }];
    c._relevance = 0.9;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 4, properties: { 'carmen:relevance': 0.9, 'carmen:scoredist': 9, 'carmen:address': '26', 'carmen:addresspos': 0 }, geometry: {} }];
    c._relevance = 0.9;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 3, properties: { 'carmen:relevance': 0.9, 'carmen:scoredist': 9 }, geometry: {} }];
    c._relevance = 0.9;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 2, properties: { 'carmen:relevance': 0.9, 'carmen:scoredist': 10 }, geometry: {} }];
    c._relevance = 0.9;
    arr.push(c);

    c = [{ id: 1, properties: { 'carmen:relevance': 1.0 }, geometry: {} }];
    c._relevance = 0.9;
    arr.push(c);

    c = [{ id: 0, properties: {}, geometry: {} }];
    c._relevance = 1.0;
    arr.push(c);

    arr.sort(verifymatch.sortContext);
    t.deepEqual(arr.map((c) => { return c[0].id; }), [0,1,2,3,4,5,6,7,8,9,10,11]);

    t.end();
});

tape('verifymatch.verifyFeatures', (t) => {
    const doc = bigAddress;
    const query = ['9', 'stationsplein'];
    const spatialmatches = [{ 'relev':1,'covers':[{ 'x':33,'y':21,'relev':1,'id':558998,'idx':0,'tmpid':558998,'distance':0,'score':19,'scoredist':19,'scorefactor':19,'matches_language':true,'prefix':true,'mask':3,'text':'# stationsplein','zoom':6 }] }];
    const geocoder = {
        byidx: {
            0: {
                geocoder_address: true
            }
        }
    };
    doc.properties['carmen:addressnumber'] = [doc.properties['carmen:addressnumber']];
    doc.geometry = {
        type: 'GeometryCollection',
        geometries: [
            doc.geometry
        ]
    };
    doc.properties['carmen:types'] = ['address'];
    const filtered = verifymatch.verifyFeatures(query, geocoder, spatialmatches, [doc], {});
    t.ok(filtered.length <= 10, 'limit dupe address numbers to 10');
    t.end();

});
