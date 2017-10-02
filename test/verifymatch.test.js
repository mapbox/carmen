const verifymatch = require('../lib/verifymatch');
const tape = require('tape');

tape('verifymatch.sortFeature', t => {
    let arr = [
        {
            id: 7,
            properties: {
                'carmen:spatialmatch': { relev: 0.9 },
                'carmen:address': null
            }
        },
        {
            id: 6,
            properties: {
                'carmen:spatialmatch': { relev: 1.0 },
                'carmen:address': null
            }
        },
        {
            id: 5,
            properties: {
                'carmen:spatialmatch': { relev: 1.0 },
                'carmen:address': '26'
            },
            geometry: { omitted: true }
        },
        {
            id: 4,
            properties: {
                'carmen:spatialmatch': { relev: 1.0 },
                'carmen:address': '26',
                'carmen:scoredist': 2
            },
            geometry: {}
        },
        {
            id: 3,
            properties: {
                'carmen:spatialmatch': { relev: 1.0 },
                'carmen:address': '26',
                'carmen:scoredist': 3
            },
            geometry: {}
        },
        {
            id: 2,
            properties: {
                'carmen:spatialmatch': { relev: 1.0 },
                'carmen:address': '26',
                'carmen:scoredist': 4,
                'carmen:position': 2
            },
            geometry: {}
        },
        {
            id: 1,
            properties: {
                'carmen:spatialmatch': { relev: 1.0 },
                'carmen:address': '26',
                'carmen:scoredist': 5,
                'carmen:position': 1
            },
            geometry: {}
        }
    ];
    arr.sort(verifymatch.sortFeature);
    t.deepEqual(
        arr.map(f => {
            return f.id;
        }),
        [1, 2, 3, 4, 5, 6, 7]
    );

    t.end();
});

tape('verifymatch.sortContext (no distance)', t => {
    let c;
    let arr = [];

    c = [{ id: 10, properties: {} }];
    c._relevance = 0.9;
    arr.push(c);

    c = [{ id: 9, properties: { 'carmen:address': '26' } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [
        {
            id: 8,
            properties: { 'carmen:address': '26', 'carmen:addressnumber': [] },
            geometry: { omitted: true }
        }
    ];
    c._relevance = 1.0;
    arr.push(c);

    c = [
        {
            id: 7,
            properties: { 'carmen:address': '26', 'carmen:addressnumber': [] },
            geometry: {}
        }
    ];
    c._relevance = 1.0;
    arr.push(c);

    c = [
        {
            id: 6,
            properties: {
                'carmen:address': '26',
                'carmen:addressnumber': [],
                'carmen:scoredist': 1
            },
            geometry: {}
        }
    ];
    c._relevance = 1.0;
    arr.push(c);

    c = [
        {
            id: 5,
            properties: {
                'carmen:address': '26',
                'carmen:addressnumber': [],
                'carmen:scoredist': 2
            },
            _geometry: {}
        }
    ];
    c._relevance = 1.0;
    arr.push(c);

    c = [
        {
            id: 4,
            properties: {
                'carmen:address': '26',
                'carmen:addressnumber': [],
                'carmen:scoredist': 2
            },
            geometry: {}
        }
    ];
    c._relevance = 1.0;
    c._typeindex = 2;
    arr.push(c);

    c = [
        {
            id: 3,
            properties: {
                'carmen:address': '26',
                'carmen:addressnumber': [],
                'carmen:scoredist': 2
            },
            geometry: {}
        }
    ];
    c._relevance = 1.0;
    c._typeindex = 1;
    c._distance = 20;
    arr.push(c);

    c = [
        {
            id: 2,
            properties: {
                'carmen:address': '26',
                'carmen:addressnumber': [],
                'carmen:scoredist': 2
            },
            geometry: {}
        }
    ];
    c._relevance = 1.0;
    c._typeindex = 1;
    c._distance = 10;
    arr.push(c);

    c = [
        {
            id: 1,
            properties: {
                'carmen:address': '26',
                'carmen:addressnumber': [],
                'carmen:scoredist': 2,
                'carmen:position': 2
            },
            geometry: {}
        }
    ];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    c = [
        {
            id: 0,
            properties: {
                'carmen:address': '26',
                'carmen:addressnumber': [],
                'carmen:scoredist': 2,
                'carmen:position': 1
            },
            geometry: {}
        }
    ];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    arr.sort(verifymatch.sortContext);
    t.deepEqual(
        arr.map(c => {
            return c[0].id;
        }),
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    );

    t.end();
});

tape('verifymatch.sortContext (with distance)', t => {
    let c;
    let arr = [];

    c = [{ id: 6 }];
    c._relevance = 0.9;
    arr.push(c);

    c = [{ id: 5, properties: { 'carmen:address': '26' } }];
    c._relevance = 1.0;
    arr.push(c);

    c = [
        {
            id: 4,
            properties: { 'carmen:address': '26', 'carmen:addressnumber': [] },
            geometry: { omitted: true }
        }
    ];
    c._relevance = 1.0;
    arr.push(c);

    c = [
        {
            id: 3,
            properties: { 'carmen:address': '26', 'carmen:addressnumber': [] },
            geometry: {}
        }
    ];
    c._relevance = 1.0;
    c._typeindex = 2;
    arr.push(c);

    c = [
        {
            id: 2,
            properties: {
                'carmen:address': '26',
                'carmen:addressnumber': [],
                'carmen:scoredist': 1
            },
            geometry: {}
        }
    ];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    c = [
        {
            id: 1,
            properties: {
                'carmen:address': '26',
                'carmen:addressnumber': [],
                'carmen:scoredist': 2
            },
            geometry: {}
        }
    ];
    c._relevance = 1.0;
    c._typeindex = 1;
    arr.push(c);

    arr.sort(verifymatch.sortContext);
    t.deepEqual(
        arr.map(c => {
            return c[0].id;
        }),
        [1, 2, 3, 4, 5, 6]
    );

    t.end();
});

tape('verifymatch.sortContext (distance vs addresstype)', t => {
    let c;
    let arr = [];

    c = [{ id: 3 }];
    c._relevance = 0.9;
    arr.push(c);

    c = [
        {
            id: 2,
            properties: {
                'carmen:address': '26',
                'carmen:scoredist': 1,
                'carmen:addressnumber': []
            }
        }
    ];
    c._relevance = 1.0;
    arr.push(c);

    c = [
        { id: 1, properties: { 'carmen:address': '26', 'carmen:scoredist': 2 } }
    ];
    c._relevance = 1.0;
    arr.push(c);

    arr.sort(verifymatch.sortContext);
    t.deepEqual(
        arr.map(c => {
            return c[0].id;
        }),
        [1, 2, 3]
    );

    t.end();
});
