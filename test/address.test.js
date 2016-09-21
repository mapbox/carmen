var address = require('../lib/pure/addressitp');
var addressCluster = require('../lib/pure/addresscluster.js');
var test = require('tape');

test('address.reverse - null ITP', function(assert) {
    assert.deepEquals(address.reverse({
        geometry: {
            type: 'MultiLineString'
        }
    }), false);

    assert.deepEqual(address.reverse(
        {
            id: 75018674165319,
            properties: {
                "carmen:center":[151.16541649214923,-33.93020039306708],
                "carmen:lfromhn": [[ null ]],
                "carmen:ltohn": [[ null ]],
                "carmen:parityl": [[ null ]],
                "carmen:parityr": [[ null ]],
                "carmen:rangetype":"tiger",
                "carmen:rfromhn": [[ null ]],
                "carmen:rtohn": [[ null ]],
                "carmen:text": "Link Road",
                "carmen:zxy":["14/15071/9835"],
                "carmen:extid":"address.14642155882791",
                "carmen:tmpid": 905972007
            },
            "geometry": {
                type: "GeometryCollection",
                geometries: [{
                    "type": "MultiLineString",
                    "coordinates": [ [ [ 151.16566753014922, -33.929532190798234 ], [ 151.16543367505074, -33.92981573230553 ], [ 151.16538212634623, -33.92999384067741 ], [ 151.16541649214923, -33.93020039306708 ], [ 151.16594002582133, -33.93236526842762 ], [ 151.1659766547382, -33.93249176960996 ], [ 151.16603415459394, -33.93255269039818 ], [ 151.16609844379127, -33.932585932545074 ], [ 151.16631478071213, -33.93257793495862 ], [ 151.16614806465805, -33.932624251405414 ], [ 151.16598704829812, -33.932640942010686 ], [ 151.16596475243568, -33.932633153061964 ], [ 151.16588294506073, -33.93260463994003 ], [ 151.16582066752017, -33.932524594514966 ], [ 151.16524072363973, -33.93022807244016 ], [ 151.1651679687202, -33.92990169172244 ], [ 151.16538212634623, -33.92999384067741 ] ] ]
                }]
            }
        }, [151.166296, -33.93218]),
        { geometry: { coordinates: [ 151.16590392952008, -33.9322160058351 ], type: 'Point' }, id: 75018674165319, properties: { 'carmen:center': [ 151.16541649214923, -33.93020039306708 ], 'carmen:extid': 'address.14642155882791', 'carmen:lfromhn': [ [ null ] ], 'carmen:ltohn': [ [ null ] ], 'carmen:parityl': [ [ null ] ], 'carmen:parityr': [ [ null ] ], 'carmen:rangetype': 'tiger', 'carmen:rfromhn': [ [ null ] ], 'carmen:rtohn': [ [ null ] ], 'carmen:text': 'Link Road', 'carmen:tmpid': 905972007, 'carmen:zxy': [ '14/15071/9835' ] } }
    );

    assert.end();
});

