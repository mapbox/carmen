'use strict';
// Alphanumeric and hyphenated housenumbers

const tape = require('tape');
const Carmen = require('../..');
const context = require('../../lib/geocoder/context');
const mem = require('../../lib/sources/api-mem');
const addFeature = require('../../lib/indexer/addfeature'),
    queueFeature = addFeature.queueFeature,
    buildQueued = addFeature.buildQueued;

/*
 * Perform a reverse geocode with a street segment that looks like
 * (. is pt addr. -- is itp addr)
 *
 *      . . . . . . . .
 *      ------------------------------------
 *                                  x
 * We want to prioritze returning a '.' where it is sensible
 * But in this case it's pretty far away so we should return --
 * even though the feature has '.'s
*/

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index alphanum address', (t) => {
        const address = {
            id: 1,
            properties: {
                'carmen:text': 'Vandwellers Paradise',
                'carmen:center': [-95.4114122, 29.8119148],
                'carmen:zxy': ['6/15/26'],
                'carmen:addressnumber': [['100'], null],
                'carmen:rangetype': 'tiger',
                'carmen:parityl': [null, ['O', 'O']],
                'carmen:lfromhn': [null, [1,  11]],
                'carmen:ltohn': [null,   [9,  19]],
                'carmen:parityr': [null, ['E', 'E']],
                'carmen:rfromhn': [null, [2,  10]],
                'carmen:rtohn': [null,   [8,  18]]
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [{
                    type: 'MultiPoint',
                    coordinates: [
                        [-95.41416764259338,29.812134548414665]
                    ]
                },{
                    type: 'MultiLineString',
                    coordinates: [[
                        [-95.41481137275696, 29.81182735147623],
                        [-95.41242957115172, 29.81191113255303]
                    ],[
                        [-95.42544364929198, 29.81085920949646],
                        [-95.42282581329346, 29.810896445899782]
                    ]]
                }]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });
    tape('test address index for alphanumerics', (t) => {
        c.geocode('-95.42578,29.810561', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '10 Vandwellers Paradise', 'Matched ITP');
            t.equals(res.features[0].relevance, 1);
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index icelandic address', (t) => {
        const address = {
            'id':149515339584354,
            'type':'Feature',
            'properties':{
                'carmen:text':'Grundarstræti',
                'carmen:addressnumber':[null,[3,1,2]],
                'carmen:parityl':[['O',null],null],
                'carmen:lfromhn':[['1',null],null],
                'carmen:ltohn':[['3',null],null],
                'carmen:parityr':[[null,'E'],null],
                'carmen:rfromhn':[[null,'2'],null],
                'carmen:rtohn':[[null,'2'],null],
                'carmen:center':[-22.992654,66.025387],
                'carmen:rangetype':'tiger',
                'carmen:geocoder_stack':'is'
            },
            'geometry':{
                'type':'GeometryCollection',
                'geometries':[{
                    'type':'MultiLineString',
                    'coordinates':[[[-22.991535,66.026408],[-22.992236,66.025768],[-22.992654,66.025387],[-22.992876,66.025237],[-22.992987,66.02504],[-22.992954,66.024872],[-22.992753,66.024728],[-22.992217,66.024552]],[[-22.990338,66.026095],[-22.99048,66.026126],[-22.990757,66.026186],[-22.990825,66.0262],[-22.991063,66.026251],[-22.991535,66.026408]]]
                },{
                    'type':'MultiPoint',
                    'coordinates':[[-22.991473,66.025805],[-22.991589,66.025982],[-22.990171,66.026953]]
                }]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });
    tape('test address index for Grundarstraeti', (t) => {
        c.geocode('3 Grundarstraeti', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '3 Grundarstræti', 'Matched ITP');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });
    tape('test address index for Grundarstræti', (t) => {
        c.geocode('3 Grundarstræti', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '3 Grundarstræti', 'Matched ITP');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });
})();

/**
 * We promise that the returned address property is a string, regardless of input at index
 * time or the ability to cast it to an integer. IE both 100 and 100a should be returned
 * as a string for consistency.
 */
