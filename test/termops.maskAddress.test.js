var termops = require('../lib/util/termops');
var test = require('tape');

test('maskAddress', function(q) {
    q.deepEqual(termops.maskAddress(['1', 'fake', 'street', '100'], parseInt('1110',2)), {addr: '100', pos: 3});
    q.deepEqual(termops.maskAddress(['100', '1', 'fake', 'street'], parseInt('1111',2)), {addr: '100', pos: 0});
    q.deepEqual(termops.maskAddress(['1', 'fake', 'street', '100b'], parseInt('1110',2)), {addr: '100b', pos: 3});
    q.deepEqual(termops.maskAddress(['100b', '1', 'fake', 'street'], parseInt('1111',2)), {addr: '100b', pos: 0});
    q.deepEqual(termops.maskAddress(['1', 'fake', 'street', '100', '200'], parseInt('1110',2)), {addr: '100', pos: 3});
    q.end();
});