test('address.reverse', function(assert) {
    assert.deepEqual(address.reverse({
        id: 75018674165319,
        properties: {
            "carmen:center":[-77.031953,38.919952],
            "carmen:lfromhn":[["1618","2750","3000","3022","2900","1700","1624","","1600","2300","2800","2512","2400","2000","1924","1800","1820","2450","2100","2524","2500","1900","2700","2200","","1720","2600"]],
            "carmen:ltohn":[["1620","2798","3020","3098","2998","1718","1698","","1616","2398","2898","2522","2448","2098","1998","1818","1898","2498","2198","2598","2510","1922","2748","2298","","1798","2698"]],
            "carmen:parityl":[["E","E","E","E","E","E","E","","E","E","E","E","E","E","E","E","E","E","E","E","E","E","E","E","","E","E"]],
            "carmen:parityr":[["O","O","O","O","O","O","","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O"]],
            "carmen:rangetype":"tiger",
            "carmen:rfromhn":[["1623","2701","3001","3033","2851","1701","","2751","1601","2301","2801","2501","2351","2001","1921","1801","1825","2401","2101","2511","2427","1901","2651","2201","2565","1721","2601"]],
            "carmen:rtohn":[["1699","2749","3031","3099","2999","1719","","2799","1621","2349","2849","2509","2399","2099","1999","1823","1899","2425","2199","2563","2499","1919","2699","2299","2599","1799","2649"]],
            "carmen:text":"14th St NW",
            "abbrname":"14th St NW",
            "carmen:zxy":["14/4686/6266","14/4686/6265"],
            "carmen:extid":"addressitp.75018674165319",
            "carmen:tmpid":323909959
        },
        geometry: {
            "type": "GeometryCollection",
            "geometries": [{
                "type":"MultiLineString",
                "coordinates":[[[-77.031949,38.911868],[-77.031953,38.912606]],[[-77.032242,38.924756],[-77.03225,38.924827],[-77.032309,38.925424],[-77.032316,38.925502]],[[-77.032518,38.927538],[-77.03259,38.928533]],[[-77.03259,38.928533],[-77.032612,38.928805]],[[-77.032407,38.926573],[-77.032518,38.927538]],[[-77.031953,38.912606],[-77.031952,38.913349]],[[-77.031949,38.911868],[-77.031953,38.912606]],[[-77.032316,38.925502],[-77.032331,38.925652],[-77.032339,38.925742]],[[-77.031952,38.911129],[-77.031949,38.911868]],[[-77.031941,38.920064],[-77.031932,38.920106],[-77.031866,38.920322],[-77.031853,38.920416],[-77.031844,38.920511],[-77.031841,38.920556],[-77.03184,38.920601]],[[-77.032339,38.925742],[-77.032407,38.926573]],[[-77.03201,38.922428],[-77.032038,38.922686]],[[-77.03184,38.920601],[-77.031839,38.92064],[-77.031839,38.92068],[-77.031841,38.920756],[-77.031865,38.920998],[-77.031873,38.921086]],[[-77.031951,38.916998],[-77.031952,38.918112]],[[-77.031952,38.916289],[-77.031951,38.916372],[-77.031951,38.916998]],[[-77.031951,38.914094],[-77.031952,38.91418],[-77.031953,38.91448],[-77.031952,38.914831]],[[-77.031952,38.914831],[-77.031952,38.915262],[-77.031956,38.915568]],[[-77.031873,38.921086],[-77.03193,38.92166]],[[-77.031952,38.918112],[-77.031951,38.919185]],[[-77.032038,38.922686],[-77.032072,38.923012],[-77.032132,38.923635]],[[-77.03193,38.92166],[-77.032002,38.922342],[-77.03201,38.922428]],[[-77.031956,38.915568],[-77.031952,38.916289]],[[-77.03222,38.924541],[-77.032242,38.924756]],[[-77.031951,38.919185],[-77.031952,38.919267],[-77.031953,38.919952],[-77.031952,38.919976],[-77.031948,38.92002],[-77.031941,38.920064]],[[-77.032132,38.923635],[-77.032143,38.923763]],[[-77.031952,38.913349],[-77.031954,38.913703],[-77.031951,38.914094]],[[-77.032143,38.923763],[-77.032193,38.924284],[-77.03222,38.924541]]]
            }]
        }
    }, [-77.03210145235062,38.91391005208429]), { geometry: { coordinates: [ -77.03195250715466, 38.913897567510446 ], type: 'Point' }, id: 75018674165319, properties: { abbrname: '14th St NW', 'carmen:address': 1778, 'carmen:center': [ -77.031953, 38.919952 ], 'carmen:extid': 'addressitp.75018674165319', 'carmen:lfromhn': [ [ '1618', '2750', '3000', '3022', '2900', '1700', '1624', '', '1600', '2300', '2800', '2512', '2400', '2000', '1924', '1800', '1820', '2450', '2100', '2524', '2500', '1900', '2700', '2200', '', '1720', '2600' ] ], 'carmen:ltohn': [ [ '1620', '2798', '3020', '3098', '2998', '1718', '1698', '', '1616', '2398', '2898', '2522', '2448', '2098', '1998', '1818', '1898', '2498', '2198', '2598', '2510', '1922', '2748', '2298', '', '1798', '2698' ] ], 'carmen:parityl': [ [ 'E', 'E', 'E', 'E', 'E', 'E', 'E', '', 'E', 'E', 'E' , 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', '', 'E', 'E' ] ], 'carmen:parityr': [ [ 'O', 'O', 'O', 'O', 'O', 'O', '', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O' ] ], 'carmen:rangetype': 'tiger', 'carmen:rfromhn': [ [ '1623', '2701', '3001', '3033', '2851', '1701', '', '2751', '1601', '2301', '2801', '2501', '2351', '2001', '1921', '1801', '1825', '2401', '2101', '2511', '2427', '1901', '2651', '2201', '2565', '1721', '2601' ] ], 'carmen:rtohn': [ [ '1699', '2749', '3031', '3099', '2999', '1719', '', '2799', '1621', '2349', '2849', '2509', '2399', '2099', '1999', '1823', '1899', '2425', '2199', '2563', '2499', '1919', '2699', '2299', '2599', '1799', '2649' ] ], 'carmen:text': '14th St NW', 'carmen:tmpid': 323909959, 'carmen:zxy': [ '14/4686/6266', '14/4686/6265' ] } });

    assert.deepEqual(address.reverse({
        id: 75018674165319,
        properties: {
            "carmen:center": [-77.031953,38.919952],
            "carmen:lfromhn":["1618","2750","3000","3022","2900","1700","1624","","1600","2300","2800","2512","2400","2000","1924","1800","1820","2450","2100","2524","2500","1900","2700","2200","","1720","2600"],
            "carmen:ltohn":["1620","2798","3020","3098","2998","1718","1698","","1616","2398","2898","2522","2448","2098","1998","1818","1898","2498","2198","2598","2510","1922","2748","2298","","1798","2698"],
            "carmen:parityl":["E","E","E","E","E","E","E","","E","E","E","E","E","E","E","E","E","E","E","E","E","E","E","E","","E","E"],
            "carmen:parityr":["O","O","O","O","O","O","","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O"],
            "carmen:rangetype":"tiger",
            "carmen:rfromhn":["1623","2701","3001","3033","2851","1701","","2751","1601","2301","2801","2501","2351","2001","1921","1801","1825","2401","2101","2511","2427","1901","2651","2201","2565","1721","2601"],
            "carmen:rtohn":["1699","2749","3031","3099","2999","1719","","2799","1621","2349","2849","2509","2399","2099","1999","1823","1899","2425","2199","2563","2499","1919","2699","2299","2599","1799","2649"],
            "carmen:text":"14th St NW",
            "abbrname":"14th St NW",
            "carmen:zxy":["14/4686/6266","14/4686/6265"],
            "carmen:extid":"addressitp.75018674165319",
            "carmen:tmpid":323909959
        },
        geometry: { "type": "GeometryCollection", geometries: [{"type":"MultiLineString","coordinates":[[[-77.031949,38.911868],[-77.031953,38.912606]],[[-77.032242,38.924756],[-77.03225,38.924827],[-77.032309,38.925424],[-77.032316,38.925502]],[[-77.032518,38.927538],[-77.03259,38.928533]],[[-77.03259,38.928533],[-77.032612,38.928805]],[[-77.032407,38.926573],[-77.032518,38.927538]],[[-77.031953,38.912606],[-77.031952,38.913349]],[[-77.031949,38.911868],[-77.031953,38.912606]],[[-77.032316,38.925502],[-77.032331,38.925652],[-77.032339,38.925742]],[[-77.031952,38.911129],[-77.031949,38.911868]],[[-77.031941,38.920064],[-77.031932,38.920106],[-77.031866,38.920322],[-77.031853,38.920416],[-77.031844,38.920511],[-77.031841,38.920556],[-77.03184,38.920601]],[[-77.032339,38.925742],[-77.032407,38.926573]],[[-77.03201,38.922428],[-77.032038,38.922686]],[[-77.03184,38.920601],[-77.031839,38.92064],[-77.031839,38.92068],[-77.031841,38.920756],[-77.031865,38.920998],[-77.031873,38.921086]],[[-77.031951,38.916998],[-77.031952,38.918112]],[[-77.031952,38.916289],[-77.031951,38.916372],[-77.031951,38.916998]],[[-77.031951,38.914094],[-77.031952,38.91418],[-77.031953,38.91448],[-77.031952,38.914831]],[[-77.031952,38.914831],[-77.031952,38.915262],[-77.031956,38.915568]],[[-77.031873,38.921086],[-77.03193,38.92166]],[[-77.031952,38.918112],[-77.031951,38.919185]],[[-77.032038,38.922686],[-77.032072,38.923012],[-77.032132,38.923635]],[[-77.03193,38.92166],[-77.032002,38.922342],[-77.03201,38.922428]],[[-77.031956,38.915568],[-77.031952,38.916289]],[[-77.03222,38.924541],[-77.032242,38.924756]],[[-77.031951,38.919185],[-77.031952,38.919267],[-77.031953,38.919952],[-77.031952,38.919976],[-77.031948,38.92002],[-77.031941,38.920064]],[[-77.032132,38.923635],[-77.032143,38.923763]],[[-77.031952,38.913349],[-77.031954,38.913703],[-77.031951,38.914094]],[[-77.032143,38.923763],[-77.032193,38.924284],[-77.03222,38.924541]]]}]},
    }, [-77.03176885843277,38.913930922099354]
    ), { geometry: { coordinates: [ -77.03195235613184, 38.913917250817995 ], type: 'Point' }, id: 75018674165319, properties: { abbrname: '14th St NW', 'carmen:center': [ -77.031953, 38.919952 ], 'carmen:extid': 'addressitp.75018674165319', 'carmen:lfromhn': [ '1618', '2750', '3000', '3022', '2900', '1700', '1624', '', '1600', '2300', '2800', '2512', '2400', '2000', '1924', '1800', '1820', '2450', '2100', '2524', '2500', '1900', '2700', '2200', '', '1720', '2600' ], 'carmen:ltohn': [ '1620', '2798', '3020', '3098', '2998', '1718', '1698', '', '1616', '2398', '2898', '2522', '2448', '2098', '1998', '1818', '1898', '2498', '2198', '2598', '2510', '1922', '2748', '2298', '', '1798', '2698' ], 'carmen:parityl': [ 'E', 'E', 'E', 'E', 'E', 'E', 'E', '', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', '', 'E', 'E' ], 'carmen:parityr': [ 'O', 'O', 'O', 'O', 'O', 'O', '', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O', 'O' ], 'carmen:rangetype': 'tiger', 'carmen:rfromhn': [ '1623', '2701', '3001', '3033', '2851', '1701', '', '2751', '1601', '2301', '2801', '2501', '2351', '2001', '1921', '1801', '1825', '2401', '2101', '2511', '2427', '1901', '2651', '2201', '2565', '1721', '2601' ], 'carmen:rtohn': [ '1699', '2749', '3031', '3099', '2999', '1719', '', '2799', '1621', '2349', '2849', '2509', '2399', '2099', '1999', '1823', '1899', '2425', '2199', '2563', '2499', '1919', '2699', '2299', '2599', '1799', '2649' ], 'carmen:text': '14th St NW', 'carmen:tmpid': 323909959, 'carmen:zxy': [ '14/4686/6266', '14/4686/6265' ] } });
    assert.end();
});

