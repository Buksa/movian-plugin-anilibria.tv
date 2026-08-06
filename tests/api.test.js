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

function makeHttp(dns, endpoint) {
    var calls = [];

    return {
        calls: calls,
        request: function (url, options, callback) {
            calls.push({ url: url, options: options });

            if (url.indexOf('https://dns.google') === 0) {
                if (dns.error) {
                    callback(dns.error);
                } else {
                    callback(null, response(200, dns.body));
                }
                return;
            }

            endpoint(url, options, callback);
        }
    };
}

function loadApi(http) {
    var originalLoad = Module._load;
    var apiPath = require.resolve('../lib/api');
    var inspector = function () {};

    delete require.cache[apiPath];

    Module._load = function (request) {
        if (request === 'movian/http') return http;
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
    var http = makeHttp({
        body: { Answer: [{ data: '"anilibria.top=mirror.example"' }] }
    }, function (url, options, callback) {
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
    assert.ok(http.calls[1].url.indexOf('https://mirror.example/api/v1/') === 0);
    assert.strictEqual(http.calls[1].options.caching, true);
    assert.strictEqual(http.calls[1].options.cacheTime, 120);
});

test('normalizes Movian cache status without exposing the response', function () {
    var http = makeHttp({ body: { Answer: [] } }, function (url, options, callback) {
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

test('uses the default URL when DNS discovery fails', function () {
    var http = makeHttp({ error: new Error('DNS offline') }, function (url, options, callback) {
        callback(null, response(200, { data: [] }));
    });
    var api = loadApi(http);
    var result;

    api.setCacheEnabled(false);
    api.catalog(1, function (err, value) {
        assert.strictEqual(err, null);
        result = value;
    });

    assert.deepStrictEqual(result, {
        data: { data: [] },
        cacheHit: false
    });
    assert.ok(http.calls[1].url.indexOf('https://api.anilibria.app/api/v1/') === 0);
    assert.strictEqual(http.calls[1].options.caching, undefined);
});

test('returns HTTP and JSON failures through the endpoint seam', function () {
    var httpStatus = makeHttp({ body: { Answer: [] } }, function (url, options, callback) {
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

    var httpJson = makeHttp({ body: { Answer: [] } }, function (url, options, callback) {
        callback(null, response(200, '{not json'));
    });
    var apiJson = loadApi(httpJson);
    var jsonError;

    apiJson.schedule(function (err) {
        jsonError = err;
    });

    assert.ok(jsonError.message.indexOf('JSON parse error:') === 0);
});

test('keeps franchise optional while using the normalized result shape', function () {
    var http = makeHttp({ body: { Answer: [] } }, function (url, options, callback) {
        callback(null, response(503, '{}'));
    });
    var api = loadApi(http);
    var observed;

    api.franchise(12, function (err, result) {
        observed = { err: err, result: result };
    });

    assert.strictEqual(observed.err, null);
    assert.deepStrictEqual(observed.result, {
        data: null,
        cacheHit: false
    });
});

test('manual base URL skips mirror discovery', function () {
    var http = makeHttp({ body: { Answer: [] } }, function (url, options, callback) {
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
