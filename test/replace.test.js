var token = require('../lib/util/token');
var test = require('tape');

var tokens = token.createReplacer({
    "First": "1st",
    "Second": "2nd",
    "Third": "3rd",
    "Fourth": "4th",
    "Fifth": "5th",
    "Sixth": "6th",
    "Seventh": "7th",
    "Eigth": "8th",
    "Ninth": "9th",
    "Tenth": "10th",
    "Eleventh": "11th",
    "Twelfth": "12th",
    "Thirteenth": "13th",
    "Fourteenth": "14th",
    "Fifteenth": "15th",
    "Sixteenth": "16th",
    "Seventeenth": "17th",
    "Eighteenth": "18th",
    "Nineteenth": "19th",
    "Twentieth": "20th",
    "Alley": "Aly",
    "Arcade": "Arc",
    "Avenue": "Ave",
    "Bayoo": "Byu",
    "Beach": "Bch",
    "Bluff": "Blf",
    "Bottom": "Btm",
    "Boulevard": "Blvd",
    "Branch": "Br",
    "Bridge": "Brg",
    "Brook": "Brk",
    "Brooks": "Brks",
    "Burg": "Bg",
    "Burgs": "Bgs",
    "Bypass": "Byp",
    "Calle": "Cll",
    "Camp": "Cp",
    "Canyon": "Cyn",
    "Cape": "Cpe",
    "Causeway": "Cswy",
    "Center": "Ctr",
    "Centers": "Ctrs",
    "Circle": "Cir",
    "Circles": "Cirs",
    "Cliff": "Clf",
    "Cliffs": "Clfs",
    "Club": "Clb",
    "Common": "Cmn",
    "Corner": "Cor",
    "Course": "Crse",
    "Court": "Ct",
    "Courts": "Cts",
    "Cove": "Cv",
    "Creek": "Crk",
    "Crescent": "Cres",
    "Crest": "Crst",
    "Crossing": "Xing",
    "Curve": "Curv",
    "Dale": "Dl",
    "Dam": "Dm",
    "Divide": "Dv",
    "Drive": "Dr",
    "Drives": "Drs",
    "East": "E",
    "Estate": "Est",
    "Estates": "Ests",
    "Expressway": "Expy",
    "Extension": "Ext",
    "Extensions": "Exts",
    "Falls": "Fls",
    "Ferry": "Fry",
    "Field": "Fld",
    "Fields": "Flds",
    "Flat": "Flt",
    "Flats": "Flts",
    "Ford": "Frd",
    "Forest": "Frst",
    "Forge": "Frg",
    "Forges": "Frgs",
    "Fork": "Frk",
    "Fort": "Ft",
    "Freeway": "Fwy",
    "Grade": "Grd",
    "Green": "Grn",
    "Harbor": "Hbr",
    "Harbors": "Hbrs",
    "Haven": "Hvn",
    "Heights": "Hts",
    "Highway": "Hwy",
    "Hill": "Hl",
    "Hills": "Hls",
    "Hollow": "Holw",
    "Industrial": "Ind",
    "Interstate": "I",
    "Island": "Is",
    "Islands": "Iss",
    "Junction": "Jct",
    "Junctions": "Jcts",
    "Junior": "Jr",
    "Key": "Ky",
    "Keys": "Kys",
    "Knoll": "Knl",
    "Knolls": "Knls",
    "Lake": "Lk",
    "Lakes": "Lks",
    "Landing": "Lndg",
    "Lane": "Ln",
    "Lieutenant": "Lt",
    "Light": "Lgt",
    "Lights": "Lgts",
    "Loaf": "Lf",
    "Lock": "Lck",
    "Locks": "Lcks",
    "Lodge": "Ldg",
    "Mall": "Mal",
    "Manor": "Mnr",
    "Manors": "Mnrs",
    "Meadow": "Mdw",
    "Meadows": "Mdws",
    "Mill": "Ml",
    "Mission": "Msn",
    "Moorhead": "Mhd",
    "Motorway": "Mtwy",
    "Mountain": "Mtn",
    "Mount": "Mt",
    "Neck": "Nck",
    "Northeast": "NE",
    "North": "N",
    "Northwest": "NW",
    "Orchard": "Orch",
    "Overpass": "Ovps",
    "Parkway": "Pky",
    "Passage": "Psge",
    "Place": "Pl",
    "Plain": "Pln",
    "Plains": "Plns",
    "Plaza": "Plz",
    "Point": "Pt",
    "Points": "Pts",
    "Port": "Prt",
    "Ports": "Prts",
    "Prairie": "Pr",
    "Private": "Pvt",
    "Radial": "Radl",
    "Ranch": "Rnch",
    "Rapid": "Rpd",
    "Rapids": "Rpds",
    "Rest": "Rst",
    "Ridge": "Rdg",
    "Ridges": "Rdgs",
    "River": "Riv",
    "Road": "Rd",
    "Roads": "Rds",
    "Route": "Rte",
    "Saint": "St",
    "Senior": "Sr",
    "Sergeant": "Sgt",
    "Shoal": "Shl",
    "Shoals": "Shls",
    "Shore": "Shr",
    "Shores": "Shrs",
    "Skyway": "Sky",
    "Southeast": "SE",
    "South": "S",
    "Southwest": "SW",
    "Spring": "Spg",
    "Springs": "Spgs",
    "Square": "Sq",
    "Squares": "Sqs",
    "Station": "Sta",
    "Stream": "Strm",
    "Streets": "Sts",
    "Street": "St",
    "Summit": "Smt",
    "Terrace": "Ter",
    "Thoroughfare": "Thfr",
    "Thruway": "Thwy",
    "Trace": "Trce",
    "Trafficway": "Tfwy",
    "Trail": "Trl",
    "Tunnel": "Tunl",
    "Turnpike": "Tpke",
    "Underpass": "Unp",
    "Unions": "Uns",
    "Union": "Un",
    "Valleys": "Vlys",
    "Valley": "Vly",
    "Viaduct": "Via",
    "Views": "Vws",
    "View": "Vw",
    "Villages": "Vlgs",
    "Village": "Vlg",
    "Ville": "Vl",
    "Vista": "Vis",
    "Walkway": "Wlky",
    "West": "W",
    "San Francisco": "sf"
});