test('address.matchSide', function(assert) {
    assert.deepEqual(address.matchSide(address.standardize({
        id: 75018674165319,
        properties: {
            "carmen:center":[-77.031953,38.919952],
            "carmen:lfromhn":[["1618","2750","3000","3022","2900","1700","1624","","1600","2300","2800","2512","2400","2000","1924","1800","1820","2450","2100","2524","2500","1900","2700","2200","","1720","2600"]],
            "carmen:ltohn":[["1620","2798","3020","3098","2998","1718","1698","","1616","2398","2898","2522","2448","2098","1998","1818","1898","2498","2198","2598","2510","1922","2748","2298","","1798","2698"]],
            "carmen:parityl":[["E","E","E","E","E","E","E","","E","E","E","E","E","E","E","E","E","E","E","E","E","E","E","E","","E","E"]],
            "carmen:parityr":[["O","O","O","O","O","O","","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O"]],
            "carmen:rangetype":"tiger",
            "carmen:rfromhn":[["1623","2701","3001","3033","2851","1701","","2751","1601","2301","2801","2501","2351","2001","1921","1801","1825","2401","2101","2511","2427","1901","2651","2201","2565","1721","2601"]],
            "carmen:rtohn":[["1699","2749","3031","3099","2999","1719","","2799","1621","2349","2849","2509","2399","2099","1999","1823","1899","2425","2199","2563","2499","1919","2699","2299","2599","1799","2649"]],
            "carmen:text":"14th St NW",
            "abbrname":"14th St NW",
            "carmen:zxy":["14/4686/6266","14/4686/6265"],
            "carmen:extid":"addressitp.75018674165319",
            "carmen:tmpid":323909959
        },
        geometry: { "type": "GeometryCollection", "geometries": [{"type":"MultiLineString","coordinates":[[[-77.031949,38.911868],[-77.031953,38.912606]],[[-77.032242,38.924756],[-77.03225,38.924827],[-77.032309,38.925424],[-77.032316,38.925502]],[[-77.032518,38.927538],[-77.03259,38.928533]],[[-77.03259,38.928533],[-77.032612,38.928805]],[[-77.032407,38.926573],[-77.032518,38.927538]],[[-77.031953,38.912606],[-77.031952,38.913349]],[[-77.031949,38.911868],[-77.031953,38.912606]],[[-77.032316,38.925502],[-77.032331,38.925652],[-77.032339,38.925742]],[[-77.031952,38.911129],[-77.031949,38.911868]],[[-77.031941,38.920064],[-77.031932,38.920106],[-77.031866,38.920322],[-77.031853,38.920416],[-77.031844,38.920511],[-77.031841,38.920556],[-77.03184,38.920601]],[[-77.032339,38.925742],[-77.032407,38.926573]],[[-77.03201,38.922428],[-77.032038,38.922686]],[[-77.03184,38.920601],[-77.031839,38.92064],[-77.031839,38.92068],[-77.031841,38.920756],[-77.031865,38.920998],[-77.031873,38.921086]],[[-77.031951,38.916998],[-77.031952,38.918112]],[[-77.031952,38.916289],[-77.031951,38.916372],[-77.031951,38.916998]],[[-77.031951,38.914094],[-77.031952,38.91418],[-77.031953,38.91448],[-77.031952,38.914831]],[[-77.031952,38.914831],[-77.031952,38.915262],[-77.031956,38.915568]],[[-77.031873,38.921086],[-77.03193,38.92166]],[[-77.031952,38.918112],[-77.031951,38.919185]],[[-77.032038,38.922686],[-77.032072,38.923012],[-77.032132,38.923635]],[[-77.03193,38.92166],[-77.032002,38.922342],[-77.03201,38.922428]],[[-77.031956,38.915568],[-77.031952,38.916289]],[[-77.03222,38.924541],[-77.032242,38.924756]],[[-77.031951,38.919185],[-77.031952,38.919267],[-77.031953,38.919952],[-77.031952,38.919976],[-77.031948,38.92002],[-77.031941,38.920064]],[[-77.032132,38.923635],[-77.032143,38.923763]],[[-77.031952,38.913349],[-77.031954,38.913703],[-77.031951,38.914094]],[[-77.032143,38.923763],[-77.032193,38.924284],[-77.03222,38.924541]]]}]},
    }, 0)[6], "right", {"lineDist":0.05149142157672657,"pt":{"type":"Feature","geometry":{"type":"Point","coordinates":[-77.03195179501776,38.913990382686116]},"properties":{"dist":0.003796989313476002,"travelled":0.04432977933096455,"index":1}},"startLine":{"type":"Feature","geometry":{"type":"Point","coordinates":[-77.031954,38.913703]},"properties":{}},"endLine":{"type":"Feature","geometry":{"type":"Point","coordinates":[-77.031951,38.914094]},"properties":{}},"i":6}), 1789, "Right Side Match");

    assert.deepEqual(address.matchSide(address.standardize({
        id: 75018674165319,
        properties: {
            "carmen:center":[-77.031953,38.919952],
            "carmen:lfromhn":[["1618","2750","3000","3022","2900","1700","1624","","1600","2300","2800","2512","2400","2000","1924","1800","1820","2450","2100","2524","2500","1900","2700","2200","","1720","2600"]],
            "carmen:ltohn":[["1620","2798","3020","3098","2998","1718","1698","","1616","2398","2898","2522","2448","2098","1998","1818","1898","2498","2198","2598","2510","1922","2748","2298","","1798","2698"]],
            "carmen:parityl":[["E","E","E","E","E","E","E","","E","E","E","E","E","E","E","E","E","E","E","E","E","E","E","E","","E","E"]],
            "carmen:parityr":[["O","O","O","O","O","O","","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O","O"]],
            "carmen:rangetype":"tiger",
            "carmen:rfromhn":[["1623","2701","3001","3033","2851","1701","","2751","1601","2301","2801","2501","2351","2001","1921","1801","1825","2401","2101","2511","2427","1901","2651","2201","2565","1721","2601"]],
            "carmen:rtohn":[["1699","2749","3031","3099","2999","1719","","2799","1621","2349","2849","2509","2399","2099","1999","1823","1899","2425","2199","2563","2499","1919","2699","2299","2599","1799","2649"]],
            "carmen:text":"14th St NW",
            "abbrname":"14th St NW",
            "carmen:zxy":["14/4686/6266","14/4686/6265"],
            "carmen:extid":"addressitp.75018674165319",
            "carmen:tmpid":323909959
        },
        geometry: { "type": "GeometryCollection", "geometries": [{"type":"MultiLineString","coordinates":[[[-77.031949,38.911868],[-77.031953,38.912606]],[[-77.032242,38.924756],[-77.03225,38.924827],[-77.032309,38.925424],[-77.032316,38.925502]],[[-77.032518,38.927538],[-77.03259,38.928533]],[[-77.03259,38.928533],[-77.032612,38.928805]],[[-77.032407,38.926573],[-77.032518,38.927538]],[[-77.031953,38.912606],[-77.031952,38.913349]],[[-77.031949,38.911868],[-77.031953,38.912606]],[[-77.032316,38.925502],[-77.032331,38.925652],[-77.032339,38.925742]],[[-77.031952,38.911129],[-77.031949,38.911868]],[[-77.031941,38.920064],[-77.031932,38.920106],[-77.031866,38.920322],[-77.031853,38.920416],[-77.031844,38.920511],[-77.031841,38.920556],[-77.03184,38.920601]],[[-77.032339,38.925742],[-77.032407,38.926573]],[[-77.03201,38.922428],[-77.032038,38.922686]],[[-77.03184,38.920601],[-77.031839,38.92064],[-77.031839,38.92068],[-77.031841,38.920756],[-77.031865,38.920998],[-77.031873,38.921086]],[[-77.031951,38.916998],[-77.031952,38.918112]],[[-77.031952,38.916289],[-77.031951,38.916372],[-77.031951,38.916998]],[[-77.031951,38.914094],[-77.031952,38.91418],[-77.031953,38.91448],[-77.031952,38.914831]],[[-77.031952,38.914831],[-77.031952,38.915262],[-77.031956,38.915568]],[[-77.031873,38.921086],[-77.03193,38.92166]],[[-77.031952,38.918112],[-77.031951,38.919185]],[[-77.032038,38.922686],[-77.032072,38.923012],[-77.032132,38.923635]],[[-77.03193,38.92166],[-77.032002,38.922342],[-77.03201,38.922428]],[[-77.031956,38.915568],[-77.031952,38.916289]],[[-77.03222,38.924541],[-77.032242,38.924756]],[[-77.031951,38.919185],[-77.031952,38.919267],[-77.031953,38.919952],[-77.031952,38.919976],[-77.031948,38.92002],[-77.031941,38.920064]],[[-77.032132,38.923635],[-77.032143,38.923763]],[[-77.031952,38.913349],[-77.031954,38.913703],[-77.031951,38.914094]],[[-77.032143,38.923763],[-77.032193,38.924284],[-77.03222,38.924541]]]}]}
    }, 0)[6], "left", {"lineDist":0.05149142157672657,"pt":{"type":"Feature","geometry":{"type":"Point","coordinates":[-77.03195250715466,38.913897567510446]},"properties":{"dist":0.008056283111657007,"travelled":0.03791474058649927,"index":1}},"startLine":{"type":"Feature","geometry":{"type":"Point","coordinates":[-77.031954,38.913703]},"properties":{}},"endLine":{"type":"Feature","geometry":{"type":"Point","coordinates":[-77.031951,38.914094]},"properties":{}}}), 1778, "Left Side Match");

    assert.end();
});

