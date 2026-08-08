var assert = require('assert');
var Module = require('module');

function loadReleaseView(api, releaseModel) {
    var originalLoad = Module._load;
    var viewPath = require.resolve('../lib/release-view');

    delete require.cache[viewPath];

    Module._load = function (request) {
        if (request === './api') return api;
        if (request === './release-model') return releaseModel;
        return originalLoad.apply(this, arguments);
    };

    try {
        return require(viewPath);
    } finally {
        Module._load = originalLoad;
    }
}

function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (err) {
        console.error('not ok - ' + name);
        throw err;
    }
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
    var releaseModel = {
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
    var view = loadReleaseView(api, releaseModel);
    var observed;

    view.load(10, 'logo.png', function (err, model) {
        observed = { err: err, model: model };
    });

    assert.deepStrictEqual(events, ['release', 'franchise', 'build']);
    assert.deepStrictEqual(calls, [{
        release: release,
        franchise: franchiseData,
        fallbackLogo: 'logo.png',
        id: 10
    }]);
    assert.strictEqual(observed.err, null);
    assert.strictEqual(observed.model, expected);
});

test('keeps release usable when optional franchise lookup fails', function () {
    var failure = new Error('franchise unavailable');
    var receivedFranchise;
    var expected = { marker: true };
    var api = {
        release: function (id, callback) {
            callback(null, { data: { id: id, name: { main: 'Release' } } });
        },
        franchise: function (id, callback) {
            callback(failure);
        }
    };
    var releaseModel = {
        build: function (release, franchiseData) {
            receivedFranchise = franchiseData;
            return expected;
        }
    };
    var view = loadReleaseView(api, releaseModel);
    var observed;

    view.load(11, 'logo.png', function (err, model) {
        observed = { err: err, model: model };
    });

    assert.strictEqual(receivedFranchise, null);
    assert.strictEqual(observed.err, null);
    assert.strictEqual(observed.model, expected);
});

test('stops before franchise when release fails', function () {
    var franchiseCalled = false;
    var failure = new Error('release unavailable');
    var api = {
        release: function (id, callback) {
            callback(failure);
        },
        franchise: function () {
            franchiseCalled = true;
        }
    };
    var releaseModel = {
        build: function () {
            throw new Error('model should not be built');
        }
    };
    var view = loadReleaseView(api, releaseModel);
    var observed;

    view.load(9, 'logo.png', function (err, model) {
        observed = { err: err, model: model };
    });

    assert.strictEqual(observed.err, failure);
    assert.strictEqual(observed.model, undefined);
    assert.strictEqual(franchiseCalled, false);
});