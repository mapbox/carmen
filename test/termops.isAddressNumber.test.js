var termops = require('../lib/util/termops');
var test = require('tape');

test('termops.isAddressNumber', function(assert) {
    assert.deepEqual(termops.isAddressNumber(['12345']), false, '12345');
    assert.deepEqual(termops.isAddressNumber(['12###']), true, '12###');
    assert.deepEqual(termops.isAddressNumber(['#####']), true, '#####');
    assert.deepEqual(termops.isAddressNumber(['12345 Main St']), false, '12345 Main St');
    assert.deepEqual(termops.isAddressNumber(['12### Main St']), false, '12### Main St');
    assert.deepEqual(termops.isAddressNumber(['##### Main St']), false, '##### Main St');

    assert.end();
});