test('address.getReversePoint', function(assert) {
    //The most important part of these tests is that the distance travelled is correct
    //The actual point on the line returned can slightly vary

    //Patial route travelled
    assert.deepEqual(
        address.getReversePoint([-77.19932645559311,38.94770308373527], [[-77.19998091459274,38.9475549770314],[-77.19883829355238,38.94759461125006]], 'miles'),
        { endLine: { geometry: { coordinates: [ -77.19883829355238, 38.94759461125006 ], type: 'Point' }, properties: {}, type: 'Feature' }, lineDist: 0.06147950790879972, pt: { geometry: { coordinates: [ -77.19932038464033, 38.94757788890475 ], type: 'Point' }, properties: { dist: 0.008658996759104212, index: 0, travelled: 0.03554027081555206 }, type: 'Feature' }, startLine: { geometry: { coordinates: [ -77.19998091459274, 38.9475549770314 ], type: 'Point' }, properties: {}, type: 'Feature' } },
        "left centre side of line"
    );

    //Partial route travelled
    assert.deepEqual(
        address.getReversePoint([-77.1995061635971,38.94741938611567], [[-77.19998091459274,38.9475549770314],[-77.19883829355238,38.94759461125006]], 'miles'),
        { endLine: { geometry: { coordinates: [ -77.19883829355238, 38.94759461125006 ], type: 'Point' }, properties: {}, type: 'Feature' }, lineDist: 0.06147950790879972, pt: { geometry: { coordinates: [ -77.1995173939109, 38.947571055223044 ], type: 'Point' }, properties: { dist: 0.010499982934844238, index: 0, travelled: 0.024940051989783316 }, type: 'Feature' }, startLine: { geometry: { coordinates: [ -77.19998091459274, 38.9475549770314 ], type: 'Point' }, properties: {}, type: 'Feature' } },
        "right centre side of line");

    //No route Travelled
    assert.deepEqual(
        address.getReversePoint([-77.20057904720306,38.94761547135627], [[-77.19998091459274,38.9475549770314],[-77.19883829355238,38.94759461125006]], 'miles'),
        { endLine: { geometry: { coordinates: [ -77.19883829355238, 38.94759461125006 ], type: 'Point' }, properties: {}, type: 'Feature' }, lineDist: 0.06147950790879972, pt: { geometry: { coordinates: [ -77.19998091459274, 38.9475549770314 ], type: 'Point' }, properties: { dist: 0.03242169132910228, index: 0, travelled: 0 }, type: 'Feature' }, startLine: { geometry: { coordinates: [ -77.19998091459274, 38.9475549770314 ], type: 'Point' }, properties: {}, type: 'Feature' } },
        "before start of line");

    //Total route travelled
    assert.deepEqual(
        address.getReversePoint([-77.19858080148697,38.94759461125006], [[-77.19998091459274,38.9475549770314],[-77.19883829355238,38.94759461125006]], 'miles'),
        { endLine: { geometry: { coordinates: [ -77.19883829355238, 38.94759461125006 ], type: 'Point' }, properties: {}, type: 'Feature' }, lineDist: 0.06147950790879972, pt: { geometry: { coordinates: [ -77.19883829355238, 38.94759461125006 ], type: 'Point' }, properties: { dist: 0.013840773622621594, index: 0, travelled: 0.06147950790879972 }, type: 'Feature' }, startLine: { geometry: { coordinates: [ -77.19998091459274, 38.9475549770314 ], type: 'Point' }, properties: {}, type: 'Feature' } },
        "after end of line");

    assert.end();
});

