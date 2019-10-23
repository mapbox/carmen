'use strict';
const cluster = require('../../../lib/geocoder/addresscluster');
const test = require('tape');

test('forward: default property', (t) => {
    t.deepEqual(cluster.forward({
        type: 'Feature',
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300]]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1],[2,2],[3,3]]
            }]
        }
    }, 100), [{
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [1,1],
        },
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300]]
        }
    }], 'address property');

    t.end();
});

test('forward: default property - duplicate address in cluster', (t) => {
    t.deepEqual(cluster.forward({
        type: 'Feature',
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300, 100]]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1],[2,2],[3,3], [10, 10]]
            }]
        }
    }, 100), [{
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [1,1],
        },
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300, 100]]
        }
    },{
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [10,10],
        },
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300, 100]]
        }
    }], 'address property');

    t.end();
});

test('forward: override property', (t) => {
    t.deepEqual(cluster.forward({
        type: 'Feature',
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300]],
            'carmen:addressprops': {
                accuracy: {
                    1: 'point',
                    2: 'entrance'
                }
            }
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1],[2,2],[3,3]]
            }]
        }
    }, 300), [{
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [3,3],
        },
        properties: {
            accuracy: 'entrance',
            'carmen:addressnumber': [[100, 200, 300]],
            'carmen:addressprops': {
                accuracy: {
                    1: 'point',
                    2: 'entrance'
                }
            }
        }
    }], 'address property');

    t.end();
});

test('forward: override property - duplicate address in cluster', (t) => {
    t.deepEqual(cluster.forward({
        type: 'Feature',
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300, 300]],
            'carmen:addressprops': {
                accuracy: {
                    1: 'point',
                    2: 'entrance',
                    3: 'driveway'
                }
            }
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1],[2,2],[3,3],[4,4]]
            }]
        }
    }, 300), [{
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [3,3],
        },
        properties: {
            accuracy: 'entrance',
            'carmen:addressnumber': [[100, 200, 300, 300]],
            'carmen:addressprops': {
                accuracy: {
                    1: 'point',
                    2: 'entrance',
                    3: 'driveway'
                }
            }
        }
    },{
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [4,4],
        },
        properties: {
            accuracy: 'driveway',
            'carmen:addressnumber': [[100, 200, 300, 300]],
            'carmen:addressprops': {
                accuracy: {
                    1: 'point',
                    2: 'entrance',
                    3: 'driveway'
                }
            }
        }
    }], 'address property');

    t.end();
});

test('reverse: default property', (t) => {
    t.deepEqual(cluster.reverse({
        type: 'Feature',
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300]]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1],[2,2],[3,3]]
            }]
        }
    }, [1,1]), {
        type: 'Feature',
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300]],
            'carmen:address': 100
        },
        geometry: {
            type: 'Point',
            coordinates: [1, 1]
        }
    }, 'address property');

    t.end();
});

test('reverse: override property', (t) => {
    t.deepEqual(cluster.reverse({
        type: 'Feature',
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300]],
            'carmen:addressprops': {
                accuracy: {
                    1: 'point',
                    2: 'entrance'
                }
            }
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1],[2,2],[3,3]]
            }]
        }
    }, [2,2]), {
        type: 'Feature',
        properties: {
            accuracy: 'point',
            'carmen:addressnumber': [[100, 200, 300]],
            'carmen:addressprops': {
                accuracy: {
                    1: 'point',
                    2: 'entrance'
                }
            },
            'carmen:address': 200
        },
        geometry: {
            type: 'Point',
            coordinates: [2, 2]
        }
    }, 'address property');

    t.end();
});

test('getAddressStyle', (t) => {
    const standardStyle = 'standard';
    const queensStyle = 'queens';
    const defaultStyleFeature = {
        type: 'Feature',
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300]],
            'carmen:addressprops': {
            }
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1],[2,2],[3,3]]
            }]
        }
    };
    const standardStyleFeature = {
        type: 'Feature',
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300]],
            'carmen:address_style': standardStyle,
            'carmen:addressprops': {
                'carmen:address_style': {
                }
            }
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1],[2,2],[3,3]]
            }]
        }
    };
    const queensStyleFeature = {
        type: 'Feature',
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300]],
            'carmen:address_style': queensStyle,
            'carmen:addressprops': {
                'carmen:address_style': {
                    1: standardStyle,
                    '2': 'invalid'
                }
            }
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1],[2,2],[3,3]]
            }]
        }
    };
    const invalidStyleFeature = {
        type: 'Feature',
        properties: {
            accuracy: 'building',
            'carmen:addressnumber': [[100, 200, 300]],
            'carmen:address_style': 'invalid'
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiPoint',
                coordinates: [[1,1],[2,2],[3,3]]
            }]
        }
    };
    t.deepEqual(
        cluster.getAddressStyle(defaultStyleFeature, 0),
        standardStyle,
        'Default to standard'
    );
    t.deepEqual(
        cluster.getAddressStyle(standardStyleFeature, 0),
        standardStyle,
        'Specified standard'
    );
    t.deepEqual(
        cluster.getAddressStyle(queensStyleFeature, 0),
        queensStyle,
        'Specified queens'
    );
    t.deepEqual(
        cluster.getAddressStyle(invalidStyleFeature, 0),
        standardStyle,
        'Unrecognized defaults to standard'
    );
    t.deepEqual(
        cluster.getAddressStyle(queensStyleFeature, 1),
        standardStyle,
        'Override feature default'
    );
    t.deepEqual(
        cluster.getAddressStyle(queensStyleFeature, 2),
        standardStyle,
        'Unrecognized defaults to standard'
    );
    t.end();
});

