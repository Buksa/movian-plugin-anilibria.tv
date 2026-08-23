var assert = require('assert');
var sessionModule = require('../lib/api-session');

function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (err) {
        console.error('not ok - ' + name);
        throw err;
    }
}

test('returns copy-on-read snapshots and validates session setters', function () {
    var session = sessionModule.create();
    var initial = session.snapshot();

    assert.strictEqual(initial.baseUrl, 'https://api.anilibria.app/api/v1');
    assert.strictEqual(initial.cacheEnabled, true);

    assert.strictEqual(session.setBaseUrl(' https://manual.example/api/v1/ '), true);
    assert.strictEqual(session.setUserAgent('  Test Agent  '), true);
    assert.strictEqual(session.setCookie('clearance'), true);
    session.setCacheEnabled(false);

    var next = session.snapshot();
    assert.strictEqual(next.baseUrl, 'https://manual.example/api/v1');
    assert.strictEqual(next.headers['User-Agent'], 'Test Agent');
    assert.strictEqual(next.cookie, 'clearance');
    assert.strictEqual(next.cacheEnabled, false);

    next.headers['User-Agent'] = 'mutated';
    assert.strictEqual(session.snapshot().headers['User-Agent'], 'Test Agent');
    assert.strictEqual(session.setBaseUrl('not-a-url'), false);
    assert.strictEqual(session.snapshot().baseUrl, 'https://manual.example/api/v1');
    assert.strictEqual(session.setUserAgent('   '), false);
});
test('refreshes a DNS mirror without losing URL state on failure', function () {
    var resolver = {
        resolve: function (callback) {
            callback(null, 'https://mirror.example/api/v1');
        }
    };
    var session = sessionModule.create({ resolver: resolver });
    var observed;

    assert.strictEqual(session.snapshot().manualUrl, false);
    assert.strictEqual(session.setBaseUrl('https://manual.example/api/v1'), true);
    assert.strictEqual(session.snapshot().manualUrl, true);

    session.refreshConfig(function (err, result) {
        observed = { err: err, result: result };
    });

    assert.strictEqual(observed.err, null);
    assert.deepStrictEqual(observed.result, {
        url: 'https://mirror.example/api/v1',
        source: 'dns'
    });
    assert.strictEqual(session.snapshot().baseUrl,
        'https://mirror.example/api/v1');
    assert.strictEqual(session.snapshot().manualUrl, false);

    var failed = sessionModule.create({
        resolver: {
            resolve: function (callback) {
                callback(new Error('DNS unavailable'));
            }
        }
    });
    failed.setBaseUrl('https://manual.example/api/v1');
    failed.refreshConfig(function (err) {
        observed = err;
    });

    assert.strictEqual(observed.message, 'DNS unavailable');
    assert.strictEqual(failed.snapshot().baseUrl,
        'https://manual.example/api/v1');
    assert.strictEqual(failed.snapshot().manualUrl, false);
});

test('installs one inspector that reads current session state', function () {
    var session = sessionModule.create();
    var registered = [];
    var io = {
        httpInspectorCreate: function (pattern, callback, enabled) {
            registered.push({ pattern: pattern, callback: callback, enabled: enabled });
        }
    };
    var request = {
        headers: {},
        cookies: {},
        setHeader: function (name, value) { this.headers[name] = value; },
        setCookie: function (name, value) { this.cookies[name] = value; }
    };

    session.setUserAgent('Agent One');
    session.setCookie('cookie-one');
    session.installInspector(io);
    session.installInspector(io);
    registered[0].callback(request);

    assert.strictEqual(registered.length, 1);
    assert.strictEqual(registered[0].pattern, '.*libria.*');
    assert.strictEqual(registered[0].enabled, false);
    assert.strictEqual(request.headers['User-Agent'], 'Agent One');
    assert.strictEqual(request.headers.Referer, 'https://anilibria.top/');
    assert.strictEqual(request.headers.Origin, 'https://anilibria.top');
    assert.strictEqual(request.cookies.cf_clearance, 'cookie-one');

    request.headers = {};
    request.cookies = {};
    session.setUserAgent('Agent Two');
    session.setCookie('');
    registered[0].callback(request);
    assert.strictEqual(request.headers['User-Agent'], 'Agent Two');
    assert.strictEqual(request.cookies.cf_clearance, undefined);
});