test('address.lineIntersects', function(assert) {
    assert.deepEqual(address.lineIntersects(0, 0, 5, 5, 5, 0, 0, 5), [2.5, 2.5]);
    assert.equal(address.lineIntersects(0, 0, 0, 5, 5, 0, 5, 5), false);
    assert.end();
});

test('address.standardize', function(assert) {
    assert.deepEqual(address.standardize({ properties: { 'carmen:rangetype': 'canvec'} }), [], 'canvec rangetype');
    assert.deepEqual(address.standardize({ properties: { 'carmen:rangetype': 'tiger' } }), []), 'no geometry';
    assert.deepEqual(address.standardize({
        properties: {
            'carmen:rangetype': 'tiger',
        },
        geometry: {
            type: "Point" }
    }, 0), [], 'point');
    assert.deepEqual(address.standardize({
        properties: {
            'carmen:rangetype': 'tiger'
        },
        geometry: {
            type: "LineString",
            coordinates: [[1,2], [2,3]] }
    }, 0), [], 'linestring');
    assert.deepEqual(address.standardize({
        properties: {
            'carmen:rangetype': 'tiger'
        },
        geometry: {
            type: "GeometryCollection",
            geometries: [{
                type: "MultiLineString",
                coordinates: [[[1,2], [2,3]]]
            }]
        }
    }, 0), [{
        i: 0,
        lf: null,
        lt: null,
        rf: null,
        rt: null,
        lp: '',
        rp: '',
        lines: [[1,2], [2,3]]
    }], 'null GC');
    assert.deepEqual(address.standardize({
        properties: {
            'carmen:rangetype': 'tiger'
        },
        geometry: {
            type: "GeometryCollection",
            geometries: [{
                type: "MultiLineString",
                coordinates: [[[1,2], [2,3]], [[5,6], [8,10]]]
            }]
        }
    }, 0), [{
        i: 0,
        lf: null,
        lt: null,
        rf: null,
        rt: null,
        lp: '',
        rp: '',
        lines: [[1,2], [2,3]]
    }, {
        i: 1,
        lf: null,
        lt: null,
        rf: null,
        rt: null,
        lp: '',
        rp: '',
        lines: [[5,6], [8,10]]
    }], 'double null GC');
    assert.deepEqual(address.standardize({
        properties: {
            'carmen:rangetype': 'tiger',
            'carmen:parityl': [["E"]],
            'carmen:parityr': [["O"]],
            'carmen:ltohn': [[2]],
            'carmen:lfromhn': [[4]],
            'carmen:rtohn': [[1]],
            'carmen:rfromhn': [[3]]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: "MultiLineString",
                coordinates: [[[1,2], [2,3]]]
            }]
        }
    }, 0), [{
        i: 0,
        lf: 4,
        lt: 2,
        rf: 3,
        rt: 1,
        lp: 'E',
        rp: 'O',
        lines: [[1,2], [2,3]]
    }], 'single GC');
    assert.deepEqual(address.standardize({
        properties: {
            'carmen:rangetype': 'tiger',
            'carmen:parityl': [["E", "E"]],
            'carmen:parityr': [["O", "O"]],
            'carmen:ltohn': [[2, 6]],
            'carmen:lfromhn': [[4, 8]],
            'carmen:rtohn': [[1, 5]],
            'carmen:rfromhn': [[3, 7]]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type: "MultiLineString",
                coordinates: [[[1,2], [2,3]], [[5,6], [8,10]]]
            }]
        }
    }, 0), [{
        i: 0,
        lf: 4,
        lt: 2,
        rf: 3,
        rt: 1,
        lp: 'E',
        rp: 'O',
        lines: [[1,2], [2,3]]
    }, {
        i: 1,
        lf: 8,
        lt: 6,
        rf: 7,
        rt: 5,
        lp: 'E',
        rp: 'O',
        lines: [[5,6], [8,10]]
    }], 'double GC');
    assert.end();
});

