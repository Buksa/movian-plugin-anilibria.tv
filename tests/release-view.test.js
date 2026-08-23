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

function loader(api, model, logs) {
    return releaseView.create({
        api: api,
        model: model,
        log: {
            e: function (message) {
                logs.push(message);
            }
        }
    });
}

test('loads release before franchise and delegates model composition', function () {
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
    var model = {
        build: function (value, valueFranchise, fallbackLogo, id) {
            events.push('build');
            calls.push({
                release: value,
                franchise: valueFranchise,
                fallbackLogo: fallbackLogo,
                id: id
            });
            return expected;
        }
    };
    var observed;

    loader(api, model, logs).load(10, 'logo.png', function (err, value) {
        observed = { err: err, model: value };
    });

    assert.deepStrictEqual(events, ['release', 'franchise', 'build']);
    assert.deepStrictEqual(calls, [{
        release: release,
        franchise: franchiseData,
        fallbackLogo: 'logo.png',
        id: 10
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
    var model = {
        build: function (release, franchiseData) {
            receivedFranchise = franchiseData;
            return expected;
        }
    };
    var observed;

    loader(api, model, logs).load(11, 'logo.png', function (err, value) {
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
    var model = {
        build: function () {
            throw new Error('model should not be built');
        }
    };
    var observed;

    loader(api, model, logs).load(9, 'logo.png', function (err, value) {
        observed = { err: err, model: value };
    });

    assert.strictEqual(observed.err, failure);
    assert.strictEqual(observed.model, undefined);
    assert.strictEqual(franchiseCalled, false);
    assert.deepStrictEqual(logs, []);
});

test('rejects a malformed required release payload', function () {
    var franchiseCalled = false;
    var modelCalled = false;
    var logs = [];
    var api = {
        release: function (id, callback) {
            callback(null, { data: null });
        },
        franchise: function () {
            franchiseCalled = true;
        }
    };
    var model = {
        build: function () {
            modelCalled = true;
        }
    };
    var observed;

    loader(api, model, logs).load(12, 'logo.png', function (err, value) {
        observed = { err: err, model: value };
    });

    assert.strictEqual(observed.err.message, 'Release payload is unavailable');
    assert.strictEqual(observed.model, undefined);
    assert.strictEqual(franchiseCalled, false);
    assert.strictEqual(modelCalled, false);
});
