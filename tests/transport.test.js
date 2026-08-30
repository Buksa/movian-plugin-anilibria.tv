var assert = require('assert');
var transportModule = require('../lib/transport');

function response(statuscode, body) {
    return {
        statuscode: statuscode,
        toString: function () {
            return typeof body === 'string' ? body : JSON.stringify(body);
        }
    };
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

test('creates a transport from explicit runtime adapters', function () {
    var installedInspector;
    var requests = [];
    var session = {
        installInspector: function (inspector) {
            installedInspector = inspector;
        },
        snapshot: function () {
            return {
                baseUrl: 'https://api.example/api/v1',
                headers: { Accept: 'application/json' },
                cacheEnabled: true
            };
        }
    };
    var http = {
        request: function (url, options, callback) {
            requests.push({ url: url, options: options });
            callback(null, response(200, { data: ['schedule'] }));
        }
    };
    var inspector = { httpInspectorCreate: function () {} };
    var logs = [];
    var transport = transportModule.create({
        http: http,
        inspector: inspector,
        session: session,
        log: { d: function (message) { logs.push(message); } }
    });
    var observed;

    assert.strictEqual(installedInspector, inspector);

    transport.request('/anime/schedule/week', function (err, result) {
        observed = { err: err, result: result };
    }, false, transportModule.CACHE_SCHEDULE);

    assert.deepStrictEqual(requests, [{
        url: 'https://api.example/api/v1/anime/schedule/week',
        options: {
            method: 'GET',
            headers: { Accept: 'application/json' },
            compression: true,
            noFail: true,
            caching: true,
            cacheTime: 60
        }
    }]);
    assert.deepStrictEqual(observed, {
        err: null,
        result: { data: { data: ['schedule'] }, cacheHit: false }
    });
    assert.deepStrictEqual(logs, []);
});
test('retries a not-modified response with the current session state', function () {
    var snapshots = [
        {
            baseUrl: 'https://old.example/api/v1',
            headers: { 'X-Session': 'old' },
            cacheEnabled: true
        },
        {
            baseUrl: 'https://current.example/api/v1',
            headers: { 'X-Session': 'current' },
            cacheEnabled: true
        }
    ];
    var snapshotCalls = 0;
    var requests = [];
    var responses = [
        response(304, ''),
        response(200, { data: ['release'] })
    ];
    var session = {
        installInspector: function () {},
        snapshot: function () {
            return snapshots[Math.min(snapshotCalls++, snapshots.length - 1)];
        }
    };
    var http = {
        request: function (url, options, callback) {
            requests.push({ url: url, options: options });
            callback(null, responses.shift());
        }
    };
    var logs = [];
    var transport = transportModule.create({
        http: http,
        inspector: {},
        session: session,
        log: { d: function (message) { logs.push(message); } }
    });
    var observed;

    transport.request('/anime/releases/7', function (err, result) {
        observed = { err: err, result: result };
    }, false, transportModule.CACHE_RELEASE);

    assert.deepStrictEqual(requests, [{
        url: 'https://old.example/api/v1/anime/releases/7',
        options: {
            method: 'GET',
            headers: { 'X-Session': 'old' },
            compression: true,
            noFail: true,
            caching: true,
            cacheTime: 300
        }
    }, {
        url: 'https://old.example/api/v1/anime/releases/7',
        options: {
            method: 'GET',
            headers: { 'X-Session': 'current' },
            compression: true,
            noFail: true
        }
    }]);
    assert.deepStrictEqual(observed, {
        err: null,
        result: { data: { data: ['release'] }, cacheHit: false }
    });
    assert.deepStrictEqual(logs, [
        '[transport] HTTP 304; retrying uncached request: https://old.example/api/v1/anime/releases/7'
    ]);
});
test('returns HTTP and parsing failures through the request interface', function () {
    [
        { response: null, message: 'HTTP request returned no response' },
        { response: response(503, '{}'), message: 'HTTP 503' },
        { response: response(200, '{not json'), message: 'JSON parse error:' }
    ].forEach(function (failure) {
        var session = {
            installInspector: function () {},
            snapshot: function () {
                return {
                    baseUrl: 'https://api.example/api/v1',
                    headers: {},
                    cacheEnabled: true
                };
            }
        };
        var http = {
            request: function (url, options, callback) {
                callback(null, failure.response);
            }
        };
        var transport = transportModule.create({
            http: http,
            inspector: {},
            session: session,
            log: { d: function () {} }
        });
        var observed;

        transport.request('/anime/schedule/week', function (err, result) {
            observed = { err: err, result: result };
        });

        assert.ok(observed.err);
        assert.ok(observed.err.message.indexOf(failure.message) === 0);
        assert.strictEqual(observed.result, undefined);
    });
});

test('fails after an uncached retry also returns not-modified', function () {
    var requests = 0;
    var session = {
        installInspector: function () {},
        snapshot: function () {
            return {
                baseUrl: 'https://api.example/api/v1',
                headers: {},
                cacheEnabled: true
            };
        }
    };
    var transport = transportModule.create({
        http: {
            request: function (url, options, callback) {
                requests++;
                callback(null, response(304, ''));
            }
        },
        inspector: {},
        session: session,
        log: { d: function () {} }
    });
    var observed;

    transport.request('/anime/releases/7', function (err, result) {
        observed = { err: err, result: result };
    });

    assert.strictEqual(requests, 2);
    assert.strictEqual(observed.err.message, 'HTTP 304 after uncached retry');
    assert.strictEqual(observed.result, undefined);
});