(() => {
    const conf = {
        address: new mem({ maxzoom: 6, geocoder_address: 1 }, () => {})
    };
    const c = new Carmen(conf);
    tape('index numeric address feature', (t) => {
        const address = {
            'id':149515339584354,
            'type':'Feature',
            'properties':{
                'carmen:text':'Grundarstræti',
                'carmen:addressnumber':[null,[3,1,2]],
                'carmen:parityl':[['O',null],null],
                'carmen:lfromhn':[['1',null],null],
                'carmen:ltohn':[['3',null],null],
                'carmen:parityr':[[null,'E'],null],
                'carmen:rfromhn':[[null,'2'],null],
                'carmen:rtohn':[[null,'2'],null],
                'carmen:center':[-22.992654,66.025387],
                'carmen:rangetype':'tiger',
                'carmen:geocoder_stack':'is'
            },
            'geometry':{
                'type':'GeometryCollection',
                'geometries':[{
                    'type':'MultiLineString',
                    'coordinates':[[[-22.991535,66.026408],[-22.992236,66.025768],[-22.992654,66.025387],[-22.992876,66.025237],[-22.992987,66.02504],[-22.992954,66.024872],[-22.992753,66.024728],[-22.992217,66.024552]],[[-22.990338,66.026095],[-22.99048,66.026126],[-22.990757,66.026186],[-22.990825,66.0262],[-22.991063,66.026251],[-22.991535,66.026408]]]
                },{
                    'type':'MultiPoint',
                    'coordinates':[[-22.991473,66.025805],[-22.991589,66.025982],[-22.990171,66.026953]]
                }]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });
    tape('Ensure string address is returned', (t) => {
        c.geocode('-22.991473,66.025805', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '3 Grundarstræti', 'Matched ITP');
            t.equals(res.features[0].address, '3', 'Returned string address');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });
})();

(() => {
    const conf = {
        address: new mem({
            maxzoom: 6,
            geocoder_address: 1,
            geocoder_tokens: {
                '(.+)stra(?:ß|ss)e':'$1 str',
                'strasse': 'str',
                'straße':'str'
            }
        }, () => {})
    };
    const c = new Carmen(conf);
    tape('index german address', (t) => {
        const address = {
            'id':149515339584354,
            'type':'Feature',
            'properties':{
                'carmen:text':'Wilhelmstraße',
                'carmen:addressnumber':[null,[3,1,2]],
                'carmen:parityl':[['O',null],null],
                'carmen:lfromhn':[['1',null],null],
                'carmen:ltohn':[['3',null],null],
                'carmen:parityr':[[null,'E'],null],
                'carmen:rfromhn':[[null,'2'],null],
                'carmen:rtohn':[[null,'2'],null],
                'carmen:center':[-22.992654,66.025387],
                'carmen:rangetype':'tiger',
                'carmen:geocoder_stack':'de'
            },
            'geometry':{
                'type':'GeometryCollection',
                'geometries':[{
                    'type':'MultiLineString',
                    'coordinates':[[[-22.991535,66.026408],[-22.992236,66.025768],[-22.992654,66.025387],[-22.992876,66.025237],[-22.992987,66.02504],[-22.992954,66.024872],[-22.992753,66.024728],[-22.992217,66.024552]],[[-22.990338,66.026095],[-22.99048,66.026126],[-22.990757,66.026186],[-22.990825,66.0262],[-22.991063,66.026251],[-22.991535,66.026408]]]
                },{
                    'type':'MultiPoint',
                    'coordinates':[[-22.991473,66.025805],[-22.991589,66.025982],[-22.990171,66.026953]]
                }]
            }
        };
        queueFeature(conf.address, address, () => { buildQueued(conf.address, t.end); });
    });
    tape('test address index for Wilhelmstraße 3', (t) => {
        c.geocode('Wilhelmstraße 3', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '3 Wilhelmstraße', 'Matched  [num] [name-with-sharp-s]');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });
    tape('test address index for 3 Wilhelmstraße', (t) => {
        c.geocode('3 Wilhelmstraße', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '3 Wilhelmstraße', 'Matched [num] [name-with-sharp-s]');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });
    tape('test address index for Wilhelmstrasse 3', (t) => {
        c.geocode('Wilhelmstraße 3', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '3 Wilhelmstraße', 'Matched  [num] [name-with-double-s]');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });
    tape('test address index for Wilhelm strasse 3', (t) => {
        c.geocode('Wilhelm str 3', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '3 Wilhelmstraße', 'Matched  [num] [name] straße');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });
    tape('test address index for Wilhelm strasse 3', (t) => {
        c.geocode('Wilhelm str 3', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '3 Wilhelmstraße', 'Matched  [num] [name] strasse');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });
    tape('test address index for Wilhelm str 3', (t) => {
        c.geocode('Wilhelm str 3', null, (err, res) => {
            t.ifError(err);
            t.equals(res.features[0].place_name, '3 Wilhelmstraße', 'Matched  [num] [name] str');
            t.equals(res.features[0].relevance, 1.00);
            t.end();
        });
    });
})();

tape('teardown', (t) => {
    context.getTile.cache.reset();
    t.end();
});
