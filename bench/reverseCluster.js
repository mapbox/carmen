var Benchmark = require('benchmark'),
    suite = new Benchmark.Suite();
var addressCluster = require('../lib/pure/addresscluster');

var bytes = require('bytes');

module.exports = benchmark;

function benchmark(cb) {
    if (!cb) cb = function() {};
    console.log('# addressCluster.reverse');

    var memory = process.memoryUsage().rss;
    console.time('Reversing Address Cluster');
    addressCluster.reverse(
        {
            properties: {
                'carmen:text': 'Main Street West',
                'carmen:addressnumber': [
                    '1',
                    '2',
                    '5',
                    '7',
                    '9',
                    '11',
                    '13',
                    '15',
                    '17',
                    '19',
                    '21',
                    '23',
                    '25',
                    '27',
                    '29',
                    '31',
                    '33',
                    '35',
                    '37',
                    '39'
                ]
            },
            geometry: {
                type: 'MultiPoint',
                coordinates: [
                    [-66.053609778369008, 45.267755774710196],
                    [-66.053520444159631, 45.267773417263989],
                    [-66.053545143362001, 45.267872489876673],
                    [-66.05356242929092, 45.267942290574915],
                    [-66.051152143296363, 45.267157137887125],
                    [-66.053862373147226, 45.267717632055017],
                    [-66.053613494258471, 45.26809095484226],
                    [-66.054202319089583, 45.267831895089252],
                    [-66.054340252560081, 45.267630439181438],
                    [-66.055423355486255, 45.267465098064818],
                    [-66.055636548756354, 45.267575708862665],
                    [-66.05578708432769, 45.267552906584683],
                    [-66.055941513163489, 45.267521121675216],
                    [-66.056094603876147, 45.267497429255343],
                    [-66.056246391959618, 45.267477330605146],
                    [-66.056403358026344, 45.267446904687787],
                    [-66.056557736665013, 45.267421417151049],
                    [-66.056694988345427, 45.267386414604864],
                    [-66.057019554634124, 45.267269367186401],
                    [-66.057029425003947, 45.26714838641995]
                ]
            }
        },
        [1, 3]
    );
    console.timeEnd('Reversing Address Cluster');
    console.log(
        'Memory used:',
        bytes(process.memoryUsage().rss - memory),
        '\n'
    );
    cb();
}

if (!process.env.runSuite) benchmark();
