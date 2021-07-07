'use strict';
const tape = require('tape');
const routablePoints = require('../../../lib/geocoder/routablepoint.js');


// straight line
(() => {
    const testPrefix = 'routablePoints address on straight line: ';
    const feature = {
        id: 1,
        type: 'Feature',
        properties: {
            'carmen:addressnumber': [null, ['110', '112', '114']],
            'carmen:center': [1.111, 1.113],
            'carmen:types': ['address']
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [
                {
                    type: 'MultiLineString',
                    coordinates: [
                        [
                            [1.111, 1.11],
                            [1.112, 1.11],
                            [1.114, 1.11],
                            [1.118, 1.11],
                        ]
                    ]
                },
                {
                    type: 'MultiPoint',
                    coordinates: [[1.111, 1.111], [1.113, 1.111], [1.118, 1.111]]
                }
            ]
        }
    };

    tape(testPrefix + 'with actual address point', (assert) => {

        /**
         * Example point (x) feature point coords (.) and linestring coords (-) looks like:
         *
         * .   x   .
         * - - - - -
         */
        assert.deepEquals(
            routablePoints([1.113, 1.111], feature),
            {
                points: [{ coordinates: [1.113, 1.11] }]
            },
            'Actual address point on feature with interpolation linestring should find routable points'
        );
        assert.end();
    });

    tape(testPrefix + 'with point already on linestring', (assert) => {
        /**
         * Example point (x) feature point coords (.) and linestring coords (-) looks like:
         *
         * .   .   .
         * - - x - -
         */
        assert.deepEquals(
            routablePoints([1.111, 1.11], feature),
            {
                points: [{ coordinates: [1.111, 1.11] }]
            },
            'Point that is already on linestring should return itself'
        );
        assert.end();
    });

    tape(testPrefix + 'with point ???', (assert) => {

        /**
         * Example point (x) feature point coords (.) and linestring coords (-) looks like:
         *
         *     x
         * .   .   .
         * - -   - -
         */
        assert.deepEquals(
            routablePoints([1.113, 1.115], feature),
            {
                points: [{ coordinates: [1.113, 1.11] }]
            },
            'Point in between linestring coords should return midpoint between coords on linestring'
        );
        assert.end();
    });

    tape(testPrefix + 'with point not in the linestring', (assert) => {

        /**
         * Example point (x) feature point coords (.) and linestring coords (-) looks like:
         *
         *         x
         * .   .       .
         * - - - - - - -
         */
        assert.deepEquals(
            routablePoints([1.115, 1.115], feature),
            {
                points: [{ coordinates: [1.115, 1.11] }]
            },
            'Point not in the linestring should find routable point'
        );
        assert.end();
    });
})();

// zigzag line
(() => {
    const testPrefix = 'routablePoints address on ZigZag Line: ';
    const feature = {
        type: 'Feature',
        properties: {
            'carmen:addressnumber': [null, ['110', '112', '114']],
            'carmen:center': [1.111, 1.113],
            'carmen:types': ['address']
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [
                {
                    type: 'MultiLineString',
                    coordinates: [
                        [
                            [1.111, 1.11],
                            [1.112, 1.112],
                            [1.114, 1.11],
                            [1.118, 1.112]
                        ]
                    ]
                },
                {
                    type: 'MultiPoint',
                    coordinates: [[1.111, 1.111], [1.113, 1.112], [1.115, 1.111]]
                }
            ]
        },
        id: 1
    };

    tape(testPrefix + 'on a diagonal', (assert) => {

        /**
         * Example point (x) feature point coords (.) and linestring coords (-) looks like:
         *
         *          x
         *  .        .
         * /  \ /  \
         *     .
         */

        assert.deepEquals(
            routablePoints([1.116, 1.113], feature),
            {
                points: [{ coordinates: [1.1168, 1.1114] }]
            },
            'Point should be projected onto the diagonal linestring'
        );
        assert.end();
    });
})();

