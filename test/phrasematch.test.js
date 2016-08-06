var tape = require('tape');
var phrasematch = require('../lib/phrasematch');
var deDuplicateSubqueries = phrasematch.deDuplicateSubqueries;

tape('Dedupe subqueries array', function(assert) {
var obj = [ [ 'avenue', 'du', '18e', 'régiment' ],
          [ 'avenue', 'du', '18e'],
          [ 'du', '18e', 'régiment' ],
          [ 'avenue', 'du'],
          ['avenue', 'du', '18e']
        ];
        for (var i = 0; i < obj.length; i++) {
            obj[0].ender = true,
            obj[0].mask = 15,
            obj[1].ender = false,
            obj[1].mask = 14,
            obj[2].ender = true,
            obj[2].mask = 3,
            obj[3].ender = false,
            obj[3].mask = 3,
            obj[4].ender = false,
            obj[4].mask = 14;
        } 
  var result = deDuplicateSubqueries(obj);
  var expected = [ [ 'avenue', 'du', '18e', 'régiment' ], [ 'avenue', 'du', '18e' ], [ 'du', '18e', 'régiment' ], [ 'avenue', 'du' ] ];

  assert.deepEqual(JSON.stringify(result),JSON.stringify(expected), 'ok de-duped correctly');
  assert.end()
});