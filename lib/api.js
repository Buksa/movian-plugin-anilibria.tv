// ============================================================================
// lib/api.js — Endpoint facade for Anilibria API v1
// ============================================================================
//
// Public endpoint interface is created by create() so tests can substitute
// transport adapters without loading Movian runtime modules.
//
// Public interface: create, catalog, release, franchise, search, schedule,
//                   refreshConfig, setCacheEnabled, setBaseUrl, setCookie,
//                   setUserAgent, testBypass
//
// ============================================================================

var defaultSession = require('./api-session');
var defaultTransport = require('./transport');

function create(dependencies) {
    dependencies = dependencies || {};

    var session = dependencies.session || defaultSession;
    var transport = dependencies.transport || defaultTransport;
    var resources = {
        catalog: {
            path: function () { return '/anime/catalog/releases'; },
            query: function (page) {
                return {
                    limit: 25,
                    'f[sorting]': 'FRESH_AT_DESC',
                    page: page
                };
            },
            cacheKey: 'CACHE_CATALOG'
        },
        release: {
            path: function (id) { return '/anime/releases/' + id; },
            cacheKey: 'CACHE_RELEASE'
        },
        franchise: {
            path: function (id) {
                return '/anime/franchises/release/' + id;
            },
            cacheKey: 'CACHE_FRANCHISE'
        },
        search: {
            path: function () { return '/anime/catalog/releases'; },
            query: function (query, page) {
                return {
                    limit: 25,
                    'f[search]': query.trim(),
                    'f[sorting]': 'FRESH_AT_DESC',
                    page: page || 1
                };
            },
            cacheKey: 'CACHE_CATALOG'
        },
        schedule: {
            path: function () { return '/anime/schedule/week'; },
            cacheKey: 'CACHE_SCHEDULE'
        },
        testBypass: {
            path: function () {
                return '/anime/catalog/releases?limit=1&page=1';
            },
            nocache: true
        }
    };

    function requestResource(name, callback, first, second) {
        var resource = resources[name];
        var path = resource.path(first, second);
        if (resource.query) {
            path += transport.buildQuery(resource.query(first, second));
        }

        if (resource.cacheKey) {
            transport.request(path, callback, !!resource.nocache,
                transport[resource.cacheKey]);
            return;
        }

        transport.request(path, callback, !!resource.nocache);
    }

    return {
        catalog: function (page, callback) {
            requestResource('catalog', callback, page);
        },

        release: function (id, callback) {
            requestResource('release', callback, id);
        },

        franchise: function (id, callback) {
            requestResource('franchise', callback, id);
        },

        search: function (query, page, callback) {
            requestResource('search', callback, query, page);
        },

        schedule: function (callback) {
            requestResource('schedule', callback);
        },
        refreshConfig: function (callback) { session.refreshConfig(callback); },
        setCacheEnabled: function (v) { session.setCacheEnabled(v); },
        setBaseUrl: function (v) { session.setBaseUrl(v); },
        setCookie: function (v) { session.setCookie(v); },
        setUserAgent: function (v) { session.setUserAgent(v); },

        testBypass: function (callback) {
            console.log('API: Running LIVE bypass test...');
            requestResource('testBypass', function (err) {
                if (err) {
                    console.log('Bypass test failed: ' + err.message);
                    callback(false, err.message);
                } else {
                    console.log('Bypass test success!');
                    callback(true);
                }
            });
        }
    };
}

var defaultApi = create();

module.exports = {
    create: create,
    catalog: defaultApi.catalog,
    release: defaultApi.release,
    franchise: defaultApi.franchise,
    search: defaultApi.search,
    schedule: defaultApi.schedule,
    refreshConfig: defaultApi.refreshConfig,
    setCacheEnabled: defaultApi.setCacheEnabled,
    setBaseUrl: defaultApi.setBaseUrl,
    setCookie: defaultApi.setCookie,
    setUserAgent: defaultApi.setUserAgent,
    testBypass: defaultApi.testBypass
};