// |_| cul de sac street
(() => {
    const testPrefix = 'routablePoints address in cul de sac: ';
    const feature = {
        type: 'Feature',
        properties: {
            'carmen:addressnumber': [null, ['110', '112', '114']],
            'carmen:center': [1.111, 1.113],
            'carmen:types': ['address']
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [
                {
                    type: 'MultiLineString',
                    coordinates: [
                        [
                            [1.111, 1.112],
                            [1.111, 1.111],
                            [1.112, 1.111],
                            [1.112, 1.112]
                        ]
                    ]
                },
                {
                    type: 'MultiPoint',
                    coordinates: [[1.111, 1.112], [1.1115, 1.111], [1.1115, 1.112]]
                }
            ]
        },
        id: 1
    };

    tape(testPrefix + 'right in the middle of a cul de sac', (assert) => {

        /**
         * Example point (x) feature point coords (.) and linestring coords (-) looks like:
         *
         *  |         |
         *   <-- x
         *  | _ _ _ _ |
         */

        // in a case like this where either side of the cul de sac is equal distance from the point
        // expecting the projection to be on the side closest to the beginning of the line
        assert.deepEquals(
            routablePoints([1.1115, 1.1115], feature),
            {
                points: [{ coordinates: [1.111, 1.1115] }]
            },
            'Point projected to left side of the cul de sac line'
        );
        assert.end();
    });

    tape(testPrefix + 'off-center in the middle of a cul de sac', (assert) => {

        /**
         * Example point (x) feature point coords (.) and linestring coords (-) looks like:
         *
         *  |         |
         *        x -->
         *  | _ _ _ _ |
         */

        assert.deepEquals(
            routablePoints([1.1118, 1.1115], feature),
            {
                points: [{ coordinates: [1.112, 1.1115] }]
            },
            'point projected to the closer side of the cul de sac line'
        );
        assert.end();
    });

    tape(testPrefix + 'off-center in the middle of a cul de sac', (assert) => {

        /**
         * Example point (x) feature point coords (.) and linestring coords (-) looks like:
         *
         *  |         |
         *  |         |
         *  |      x  |
         *   _ _ _ _ _
         */

        assert.deepEquals(
            routablePoints([1.1118, 1.1112], feature),
            {
                points: [{ coordinates: [1.112, 1.1112] }]
            },
            'point projected to the side of the cul de sac line it is closest to'
        );
        assert.end();
    });
})();


// Input validation
(()=> {
    const testPrefix = 'routablePoints input validation: ';

    const pointObject = {
        type: 'Point',
        coordinates: [1.11, 1.11]
    };
    const feature = {
        id: 1,
        type: 'Feature',
        properties: {
            'carmen:addressnumber': [null, ['110', '112', '114']],
            'carmen:center': [1.111, 1.113],
            'carmen:types': ['address']
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [
                {
                    type: 'MultiLineString',
                    coordinates: [
                        [
                            [1.111, 1.11],
                            [1.112, 1.11],
                            [1.114, 1.11],
                            [1.118, 1.11],
                        ]
                    ]
                },
                {
                    type: 'MultiPoint',
                    coordinates: [[1.111, 1.111], [1.113, 1.111], [1.118, 1.111]]
                }
            ]
        }
    };


    const featureNoLinestring = {
        type: 'Feature',
        properties: {
            'carmen:types': ['address']
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [
                {
                    type: 'MultiPoint',
                    coordinates: [[1, 1]]
                }
            ]
        }
    };

    const featureNoGeometry = {
        type: 'Feature',
        properties: {
            'carmen:types': ['address']
        }
    };

    const featureSingleGeomLineString = {
        type: 'Feature',
        properties: {
            'carmen:types': ['address']
        },
        geometry: {
            type: 'LineString',
            coordinates: [[1, 1.11], [1, 1.13]]
        }
    };

    const featureSingleGeomMultiLineString = {
        type: 'Feature',
        properties: {
            'carmen:types': ['address']
        },
        geometry: {
            type: 'MultiLineString',
            coordinates: [
                [[1, 1.11], [1, 1.13]],
                [[1, 1.13], [0, 1.13]]
            ]
        }
    };

    const featureLineString = {
        type: 'Feature',
        properties: {
            'carmen:types': ['address']
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [
                {
                    type: 'LineString',
                    coordinates: [[1, 1.11], [1, 1.13]]
                }
            ]

        }
    };



    tape(testPrefix + 'point inputs', (assert) => {
        assert.deepEquals(
            routablePoints([], feature),
            null, // TODO should this return the whole routable_points object?
            'Empty point arrays should return null'
        );
        assert.deepEquals(
            routablePoints({}, feature),
            null, // TODO should this return the whole routable_points object?
            'Empty point objects should return null'
        );
        assert.ok(
            routablePoints(pointObject, feature),
            'Point objects should be accepted'
        );

        assert.ok(
            routablePoints([1, 1], feature),
            'Point arrays should be accepted'
        );
        assert.ok(
            routablePoints([0, 0], feature),
            '[0,0] should not necessarily return points: null'
        );
        assert.end();
    });

    tape(testPrefix + 'feature inputs', (assert) => {
        assert.deepEquals(
            routablePoints(pointObject),
            null, // TODO should this return the whole routable_points object?
            'Missing feature input should return points: null'
        );
        assert.deepEquals(
            routablePoints(pointObject, {}),
            null, // TODO should this return the whole routable_points object?
            'Empty feature input should return points: null'
        );
        assert.deepEquals(
            routablePoints(pointObject, featureNoGeometry),
            {
                points: null
            },
            'Features with no geometry should return points: null'
        );
        assert.deepEquals(
            routablePoints(pointObject, featureNoLinestring),
            {
                points: null
            },
            'Features with no linestrings should return points: null'
        );
        assert.deepEqual(
            routablePoints(pointObject, featureLineString),
            {
                points: [{ coordinates: [1, 1.11] }]
            },
            'Features with LineStrings, instead of MultiLineStrings, should also work'
        );
        assert.deepEquals(
            routablePoints(pointObject, featureSingleGeomLineString),
            {
                points: [{ coordinates: [1, 1.11] }]
            },
            'Features with single geometry, instead of geometry collections, with LineString, should work'
        );
        assert.deepEquals(
            routablePoints(pointObject, featureSingleGeomMultiLineString),
            {
                points: [{ coordinates: [1, 1.11] }]
            },
            'Features with single geometry, instead of geometry collections, with MultiLineString, should work'
        );
        assert.end();
    });
})();