test('address.det2D', function(assert) {
    assert.equal(address.det2D([0,0], [1,2], [3,4]), -2);
    assert.equal(address.det2D([0,0], [2,1], [-1,3]), 7);
    assert.equal(address.det2D([1,1], [0,1], [2,3]), -2);
    assert.equal(address.det2D([2,2], [0,-1], [-3,1]), -13);
    assert.end();
});

test('address.sign', function(assert) {
    assert.equal(address.sign(5), 1);
    assert.equal(address.sign(-5), -1);
    assert.equal(address.sign(0), 0);
    assert.end();
});

test('address.parseSemiNumber', function(assert) {
    assert.equal(address.parseSemiNumber('5'), 5);
    assert.equal(address.parseSemiNumber('5b'), 5);
    assert.equal(address.parseSemiNumber('asdf'), null);
    assert.end();
});

test('address.calculateDistance', function(assert) {
    assert.equal(address.calculateDistance([[0,0],[1,1]]), Math.sqrt(2));
    assert.equal(address.calculateDistance([[0,0],[0,0]]), 0);
    assert.end();
});

test('address.setPoint', function(assert) {
    assert.deepEqual(address.setPoint(2,0,8,[[0,0],[1,0]],false), {
        type: 'Point',
        interpolated: true,
        coordinates:[0.25,0]
    }, 'x2, forward');
    assert.deepEqual(address.setPoint(2,8,0,[[0,0],[1,0]],false), {
        type: 'Point',
        interpolated: true,
        coordinates:[0.75,0]
    }, 'x2, reverse');
    assert.deepEqual(address.setPoint(2,8,0,[[0,0],[0,0]],false), {
        type: 'Point',
        interpolated: true,
        coordinates:[0,0]
    }, 'x2, identity (line)');
    assert.deepEqual(address.setPoint(0,0,0,[[0,0],[1,0]],false), {
        type: 'Point',
        interpolated: true,
        coordinates:[0,0]
    }, 'x2, identity (address)');
    assert.deepEqual(address.setPoint(3,0,12,[[0,0],[1,0],[2,0]],false), {
        type: 'Point',
        interpolated: true,
        coordinates:[0.5,0]
    }, 'x3, forward');
    assert.deepEqual(address.setPoint(9,0,12,[[0,0],[1,0],[2,0]],false), {
        type: 'Point',
        interpolated: true,
        coordinates:[1.5,0]
    }, 'x3, reverse');
    assert.deepEqual(address.setPoint(9,0,12,[[0,0],[0,0],[0,0]],false), {
        type: 'Point',
        interpolated: true,
        coordinates:[0,0]
    }, 'x3, identity (line)');
    assert.deepEqual(address.setPoint(0,0,0,[[0,0],[1,0],[2,0]],false), {
        type: 'Point',
        interpolated: true,
        coordinates:[0,0]
    }, 'x3, identity (address)');
    assert.end();
});