test('token replacement', function(q) {
    q.deepEqual(token.replaceToken(tokens, 'fargo street northeast, san francisco'),'fargo St NE, sf');
    q.deepEqual(token.replaceToken(tokens, 'coolstreet'),'coolstreet');
    q.deepEqual(token.replaceToken(tokens, 'streetwise'),'streetwise');
    q.end();
});

test('replacer', function(q) {

    // deepEqual doesn't compare regex objects intelligently / accurately
    // so we have to roll our own :-&
    var rep = token.createReplacer({
        'Road': 'Rd',
        'Street': 'St'
    });
    q.deepEqual(rep.map(function(r) { return r.named; }), [false, false]);
    q.deepEqual(rep.map(function(r) { return r.to; }), ['$1Rd$2', '$1St$2']);
    q.deepEqual(rep.map(function(r) { return r.from.toString(); }), ['/(\\W|^)Road(\\W|$)/gi', '/(\\W|^)Street(\\W|$)/gi']);

    rep = token.createReplacer({
        'Maréchal': 'Mal',
        'Monsieur': 'M'
    });
    q.deepEqual(rep.map(function(r) { return r.named; }), [false, false, false]);
    q.deepEqual(rep.map(function(r) { return r.to; }), ['$1Mal$2', '$1Mal$2', '$1M$2']);
    q.deepEqual(rep.map(function(r) { return r.from.toString(); }), ['/(\\W|^)Maréchal(\\W|$)/gi', '/(\\W|^)Marechal(\\W|$)/gi', '/(\\W|^)Monsieur(\\W|$)/gi']);

    q.end();
});

test('named/numbered group replacement', function(q) {
    var tokens = token.createReplacer({
        "abc": "xyz",
        "(1\\d+)": "@@@$1@@@",
        "(?<number>2\\d+)": "###${number}###"
    });
    q.deepEqual(token.replaceToken(tokens, 'abc 123 def'), 'xyz @@@123@@@ def');
    q.deepEqual(token.replaceToken(tokens, 'abc 234 def'), 'xyz ###234### def');

    q.end();
});

test('throw on mixed name/num replacement groups', function(q) {
    q.throws(function() {
        token.createReplacer({ "(abc)(?<namedgroup>def)": "${namedgroup}$1" });
    });
    q.end();
});
