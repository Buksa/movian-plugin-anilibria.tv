var assert = require('assert');
var Module = require('module');

function response(statuscode, body) {
    return {
        statuscode: statuscode,
        toString: function () {
            return typeof body === 'string' ? body : JSON.stringify(body);
        }
    };
}

function makeHttp(endpoint) {
    var calls = [];

    return {
        calls: calls,
        request: function (url, options, callback) {
            calls.push({ url: url, options: options });
            endpoint(url, options, callback);
        }
    };
}

function loadApi(http, fakeSession) {
    var originalLoad = Module._load;
    var apiPath = require.resolve('../lib/api');
    var sessionPath = require.resolve('../lib/api-session');
    var transportPath = require.resolve('../lib/transport');
    var inspector = function () {};
    delete require.cache[apiPath];
    delete require.cache[sessionPath];
    delete require.cache[transportPath];

    Module._load = function (request) {
        if (request === 'movian/http') return http;
        if (request === './api-session' && fakeSession) return fakeSession;
        if (request === 'native/io') {
            return { httpInspectorCreate: inspector };
        }
        return originalLoad.apply(this, arguments);
    };

    try {
        return require(apiPath);
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

test('returns normalized endpoint data and cache metadata', function () {
    var payload = { data: [{ id: 7 }] };
    var http = makeHttp(function (url, options, callback) {
        callback(null, response(200, payload));
    });
    var api = loadApi(http);
    var observed;

    api.catalog(2, function (err, result) {
        observed = { err: err, result: result, argc: arguments.length };
    });

    assert.strictEqual(observed.err, null);
    assert.deepStrictEqual(observed.result, {
        data: payload,
        cacheHit: false
    });
    assert.strictEqual(observed.argc, 2);
    assert.ok(http.calls[0].url.indexOf('https://api.anilibria.app/api/v1/') === 0);
    assert.strictEqual(http.calls[0].options.caching, true);
    assert.strictEqual(http.calls[0].options.cacheTime, 120);
    assert.strictEqual(http.calls[0].options.compression, true);
    assert.strictEqual(http.calls[0].options.headers['Accept-Encoding'], undefined);
});

test('normalizes Movian cache status without exposing the response', function () {
    var http = makeHttp(function (url, options, callback) {
        callback(null, response(0, { data: [] }));
    });
    var api = loadApi(http);
    var result;

    api.search('  cats  ', 1, function (err, value) {
        assert.strictEqual(err, null);
        result = value;
    });

    assert.deepStrictEqual(result, {
        data: { data: [] },
        cacheHit: true
    });
});

test('retries a bodyless 304 once without cache', function () {
    var payload = { data: [{ id: 8 }] };
    var attempts = 0;
    var http = makeHttp(function (url, options, callback) {
        attempts++;
        if (attempts === 1) {
            callback(null, response(304, ''));
            return;
        }
        callback(null, response(200, payload));
    });
    var api = loadApi(http);
    var observed;

    api.catalog(3, function (err, result) {
        observed = { err: err, result: result };
    });

    assert.strictEqual(observed.err, null);
    assert.deepStrictEqual(observed.result, {
        data: payload,
        cacheHit: false
    });
    assert.strictEqual(http.calls.length, 2);
    assert.strictEqual(http.calls[0].options.noFail, true);
    assert.strictEqual(http.calls[1].options.noFail, true);
    assert.strictEqual(http.calls[1].options.caching, undefined);
});

test('fails explicitly when the uncached retry is also 304', function () {
    var http = makeHttp(function (url, options, callback) {
        callback(null, response(304, ''));
    });
    var api = loadApi(http);
    var observed;

    api.release(12, function (err, result) {
        observed = { err: err, result: result };
    });

    assert.strictEqual(observed.result, undefined);
    assert.strictEqual(observed.err.message, 'HTTP 304 after uncached retry');
    assert.strictEqual(http.calls.length, 2);
    assert.strictEqual(http.calls[1].options.caching, undefined);
});

test('fails explicitly when HTTP returns no response', function () {
    var http = makeHttp(function (url, options, callback) {
        callback(null, undefined);
    });
    var api = loadApi(http);
    var observed;

    api.schedule(function (err, result) {
        observed = { err: err, result: result };
    });

    assert.strictEqual(observed.result, undefined);
    assert.strictEqual(observed.err.message, 'HTTP request returned no response');
});

test('returns HTTP and JSON failures through the endpoint seam', function () {
    var httpStatus = makeHttp(function (url, options, callback) {
        callback(null, response(503, '{}'));
    });
    var apiStatus = loadApi(httpStatus);
    var statusError;
    var statusResult;

    apiStatus.release(12, function (err, result) {
        statusError = err;
        statusResult = result;
    });

    assert.strictEqual(statusError.message, 'HTTP 503');
    assert.strictEqual(statusResult, undefined);

    var httpJson = makeHttp(function (url, options, callback) {
        callback(null, response(200, '{not json'));
    });
    var apiJson = loadApi(httpJson);
    var jsonError;

    apiJson.schedule(function (err) {
        jsonError = err;
    });

    assert.ok(jsonError.message.indexOf('JSON parse error:') === 0);
});

test('propagates franchise transport failures through the endpoint seam', function () {
    var http = makeHttp(function (url, options, callback) {
        callback(null, response(503, '{}'));
    });
    var api = loadApi(http);
    var observed;

    api.franchise(12, function (err, result) {
        observed = { err: err, result: result };
    });

    assert.strictEqual(observed.err.message, 'HTTP 503');
    assert.strictEqual(observed.result, undefined);
});

test('manual base URL skips mirror discovery', function () {
    var http = makeHttp(function (url, options, callback) {
        callback(null, response(200, { data: [] }));
    });
    var api = loadApi(http);
    var result;

    api.setBaseUrl('https://manual.example/api/v1');
    api.catalog(1, function (err, value) {
        assert.strictEqual(err, null);
        result = value;
    });

    assert.deepStrictEqual(result, {
        data: { data: [] },
        cacheHit: false
    });
    assert.strictEqual(http.calls.length, 1);
    assert.ok(http.calls[0].url.indexOf('https://manual.example/api/v1/') === 0);
});

test('delegates mirror refresh through the API facade', function () {
    var refreshCalled = false;
    var fakeSession = {
        snapshot: function () { return { headers: {}, cacheEnabled: true }; },
        installInspector: function () {},
        refreshConfig: function (callback) {
            refreshCalled = true;
            callback(null, { url: 'https://mirror.example/api/v1', source: 'dns' });
        },
        setBaseUrl: function () {},
        setUserAgent: function () {},
        setCookie: function () {},
        setCacheEnabled: function () {}
    };
    var api = loadApi(makeHttp(function () {}), fakeSession);
    var observed;

    api.refreshConfig(function (err, result) {
        observed = { err: err, result: result };
    });

    assert.strictEqual(refreshCalled, true);
    assert.strictEqual(observed.err, null);
    assert.deepStrictEqual(observed.result, {
        url: 'https://mirror.example/api/v1',
        source: 'dns'
    });
});