// Test interpolated points
(() => {
    const feature = {
        id: '7654',
        type: 'Feature',
        properties: {
            'carmen:text': 'Main Street',
            'carmen:center': [-97.2, 37.3],
            'carmen:score': 99,
            'carmen:rangetype': 'tiger',
            'carmen:lfromhn': [['100']],
            'carmen:ltohn': [['200']],
            'carmen:rfromhn': [['101']],
            'carmen:rtohn': [['199']],
            'carmen:parityl': [['E']],
            'carmen:parityr': [['O']],
            'carmen:zxy': ['6/14/24'],
            'id': '7654',
            'carmen:types': ['address'],
            'carmen:index': 'address',
            'carmen:address': '150'
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: 'MultiLineString',
                coordinates: [
                    [
                        [-97.2, 37.2, 0],
                        [-97.2, 37.4, 0.19999999999999574]
                    ]
                ]
            }]
        }
    };

    const pointInterpolated = {
        type: 'Point',
        coordinates: [-97.2, 37.3],
        interpolated: true
    };
    tape('routablePoints input validation: interpolated point', (assert) => {
        assert.deepEquals(
            routablePoints(pointInterpolated, feature),
            {
                points: [{ coordinates: [-97.2, 37.3] }]
            },
            'Interpolated point inputs should return routable_point response with original coordinates as points'
        );
        assert.end();
    });
})();

// Test feature that already has routable_points
(() => {
    const featureroutablePoints = {
        id: 6666777777982370,
        type: 'Feature',
        properties: {
            'carmen:center': [-122.22083, 37.72139],
            'carmen:geocoder_stack': 'us',
            'carmen:score': 196,
            'landmark': true,
            'wikidata': 'Q1165584',
            'carmen:text_universal': 'OAK',
            'tel': '(510) 563-3300',
            'category': 'airport',
            'address': '1 Airport Dr',
            'carmen:text': 'Oakland International Airport,OAK,KOAK, Metropolitan Oakland International Airport, airport',
            'carmen:zxy': ['6/10/24'],
            'id': 6666777777982370,
            'carmen:types': ['poi'],
            'carmen:index': 'poi',
            'carmen:routable_points': [-122.213550, 37.712913]
        },
        geometry: {
            type: 'Point',
            coordinates: [-122.22083, 37.72139]
        }
    };
    const carmenOverride = featureroutablePoints.properties['carmen:routable_points'];
    // TODO: Confirm these assumpitons - Both what routable_points looks like on the feature,
    // and the expected result of routablePoints if so.
    tape('routablePoints input validation: feature containing routable_points', (assert) => {
        assert.deepEquals(
            routablePoints([-122, 37], featureroutablePoints, carmenOverride),
            {
                points: [{ coordinates: featureroutablePoints.properties['carmen:routable_points'] }]
            },
            'features that already have routable_points should return existing routable points'
        );
        assert.end();
    });
})();

// Test routablePoints with POI
tape('routablePoints input validation: POI feature', (assert) => {
    const feature = {
        id: 6666777777982370,
        type: 'Feature',
        properties: {
            'carmen:center': [-122.22083, 37.72139],
            'carmen:geocoder_stack': 'us',
            'carmen:score': 196,
            'landmark': true,
            'wikidata': 'Q1165584',
            'carmen:text_universal': 'OAK',
            'tel': '(510) 563-3300',
            'category': 'airport',
            'address': '1 Airport Dr',
            'carmen:text': 'Oakland International Airport,OAK,KOAK, Metropolitan Oakland International Airport, airport',
            'carmen:zxy': ['6/10/24'],
            'id': 6666777777982370,
            'carmen:types': ['poi'],
            'carmen:index': 'poi'
        },
        // This is slightly artificial since at this point in verifymatch, geometry actually gets stripped out for POIs
        geometry: {
            type: 'Point',
            coordinates: [-122.22083, 37.72139]
        }
    };

    assert.deepEquals(
        routablePoints(
            feature.properties['carmen:center'], feature),
        {
            points: null
        },
        'non-addresses should return null routable points'
    );
    assert.end();
});

