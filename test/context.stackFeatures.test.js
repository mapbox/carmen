const context = require('../lib/context');
const tape = require('tape');

tape('context.stackFeatures noop', t => {
    t.deepEqual(context.stackFeatures({}, [], {}), [], '0 features => []');
    t.end();
});

tape('context.stackFeatures simple', t => {
    const geocoderStub = {
        indexes: {
            country: { type: 'country' },
            region: { type: 'region' }
        }
    };
    const loaded = [
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['country'],
                'carmen:extid': 'country.1'
            }
        },
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['region'],
                'carmen:extid': 'region.1'
            }
        }
    ];
    t.deepEqual(
        context.stackFeatures(geocoderStub, loaded.slice(0), {}),
        [loaded[1], loaded[0]],
        '2 features stacked'
    );
    t.end();
});

tape('context.stackFeatures type bump', t => {
    const geocoderStub = {
        indexes: {
            country: { type: 'country' }
        }
    };
    const loaded = [
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['country'],
                'carmen:extid': 'country.1'
            }
        },
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['country'],
                'carmen:extid': 'country.2'
            }
        }
    ];
    t.deepEqual(
        context.stackFeatures(geocoderStub, loaded.slice(0), {}),
        [loaded[0]],
        '1 feature stacked, 1 bumped'
    );
    t.end();
});

tape('context.stackFeatures conflict', t => {
    const geocoderStub = {
        indexes: {
            place: { type: 'place' },
            address: { type: 'address' }
        }
    };
    const loaded = [
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['place'],
                'carmen:extid': 'place.1'
            }
        },
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['address'],
                'carmen:extid': 'address.1'
            }
        },
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['poi'],
                'carmen:conflict': 'address',
                'carmen:extid': 'poi.1'
            }
        }
    ];
    t.deepEqual(
        context.stackFeatures(geocoderStub, loaded.slice(0), {}),
        [loaded[1], loaded[0]],
        '2 features stacked, 1 bumped'
    );
    t.end();
});

tape('context.stackFeatures conflict, dist tiebreak', t => {
    const geocoderStub = {
        indexes: {
            place: { type: 'place' },
            address: { type: 'address' }
        }
    };
    const loaded = [
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['place'],
                'carmen:extid': 'place.1'
            }
        },
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['address'],
                'carmen:extid': 'address.1',
                'carmen:vtquerydist': 10
            }
        },
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['poi'],
                'carmen:conflict': 'address',
                'carmen:extid': 'poi.1',
                'carmen:vtquerydist': 1
            }
        }
    ];
    t.deepEqual(
        context.stackFeatures(geocoderStub, loaded.slice(0), {}),
        [loaded[2], loaded[0]],
        '2 features stacked, 1 bumped, conflict priorities nearest feature'
    );
    t.end();
});

tape('context.stackFeatures multitype', t => {
    const geocoderStub = {
        indexes: {
            region: { type: 'region' },
            place: { type: 'place' }
        }
    };
    const loaded = [
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['region', 'place'],
                'carmen:extid': 'region.1'
            }
        }
    ];
    const stacked = context.stackFeatures(geocoderStub, loaded.slice(0), {});
    t.deepEqual(stacked, [loaded[0]], '1 feature stacked, promoted');
    t.deepEqual(
        stacked[0].properties['carmen:extid'],
        'place.1',
        'alters extid'
    );
    t.end();
});

tape('context.stackFeatures multitype, gap', t => {
    const geocoderStub = {
        indexes: {
            region: { type: 'region' },
            place: { type: 'place' },
            poi: { type: 'poi' }
        }
    };
    const loaded = [
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['region', 'place'],
                'carmen:extid': 'region.1'
            }
        },
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['poi'],
                'carmen:extid': 'poi.1'
            }
        }
    ];
    const stacked = context.stackFeatures(geocoderStub, loaded.slice(0), {});
    t.deepEqual(
        stacked,
        [loaded[1], loaded[0]],
        '2 features stacked, 1 promoted'
    );
    t.deepEqual(stacked[0].properties['carmen:extid'], 'poi.1');
    t.deepEqual(stacked[1].properties['carmen:extid'], 'place.1');
    t.end();
});

tape('context.stackFeatures multitype, nogap', t => {
    const geocoderStub = {
        indexes: {
            region: { type: 'region' },
            place: { type: 'place' },
            poi: { type: 'poi' }
        }
    };
    const loaded = [
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['region', 'place'],
                'carmen:extid': 'region.1',
                'carmen:geomtype': 3
            }
        },
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['place'],
                'carmen:extid': 'place.1',
                'carmen:geomtype': 3
            }
        },
        {
            type: 'Feature',
            properties: {
                'carmen:types': ['poi'],
                'carmen:extid': 'poi.1'
            }
        }
    ];
    const stacked = context.stackFeatures(geocoderStub, loaded.slice(0), {});
    t.deepEqual(
        stacked,
        [loaded[2], loaded[1], loaded[0]],
        '3 features stacked'
    );
    t.deepEqual(stacked[0].properties['carmen:extid'], 'poi.1');
    t.deepEqual(stacked[1].properties['carmen:extid'], 'place.1');
    t.deepEqual(stacked[2].properties['carmen:extid'], 'region.1');
    t.end();
});