test('address interpolation - noop', function(t) {
    t.deepEqual(false, address.forward({ properties: { 'carmen:rangetype': '' } }, 100));
    t.deepEqual(false, address.forward({ properties: { 'carmen:rangetype': 'tiger' } }, 100));
    t.deepEqual(false, address.forward({ properties: { 'carmen:rangetype': 'tiger' }, geometry: { type:'Point', coordinates:[-78,40] } }, 100));
    t.end();
});

test('address interpolation - parity: even + both', function(t) {
    t.deepEqual({
        type:'Point',
        interpolated: true,
        coordinates:[0,9]
    }, address.forward({
        properties: {
            'carmen:rangetype':'tiger',
            'carmen:lfromhn': [['0']],
            'carmen:ltohn': [['100']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type:'MultiLineString',
                coordinates: [[[0,0],[0,100]]]
            }]
        }
    }, 9));
    t.end();
});

test('address point clustering', function(t) {
    t.deepEqual(
        addressCluster.forward({
            properties: {
                'carmen:addressnumber': [9,10,7]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [ [1,1], [2,2], [0,0] ]
            }
        },9), false
    );
    t.deepEqual(
        addressCluster.forward({
            properties: {
                'carmen:addressnumber': [[9,10,7]]
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [{
                    type: 'MultiPoint',
                    coordinates: [ [1,1], [2,2], [0,0] ]
                }]
            }
        },9), {
            type:'Point',
            coordinates:[1,1]
        }
    );
    t.end();
});

test('reverse address point clustering', function(t) {
    t.deepEqual(
        addressCluster.reverse({
            properties: {
                'carmen:text': "test",
                'carmen:addressnumber': [9,10,7]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [ [1,3], [2,4], [0,1] ]
            }
        }, [1,3]), false);

    t.deepEqual(
        addressCluster.reverse({
            properties: {
                'carmen:text': "test",
                'carmen:addressnumber': [[9,10,7]]
            },
            geometry: {
                type: 'GeometryCollection',
                geometries: [{
                    type: 'MultiPoint',
                    coordinates: [ [1,3], [2,4], [0,1] ]
                }]
            }
        }, [1,3]), { geometry: { coordinates: [ 1, 3 ], type: 'Point' }, properties: { 'carmen:address': 9, 'carmen:addressnumber': [[ 9, 10, 7 ]], 'carmen:text': 'test' } });

    t.end();
});

