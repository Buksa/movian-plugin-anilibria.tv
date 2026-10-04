var assert = require('assert');
var releaseView = require('../lib/release-view');

function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (err) {
        console.error('not ok - ' + name);
        throw err;
    }
}

function loader(api, projection, logs) {
    return releaseView.create({
        api: api,
        projection: projection,
        log: {
            e: function (message) {
                logs.push(message);
            }
        }
    });
}

test('loads release before franchise and delegates page projection', function () {
    var release = {
        id: 10,
        name: { main: 'Release' },
        description: 'Description'
    };
    var franchiseData = [{ franchise_releases: [] }];
    var events = [];
    var calls = [];
    var logs = [];
    var expected = { marker: true };
    var api = {
        release: function (id, callback) {
            events.push('release');
            assert.strictEqual(id, 10);
            callback(null, { data: release });
        },
        franchise: function (id, callback) {
            events.push('franchise');
            assert.strictEqual(id, 10);
            callback(null, { data: franchiseData });
        }
    };
    var projection = {
        project: function (request) {
            events.push('project');
            calls.push(request);
            return expected;
        }
    };
    var observed;

    loader(api, projection, logs).load(10, 'logo.png', function (err, value) {
        observed = { err: err, model: value };
    });

    assert.deepStrictEqual(events, ['release', 'franchise', 'project']);
    assert.deepStrictEqual(calls, [{
        release: release,
        franchiseData: franchiseData,
        fallbackLogo: 'logo.png',
        currentId: 10
    }]);
    assert.deepStrictEqual(logs, []);
    assert.strictEqual(observed.err, null);
    assert.strictEqual(observed.model, expected);
});

test('keeps release usable when optional franchise lookup fails', function () {
    var failure = new Error('franchise unavailable');
    var receivedFranchise;
    var logs = [];
    var expected = { marker: true };
    var api = {
        release: function (id, callback) {
            callback(null, { data: { id: id, name: { main: 'Release' } } });
        },
        franchise: function (id, callback) {
            callback(failure);
        }
    };
    var projection = {
        project: function (request) {
            receivedFranchise = request.franchiseData;
            return expected;
        }
    };
    var observed;

    loader(api, projection, logs).load(11, 'logo.png', function (err, value) {
        observed = { err: err, model: value };
    });

    assert.strictEqual(receivedFranchise, null);
    assert.deepStrictEqual(logs, [
        '[release-view] franchise error: franchise unavailable'
    ]);
    assert.strictEqual(observed.err, null);
    assert.strictEqual(observed.model, expected);
});

test('stops before franchise when required release fetch fails', function () {
    var franchiseCalled = false;
    var failure = new Error('release unavailable');
    var logs = [];
    var api = {
        release: function (id, callback) {
            callback(failure);
        },
        franchise: function () {
            franchiseCalled = true;
        }
    };
    var projection = {
        project: function () {
            throw new Error('projection should not run');
        }
    };
    var observed;

    loader(api, projection, logs).load(9, 'logo.png', function (err, value) {
        observed = { err: err, model: value };
    });

    assert.strictEqual(observed.err, failure);
    assert.strictEqual(observed.model, undefined);
    assert.strictEqual(franchiseCalled, false);
    assert.deepStrictEqual(logs, []);
});

test('rejects a malformed required release payload', function () {
    var franchiseCalled = false;
    var projectionCalled = false;
    var logs = [];
    var api = {
        release: function (id, callback) {
            callback(null, { data: null });
        },
        franchise: function () {
            franchiseCalled = true;
        }
    };
    var projection = {
        project: function () {
            projectionCalled = true;
        }
    };
    var observed;

    loader(api, projection, logs).load(12, 'logo.png', function (err, value) {
        observed = { err: err, model: value };
    });

    assert.strictEqual(observed.err.message, 'Release payload is unavailable');
    assert.strictEqual(observed.model, undefined);
    assert.strictEqual(franchiseCalled, false);
    assert.strictEqual(projectionCalled, false);
});

test('uses null optional enrichment when the franchise result has no data', function () {
    var franchiseData;
    var api = {
        release: function (id, callback) {
            callback(null, { data: { id: id, name: { main: 'Release' } } });
        },
        franchise: function (id, callback) {
            callback(null, {});
        }
    };
    var projection = {
        project: function (request) {
            franchiseData = request.franchiseData;
            return { marker: true };
        }
    };
    var observed;

    loader(api, projection, []).load(13, 'logo.png', function (err, value) {
        observed = { err: err, model: value };
    });

    assert.strictEqual(franchiseData, null);
    assert.strictEqual(observed.err, null);
    assert.deepStrictEqual(observed.model, { marker: true });
});

test('does not catch projection exceptions', function () {
    var failure = new Error('projection failed');
    var api = {
        release: function (id, callback) {
            callback(null, { data: { id: id, name: { main: 'Release' } } });
        },
        franchise: function (id, callback) {
            callback(null, { data: null });
        }
    };
    var projection = {
        project: function () {
            throw failure;
        }
    };

    assert.throws(function () {
        loader(api, projection, []).load(14, 'logo.png', function () {});
    }, function (err) {
        return err === failure;
    });
});
