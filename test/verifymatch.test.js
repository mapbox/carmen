var verifymatch = require('../lib/verifymatch');
var tape = require('tape');

tape('verifymatch.dropFeature', function(t) {
    t.test('dropFeature source undefined', function(q) {
        var geocoder = {
            byidx: []
        };
        var options = {
            types: ['country']
        };
        var results = [
            [{ idx: 0 }]
        ];
        verifymatch.dropFeature(geocoder, options, results, function(err, res) {
            q.ok(err, 'throws source undefined for idx');
            q.notok(res, 'no results');
            q.end();
        });
    });

    t.test('dropFeature types', function(q) {
        var geocoder = {
            byidx: [
                {
                    type: 'country'
                },{
                    type: 'region'
                }
            ]
        };
        var options = {
            types: ['country']
        };
        var results = [
            [{ idx: 0, id: 0 }],
            [{ idx: 1, id: 1 }]
        ];
        var res = verifymatch.dropFeature(geocoder, options, results);
        t.equals(res.length, 1);
        t.equals(res[0][0].id, 0);
        q.end();
    });

    t.test('dropFeature stacks', function(q) {
        var geocoder = {
            byidx: [
                {
                    stack: ['ca']
                },
                {
                    stack: ['us']
                }
            ]
        };
        var options = {
            stacks: ['ca']
        };
        var results = [
            [{ idx: 0, id: 0 }],
            [{ idx: 1, id: 1 }]
        ];
        var res = verifymatch.dropFeature(geocoder, options, results);
        t.equals(res.length, 1);
        t.equals(res[0][0].id, 0);
        q.end()
    });

    t.test('dropFeature scoreAbove', function(q) {
        var geocoder = {
            byidx: [
                {
                    stack: ['ca']
                },
                {
                    stack: ['us']
                }
            ]
        };
        var options = {
            scoreAbove: 100
        };
        var results = [
            [{ idx: 0, id: 0, score: 200, scoreFactor:2 }],
            [{ idx: 1, id: 1, score: 0 }]
        ];
        var res = verifymatch.dropFeature(geocoder, options, results);
        t.equals(res.length, 1);
        t.equals(res[0][0].id, 0);
        q.end()
    });

    t.test('dropFeature scoreAbove', function(q) {
        var geocoder = {
            byidx: [
                {
                    stack: ['ca']
                },
                {
                    stack: ['us']
                }
            ]
        };
        var options = {
            scoreAbove: 100
        };
        var results = [
            [{ idx: 0, id: 0, score: 2, scoreFactor: 5 }],
            [{ idx: 1, id: 1, score: 5, scoreFactor: 3 }]
        ];
        var res = verifymatch.dropFeature(geocoder, options, results);
        t.equals(res.length, 1);
        t.equals(res[0][0].id, 1);
        q.end()
    });

    t.test('dropFeature types & stacks', function(q) {
        var geocoder = {
            byidx: [
                { stack: ['ca'], type: 'place' },
                { stack: ['us'], type: 'place' },
                { stack: ['zz'], type: 'other' }
            ]
        };
        var options = {
            stacks: ['zz'],
            types: ['place']
        };
        var results = [
            [{ idx: 0, id: 0 }],
            [{ idx: 1, id: 1 }],
            [{ idx: 2, id: 2 }]
        ];

        //Filter out all using type/stack
        var res = verifymatch.dropFeature(geocoder, options, results);
        t.equals(res.length, 0);

        geocoder = {
            byidx: [
                { stack: ['zz'], type: 'other' },
                { stack: ['us'], type: 'place' },
                { stack: ['zz'], type: 'place' }
            ]
        };
        //Filter out all but 1 using type/stack
        res = verifymatch.dropFeature(geocoder, options, results);
        t.equals(res.length, 1);
        t.equals(res[0][0].id, 2);

        geocoder = {
            byidx: [
                { stack: ['zz'], type: 'place' },
                { stack: ['zz'], type: 'place' },
                { stack: ['zz'], type: 'place' }
            ]
        };
        //Filter out non using type/stack
        res = verifymatch.dropFeature(geocoder, options, results);
        t.equals(res.length, 3);
        t.equals(res[0][0].id, 0);
        t.equals(res[1][0].id, 1);
        t.equals(res[2][0].id, 2);

        q.end()
    });

    t.end();
});

