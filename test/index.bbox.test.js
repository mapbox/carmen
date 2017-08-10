const tape = require('tape');
const indexdocs = require('../lib/indexer/indexdocs.js');

tape('bbox is sane', (t) => {
    const res = indexdocs.standardize({
        id:1,
        type: 'Feature',
        properties: {
            'carmen:text':'USA',
            'carmen:zxy':['6/32/32'],
            'carmen:center':[0,0],
            'carmen:score': 1,
        },
        "geometry": {
            "type":"MultiPolygon",
            "coordinates":[[[[-140,25],[-65,25],[-65,50],[-140,50],[-140,25]]],[[[160,40],[170,40],[170,50],[160,50],[160,40]]]]}
      });
    const width = res.bbox[2] - res.bbox[0];
    t.ok(width < 180, "bbox is sane");
    t.end();
});
