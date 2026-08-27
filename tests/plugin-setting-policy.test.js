var assert = require('assert');
var policyModule = require('../lib/plugin-setting-policy');

function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (err) {
        console.error('not ok - ' + name);
        throw err;
    }
}

function dependencies() {
    var calls = {
        logging: [],
        api: [],
        continuation: []
    };
    var continuationConfig = {
        enabled: true,
        autoResume: false,
        findNext: true,
        delay: 1500
    };
    var policy = policyModule.create({
        effects: {
            logging: {
                setDebug: function (value) {
                    calls.logging.push(value);
                }
            },
            api: {
                setCacheEnabled: function (value) {
                    calls.api.push(['cache', value]);
                },
                setBaseUrl: function (value) {
                    calls.api.push(['url', value]);
                },
                setCookie: function (value) {
                    calls.api.push(['cookie', value]);
                },
                setUserAgent: function (value) {
                    calls.api.push(['ua', value]);
                }
            },
            continuation: {
                snapshotConfig: function () {
                    return {
                        enabled: continuationConfig.enabled,
                        autoResume: continuationConfig.autoResume,
                        findNext: continuationConfig.findNext,
                        delay: continuationConfig.delay
                    };
                },
                configure: function (patch) {
                    calls.continuation.push(patch);
                    Object.keys(patch).forEach(function (key) {
                        continuationConfig[key] = patch[key];
                    });
                }
            }
        }
    });

    return {
        policy: policy,
        calls: calls
    };
}

function resetCalls(calls) {
    calls.logging.length = 0;
    calls.api.length = 0;
    calls.continuation.length = 0;
}

test('publishes grouped descriptors with stable preseed ids', function () {
    var target = dependencies();

    assert.deepStrictEqual(target.policy.definitions('general').map(function (item) {
        return item.id;
    }), ['debug', 'glwDebug', 'cacheEnabled', 'apiUrl']);
    assert.deepStrictEqual(target.policy.definitions('cloudflare').map(function (item) {
        return item.id;
    }), ['cfCookie', 'cfUA']);
    assert.deepStrictEqual(target.policy.definitions('continuation').map(function (item) {
        return item.id;
    }), ['resumeEnabled', 'autoResume', 'findNext', 'resumeDelay']);
    assert.strictEqual(target.policy.definitions('continuation')[3].min, 500);
    assert.strictEqual(target.policy.definitions('continuation')[3].max, 5000);
});

test('normalizes and applies one startup snapshot through adapters', function () {
    var target = dependencies();

    target.policy.applySnapshot({
        debug: 1,
        glwDebug: 1,
        cacheEnabled: 0,
        apiUrl: null,
        cfCookie: 123,
        cfUA: 456,
        resumeEnabled: 0,
        autoResume: 1,
        findNext: 0,
        resumeDelay: 99999
    });

    assert.deepStrictEqual(target.policy.snapshot(), {
        debug: true,
        glwDebug: true,
        cacheEnabled: false,
        apiUrl: '',
        cfCookie: '123',
        cfUA: '456',
        resumeEnabled: false,
        autoResume: true,
        findNext: false,
        resumeDelay: 5000
    });
    assert.deepStrictEqual(target.calls.logging, [true]);
    assert.deepStrictEqual(target.calls.api, [
        ['cache', false],
        ['url', ''],
        ['cookie', '123'],
        ['ua', '456']
    ]);
    assert.deepStrictEqual(target.calls.continuation, [{
        enabled: false,
        autoResume: true,
        findNext: false,
        delay: 5000
    }]);
});

test('applies patches only to changed effect adapters', function () {
    var target = dependencies();
    target.policy.applySnapshot({
        debug: false,
        glwDebug: false,
        cacheEnabled: true,
        apiUrl: 'https://api.example',
        cfCookie: '',
        cfUA: '',
        resumeEnabled: true,
        autoResume: false,
        findNext: true,
        resumeDelay: 1500
    });
    resetCalls(target.calls);

    target.policy.applyPatch({
        glwDebug: 1,
        apiUrl: 123,
        resumeDelay: 900
    });

    assert.deepStrictEqual(target.policy.snapshot(), {
        debug: false,
        glwDebug: true,
        cacheEnabled: true,
        apiUrl: '123',
        cfCookie: '',
        cfUA: '',
        resumeEnabled: true,
        autoResume: false,
        findNext: true,
        resumeDelay: 900
    });
    assert.deepStrictEqual(target.calls.logging, []);
    assert.deepStrictEqual(target.calls.api, [['url', '123']]);
    assert.deepStrictEqual(target.calls.continuation, [{ delay: 900 }]);
});