test('address point clustering not point', function(t) {
    t.deepEqual(
        addressCluster.forward({
            properties: {
                'carmen:addressnumber': [9]
            },
            geometry: {
                type: 'FeatureCollection',
                features: [{
                    type: "Polygon",
                    coordinates: [
                        [
                            [
                                -17.2265625,
                                8.407168163601076
                            ],
                            [
                                -17.2265625,
                                53.9560855309879
                            ],
                            [
                                34.80468749999999,
                                53.9560855309879
                            ],
                            [
                                34.80468749999999,
                                8.407168163601076
                            ],
                            [
                                -17.2265625,
                                8.407168163601076
                            ]
                        ]
                    ]
                }]
            }
        }, 9),
        false);
    t.end();
});

test('address point clustering fail', function(t) {
    t.deepEqual(
        addressCluster.forward({
            properties: {
                'carmen:addressnumber': [9,10,7]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [[1,1],[2,2],[0,0]]
            }
        }, 11),
        false);
    t.end();
});

test('parity: even + even', function(t) {
    t.deepEqual({
        type:'Point',
        interpolated: true,
        coordinates:[0,10]
    }, address.forward({
        properties: {
            'carmen:rangetype':'tiger',
            'carmen:lfromhn': [['0']],
            'carmen:ltohn': [['100']],
            'carmen:parityl': [['E']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type:'MultiLineString',
                coordinates: [[[0,0],[0,100]]]
            }]
        }
    }, 10));
    t.end();
});

test('parity: even + odd', function(t) {
    t.deepEqual({
        coordinates: [ 0, 9 ],
        interpolated: true,
        omitted: true, // because parity does not match
        type: 'Point'
    }, address.forward({
        properties: {
            'carmen:rangetype':'tiger',
            'carmen:lfromhn': [['0']],
            'carmen:ltohn': [['100']],
            'carmen:parityl': [['E']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type:'MultiLineString',
                coordinates: [[[0,0],[0,100]]]
            }]
        }
    }, 9));
    t.end();
});

test('parity: odd + both', function(t) {
    t.deepEqual({
        type:'Point',
        interpolated: true,
        coordinates:[0,9]
    }, address.forward({
        properties: {
            'carmen:rangetype': 'tiger',
            'carmen:lfromhn': [['1']],
            'carmen:ltohn': [['101']],
            'carmen:parityl': [['B']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type:'MultiLineString',
                coordinates: [[[0,1],[0,101]]]
            }]
        }
    }, 9));
    t.end();
});

test('parity: odd + odd', function(t) {
    t.deepEqual({
        type:'Point',
        interpolated: true,
        coordinates:[0,9]
    }, address.forward({
        properties: {
            'carmen:rangetype': 'tiger',
            'carmen:lfromhn': [['1']],
            'carmen:ltohn': [['101']],
            'carmen:parityl': [['O']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type:'MultiLineString',
                coordinates: [[[0,1],[0,101]]]
            }]
        }
    }, 9));
    t.end();
});

test('parity: odd + even', function(t) {
    t.deepEqual({
        coordinates: [ 0, 9 ],
        interpolated: true,
        omitted: true, // because parity does not match
        type: 'Point'
    }, address.forward({
        properties: {
            'carmen:rangetype':'tiger',
            'carmen:lfromhn': [['1']],
            'carmen:ltohn': [['101']],
            'carmen:parityl': [['E']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type:'MultiLineString',
                coordinates: [[[0,1],[0,101]]]
            }]
        }
    }, 9));
    t.end();
});

test('reverse', function(t) {
    t.deepEqual({
        type: 'Point',
        interpolated: true,
        coordinates: [0,90]
    }, address.forward({
        properties: {
            'carmen:rangetype':'tiger',
            'carmen:lfromhn': [['100']],
            'carmen:ltohn': [['0']],
            'carmen:parityl': [['E']],
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type:'MultiLineString',
                coordinates: [[[0,0],[0,100]]]
            }]
        }
    }, 10));
    t.end();
});

test('seminumber', function(t) {
    t.deepEqual({
        type: 'Point',
        interpolated: true,
        coordinates: [0,10]
    }, address.forward({
        properties: {
            'carmen:rangetype': 'tiger',
            'carmen:lfromhn': [['G-0']],
            'carmen:ltohn': [['G-100']],
            'carmen:parityl': [['E']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type:'MultiLineString',
                coordinates: [[[0,0],[0,100]]]
            }]
        }
    }, 10));
    t.end();
});

test('multi', function(t) {
    t.deepEqual([0,40.981964], address.forward({
        properties: {
            'carmen:rangetype': 'tiger',
            'carmen:lfromhn': [['1002','2']],
            'carmen:ltohn': [['1998','1000']],
            'carmen:rfromhn': [['1001','1']],
            'carmen:rtohn': [['1999','999']],
            'carmen:parityr': [['O','O']],
            'carmen:parityl': [['E','E']]
        },
        geometry: {
            type: 'GeometryCollection',
            geometries: [{
                type:'MultiLineString',
                coordinates:[
                    [[0,0],[0,10]],
                    [[0,40],[0,50]]
                ]
            }]
        }
    }, 100).coordinates);
    t.end();
});
