var assert = require('assert');
var settingsState = require('../lib/settings-state');

function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (err) {
        console.error('not ok - ' + name);
        throw err;
    }
}

function fakeSettings() {
    var controls = {};
    var dividers = [];
    return {
        controls: controls,
        dividers: dividers,
        createDivider: function (title) {
            dividers.push(title);
        },
        createBool: function (id, label, value, callback) {
            controls[id] = { kind: 'bool', label: label, value: value, callback: callback };
        },
        createString: function (id, label, value, callback) {
            controls[id] = { kind: 'string', label: label, value: value, callback: callback };
        },
        createInt: function (id, label, value, min, max, step, unit, callback) {
            controls[id] = {
                kind: 'int',
                label: label,
                value: value,
                min: min,
                max: max,
                step: step,
                unit: unit,
                callback: callback
            };
        },
        createAction: function (id, label, callback) {
            controls[id] = { kind: 'action', label: label, callback: callback };
        }
    };
}

function dependencies() {
    var calls = {
        api: [],
        log: [],
        continuation: []
    };
    var continuationConfig = {
        enabled: true,
        autoResume: false,
        findNext: true,
        delay: 1500
    };
    var api = {
        setCacheEnabled: function (value) { calls.api.push(['cache', value]); },
        setBaseUrl: function (value) { calls.api.push(['url', value]); },
        setCookie: function (value) { calls.api.push(['cookie', value]); },
        setUserAgent: function (value) { calls.api.push(['ua', value]); },
        refreshConfig: function (callback) {
            calls.api.push(['refresh']);
            callback();
        },
        testBypass: function (callback) {
            calls.api.push(['bypass']);
            callback(true);
        }
    };
    var log = {
        setDebug: function (value) { calls.log.push(['debug', value]); },
        e: function (message) { calls.log.push(['error', message]); }
    };
    var service = {};
    var continuation = {
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
    };
    return {
        dependencies: {
            api: api,
            log: log,
            service: service,
            continuation: continuation
        },
        calls: calls,
        service: service
    };
}

function resetCalls(target) {
    target.calls.api.length = 0;
    target.calls.log.length = 0;
    target.calls.continuation.length = 0;
}

test('binds the complete settings surface with owner defaults', function () {
    var target = dependencies();
    var settings = fakeSettings();

    settingsState.create(target.dependencies).bind(settings);

    assert.deepStrictEqual(settings.dividers, [
        'Общие:',
        'Возобновление просмотра:'
    ]);
    assert.deepStrictEqual(Object.keys(settings.controls), [
        'debug',
        'glwDebug',
        'cacheEnabled',
        'apiUrl',
        'refreshMirror',
        'cfCookie',
        'cfUA',
        'testBypass',
        'resumeEnabled',
        'autoResume',
        'findNext',
        'resumeDelay'
    ]);
    assert.strictEqual(settings.controls.resumeEnabled.value, true);
    assert.strictEqual(settings.controls.glwDebug.value, false);
    assert.strictEqual(settings.controls.autoResume.value, false);
    assert.strictEqual(settings.controls.findNext.value, true);
    assert.strictEqual(settings.controls.resumeDelay.value, 1500);
});

test('normalizes callbacks and delegates state changes to owners', function () {
    var target = dependencies();
    var settings = fakeSettings();
    settingsState.create(target.dependencies).bind(settings);
    resetCalls(target);

    settings.controls.debug.callback(1);
    settings.controls.cacheEnabled.callback(0);
    settings.controls.apiUrl.callback(null);
    settings.controls.cfCookie.callback(123);
    settings.controls.cfUA.callback(456);
    settings.controls.resumeEnabled.callback(0);
    settings.controls.autoResume.callback(1);
    settings.controls.findNext.callback(0);
    settings.controls.resumeDelay.callback(900);

    assert.strictEqual(target.service.debug, true);
    assert.deepStrictEqual(target.calls.log, [['debug', true]]);
    assert.deepStrictEqual(target.calls.api, [
        ['cache', false],
        ['url', ''],
        ['cookie', '123'],
        ['ua', '456']
    ]);
    assert.deepStrictEqual(target.calls.continuation, [
        { enabled: false },
        { autoResume: true },
        { findNext: false },
        { delay: 900 }
    ]);
});

test('keeps operational actions behind the settings seam', function () {
    var target = dependencies();
    var settings = fakeSettings();
    settingsState.create(target.dependencies).bind(settings);
    resetCalls(target);

    settings.controls.refreshMirror.callback();
    settings.controls.testBypass.callback();

    assert.deepStrictEqual(target.calls.api, [['refresh'], ['bypass']]);
});

test('reports mirror refresh failures through the log owner', function () {
    var target = dependencies();
    target.dependencies.api.refreshConfig = function (callback) {
        callback(new Error('DNS unavailable'));
    };
    var settings = fakeSettings();
    settingsState.create(target.dependencies).bind(settings);
    resetCalls(target);

    settings.controls.refreshMirror.callback();

    assert.deepStrictEqual(target.calls.log, [
        ['error', 'Mirror refresh failed: DNS unavailable']
    ]);
});
