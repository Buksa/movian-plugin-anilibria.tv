var assert = require('assert');
var apiModule = require('../lib/api');
var transportModule = require('../lib/transport');

function makeTransport(endpoint) {
    var calls = [];

    return {
        calls: calls,
        buildQuery: transportModule.buildQuery,
        CACHE_CATALOG: transportModule.CACHE_CATALOG,
        CACHE_RELEASE: transportModule.CACHE_RELEASE,
        CACHE_SCHEDULE: transportModule.CACHE_SCHEDULE,
        CACHE_FRANCHISE: transportModule.CACHE_FRANCHISE,
        request: function (path, callback, nocache, cacheTime) {
            calls.push({
                path: path,
                nocache: nocache,
                cacheTime: cacheTime
            });
            endpoint(path, callback, nocache, cacheTime);
        }
    };
}

function createApi(endpoint, session) {
    var transport = makeTransport(endpoint || function (path, callback) {
        callback(null, { data: [] });
    });
    return {
        api: apiModule.create({
            transport: transport,
            session: session
        }),
        transport: transport
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

test('builds endpoint methods around an injected transport', function () {
    var request;
    var query;
    var transport = {
        CACHE_CATALOG: 120,
        buildQuery: function (params) {
            query = params;
            return '?encoded-search';
        },
        request: function (path, callback, nocache, cacheTime) {
            request = {
                path: path,
                nocache: nocache,
                cacheTime: cacheTime
            };
            callback(null, { data: [] });
        }
    };
    var api = apiModule.create({ transport: transport });
    var result;

    api.search('  cats  ', 2, function (err, value) {
        result = { err: err, value: value };
    });

    assert.deepStrictEqual(query, {
        limit: 25,
        'f[search]': 'cats',
        'f[sorting]': 'FRESH_AT_DESC',
        page: 2
    });
    assert.deepStrictEqual(request, {
        path: '/anime/catalog/releases?encoded-search',
        nocache: false,
        cacheTime: 120
    });
    assert.deepStrictEqual(result, {
        err: null,
        value: { data: [] }
    });
});

test('delegates catalog endpoint paths and results through the facade', function () {
    var payload = { data: [{ id: 7 }] };
    var target = createApi(function (path, callback) {
        callback(null, { data: payload, cacheHit: false });
    });
    var observed;

    target.api.catalog(2, function (err, result) {
        observed = { err: err, result: result, argc: arguments.length };
    });

    assert.deepStrictEqual(target.transport.calls, [{
        path: '/anime/catalog/releases?limit=25&f%5Bsorting%5D=FRESH_AT_DESC&page=2',
        nocache: false,
        cacheTime: 120
    }]);
    assert.deepStrictEqual(observed, {
        err: null,
        result: { data: payload, cacheHit: false },
        argc: 2
    });
});

test('trims search input and defaults to the first page', function () {
    var target = createApi(function (path, callback) {
        callback(null, { data: [] });
    });

    target.api.search('  cats  ', undefined, function (err) {
        assert.strictEqual(err, null);
    });

    assert.deepStrictEqual(target.transport.calls, [{
        path: '/anime/catalog/releases?limit=25&f%5Bsearch%5D=cats&f%5Bsorting%5D=FRESH_AT_DESC&page=1',
        nocache: false,
        cacheTime: 120
    }]);
});

test('uses endpoint-specific cache policy for Release and schedule data', function () {
    var target = createApi();

    target.api.release(7, function () {});
    target.api.franchise(7, function () {});
    target.api.schedule(function () {});

    assert.deepStrictEqual(target.transport.calls, [{
        path: '/anime/releases/7',
        nocache: false,
        cacheTime: 300
    }, {
        path: '/anime/franchises/release/7',
        nocache: false,
        cacheTime: 600
    }, {
        path: '/anime/schedule/week',
        nocache: false,
        cacheTime: 60
    }]);
});

test('delegates session controls through the API facade', function () {
    var calls = [];
    var session = {
        refreshConfig: function (callback) {
            calls.push(['refresh']);
            callback(null, { url: 'https://mirror.example/api/v1', source: 'dns' });
        },
        setCacheEnabled: function (value) { calls.push(['cache', value]); },
        setBaseUrl: function (value) { calls.push(['url', value]); },
        setCookie: function (value) { calls.push(['cookie', value]); },
        setUserAgent: function (value) { calls.push(['ua', value]); }
    };
    var target = createApi(null, session);
    var observed;

    target.api.setCacheEnabled(false);
    target.api.setBaseUrl('https://manual.example/api/v1');
    target.api.setCookie('clearance');
    target.api.setUserAgent('Test Agent');
    target.api.refreshConfig(function (err, result) {
        observed = { err: err, result: result };
    });

    assert.deepStrictEqual(calls, [
        ['cache', false],
        ['url', 'https://manual.example/api/v1'],
        ['cookie', 'clearance'],
        ['ua', 'Test Agent'],
        ['refresh']
    ]);
    assert.deepStrictEqual(observed, {
        err: null,
        result: { url: 'https://mirror.example/api/v1', source: 'dns' }
    });
});

test('runs the Cloudflare bypass action uncached', function () {
    var request;
    var target = createApi(function (path, callback, nocache, cacheTime) {
        request = {
            path: path,
            nocache: nocache,
            cacheTime: cacheTime
        };
        callback(null, { data: [] });
    });
    var observed;

    target.api.testBypass(function (success, message) {
        observed = { success: success, message: message };
    });

    assert.deepStrictEqual(request, {
        path: '/anime/catalog/releases?limit=1&page=1',
        nocache: true,
        cacheTime: undefined
    });
    assert.deepStrictEqual(observed, {
        success: true,
        message: undefined
    });
});

test('reports a Cloudflare bypass failure through its callback', function () {
    var target = createApi(function (path, callback) {
        callback(new Error('blocked'));
    });
    var observed;

    target.api.testBypass(function (success, message) {
        observed = { success: success, message: message };
    });

    assert.deepStrictEqual(observed, {
        success: false,
        message: 'blocked'
    });
});