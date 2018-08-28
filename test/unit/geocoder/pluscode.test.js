'use strict';
const pluscode = require('../../../lib/geocoder/pluscode');
const test = require('tape');

test('pluscode - validity', (t) => {

    // Test data for validity tests.
    // Format of each array is: [code,isValid,isShort,isFull]

    const fixtures = [
        // Valid full codes:
        ['8FWC2345+G6',true,false,true],
        ['8FWC2345+G6G',true,false,true],
        ['8fwc2345+',true,false,true],
        ['8FWCX400+',true,false,true],

        // Valid short codes:
        ['WC2345+G6g',true,true,false],
        ['2345+G6',true,true,false],
        ['45+G6',true,true,false],
        ['+G6',true,true,false],

        // Invalid codes
        ['G+',false,false,false],
        ['+',false,false,false],
        ['8FWC2345+G',false,false,false],
        ['8FWC2_45+G6',false,false,false],
        ['8FWC2η45+G6',false,false,false],
        ['8FWC2345+G6+',false,false,false],
        ['8FWC2300+G6',false,false,false],
        ['WC2300+G6g',false,false,false],
        ['WC2345+G',false,false,false]
    ];

    for (const fixture of fixtures) {
        t.equals(pluscode.isValid(fixture[0]), fixture[1], `isValid('${fixture[0]}') should be ${fixture[1] ? 'true' : 'false'}`);
        t.equals(pluscode.isShort(fixture[0]), fixture[2], `isShort('${fixture[0]}') should be ${fixture[2] ? 'true' : 'false'}`);
        t.equals(pluscode.isFull(fixture[0]), fixture[3], `isFull('${fixture[0]}') should be ${fixture[3] ? 'true' : 'false'}`);
    }


    t.end();
});

test('pluscode - encoding/decode', (t) => {

    // Test data for encoding and decoding OpenLocationCodes
    // Format of each array is: [code,lat,lng,latLo,lngLo,latHi,lngHi]

    const fixtures = [
        ['7FG49Q00+',20.375,2.775,20.35,2.75,20.4,2.8],
        ['7FG49QCJ+2V',20.3700625,2.7821875,20.37,2.782125,20.370125,2.78225],
        ['7FG49QCJ+2VX',20.3701125,2.782234375,20.3701,2.78221875,20.370125,2.78225],
        ['7FG49QCJ+2VXGJ',20.3701135,2.78223535156,20.370113,2.782234375,20.370114,2.78223632813],
        ['8FVC2222+22',47.0000625,8.0000625,47.0,8.0,47.000125,8.000125],
        ['4VCPPQGP+Q9',-41.2730625,174.7859375,-41.273125,174.785875,-41.273,174.786],
        ['62G20000+',0.5,-179.5,0.0,-180.0,1,-179],
        ['22220000+',-89.5,-179.5,-90,-180,-89,-179],
        ['7FG40000+',20.5,2.5,20.0,2.0,21.0,3.0],
        ['22222222+22',-89.9999375,-179.9999375,-90.0,-180.0,-89.999875,-179.999875],
        ['6VGX0000+',0.5,179.5,0,179,1,180],
        ['6FH32222+222',1,1,1,1,1.000025,1.00003125],

        // Special cases over 90 latitude and 180 longitude
        ['CFX30000+',90,1,89,1,90,2],
        ['CFX30000+',92,1,89,1,90,2],
        ['62H20000+',1,180,1,-180,2,-179],
        ['62H30000+',1,181,1,-179,2,-178],
        ['CFX3X2X2+X2',90,1,89.9998750,1,90,1.0001250]
    ];

    for (const fixture of fixtures) {
        const encoded = pluscode.encode(fixture[1], fixture[2], fixture[0].length-1);
        const decoded = pluscode.decode(fixture[0]);

        t.equals(encoded, fixture[0]);

        t.ok((decoded.latitudeLo === fixture[3]) || Math.abs(decoded.latitudeLo - fixture[3]) <= 0.0000000001, `${fixture[0]} decoded latitudeLo within expected tol`)
        t.ok((decoded.longitudeLo === fixture[4]) || Math.abs(decoded.longitudeLo - fixture[4]) <= 0.0000000001, `${fixture[0]} decoded longitudeLo within expected tol`)

        t.ok((decoded.latitudeHi === fixture[5]) || Math.abs(decoded.latitudeHi - fixture[5]) <= 0.0000000001, `${fixture[0]} decoded latitudeHi within expected tol`)
        t.ok((decoded.longitudeHi === fixture[6]) || Math.abs(decoded.longitudeHi - fixture[6]) <= 0.0000000001, `${fixture[0]} decoded longitudeHi within expected tol`)
    }

    t.end();
});