tape('verifymatch.sortFeature', function(assert) {
    var arr = [
        { id: 7, properties: { 'carmen:spatialmatch': { relev: 0.9 }, 'carmen:address': null } },
        { id: 6, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': null } },
        { id: 5, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26' }, geometry: { omitted: true } },
        { id: 4, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26', 'carmen:scoredist': 2 }, geometry: {} },
        { id: 3, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26', 'carmen:scoredist': 3 }, geometry: {} },
        { id: 2, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26', 'carmen:scoredist': 4, 'carmen:position': 2 }, geometry: {} },
        { id: 1, properties: { 'carmen:spatialmatch': { relev: 1.0 }, 'carmen:address': '26', 'carmen:scoredist': 5, 'carmen:position': 1 }, geometry: {} }
    ];
    arr.sort(verifymatch.sortFeature);
    assert.deepEqual(arr.map(function(f) { return f.id }), [1,2,3,4,5,6,7]);

    assert.end();
});

tape('verifymatch.sortContext (no distance)', function(assert) {
    var c;
    var arr = [];

    c = [{ id: 10, properties: {} }];
    c._relevance = 0.9;
    arr.push(c);

    c = [{ id: 9, properties: { 'carmen:address': '26' } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 8, properties: { 'carmen:address': '26', 'carmen:addressnumber': [] }, geometry: { omitted: true } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 7, properties: { 'carmen:address': '26', 'carmen:addressnumber': [] }, geometry: {} }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 6, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 1 }, geometry: {} }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 5, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 2 }, _geometry: {} }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 4, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 2 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 2;
    arr.push(c);

    c = [{ id: 3, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 2 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    c._distance = 20;
    arr.push(c);

    c = [{ id: 2, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 2 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    c._distance = 10;
    arr.push(c);

    c = [{ id: 1, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 2, 'carmen:position': 2 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 0, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 2, 'carmen:position': 1 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    arr.sort(verifymatch.sortContext);
    assert.deepEqual(arr.map(function(c) { return c[0].id }), [0,1,2,3,4,5,6,7,8,9,10]);

    assert.end();
});

tape('verifymatch.sortContext (with distance)', function(assert) {
    var c;
    var arr = [];

    c = [{ id: 6 }];
    c._relevance = 0.9;
    arr.push(c);

    c = [{ id: 5, properties: { 'carmen:address': '26' } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 4, properties: { 'carmen:address': '26', 'carmen:addressnumber': [] }, geometry: { omitted: true } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 3, properties: { 'carmen:address': '26', 'carmen:addressnumber': [] }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 2;
    arr.push(c);

    c = [{ id: 2, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 1 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    c = [{ id: 1, properties: { 'carmen:address': '26', 'carmen:addressnumber': [], 'carmen:scoredist': 2 }, geometry: {} }];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    arr.sort(verifymatch.sortContext);
    assert.deepEqual(arr.map(function(c) { return c[0].id }), [1,2,3,4,5,6]);

    assert.end();
});

tape('verifymatch.sortContext (distance vs addresstype)', function(assert) {
    var c;
    var arr = [];

    c = [{ id: 3 }];
    c._relevance = 0.9;
    arr.push(c);

    c = [{ id: 2, properties: { 'carmen:address': '26', 'carmen:scoredist': 1, 'carmen:addressnumber': [] } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [{ id: 1, properties: { 'carmen:address': '26', 'carmen:scoredist': 2 } }];
    c._relevance = 1.0;
    arr.push(c);

    arr.sort(verifymatch.sortContext);
    assert.deepEqual(arr.map(function(c) { return c[0].id }), [1,2,3]);

    assert.end();
});

