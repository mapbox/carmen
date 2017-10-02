const termops = require('../lib/util/termops');
const test = require('tape');

test('id - tests if searching by id', q => {
    let indexes = {
        country: {},
        province: {},
        place: {},
        postcode: {},
        'multi.part': {}
    };
    q.deepEqual(termops.id(indexes, 'country.5432'), {
        dbname: 'country',
        id: '5432'
    });
    q.deepEqual(termops.id(indexes, 'province.123'), {
        dbname: 'province',
        id: '123'
    });
    q.deepEqual(termops.id(indexes, 'postcode.546'), {
        dbname: 'postcode',
        id: '546'
    });
    q.deepEqual(termops.id(indexes, 'place.455233'), {
        dbname: 'place',
        id: '455233'
    });
    q.deepEqual(termops.id(indexes, 'multi.part.455233'), {
        dbname: 'multi.part',
        id: '455233'
    });
    q.strictEqual(termops.id(indexes, 'near country.5432'), false);
    q.strictEqual(termops.id(indexes, 'country.5432 street'), false);
    q.strictEqual(termops.id(indexes, '123.451,8.123'), false);
    q.strictEqual(termops.id(indexes, 'gotham.43213'), false);
    q.strictEqual(termops.id(indexes, 'country.a445'), false);
    q.strictEqual(termops.id(indexes, 'place.32f424'), false);
    q.strictEqual(termops.id(indexes, 'country.424k'), false);
    q.end();
});
