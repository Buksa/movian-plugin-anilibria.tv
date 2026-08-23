// ============================================================================
// lib/api.js — Endpoint facade for Anilibria API v1
// ============================================================================
//
// Thin re-export layer. Implementation lives in:
//   api-session.js — URL, headers, cookie, cache, HTTP inspector
//   transport.js   — HTTP outcome, 304 retry, query building
//
// Public interface: catalog, release, franchise, search, schedule,
//                   refreshConfig, setCacheEnabled, setBaseUrl, setCookie,
//                   setUserAgent, testBypass
//
// ============================================================================

var session = require('./api-session');
var transport = require('./transport');

module.exports = {

    catalog: function (page, callback) {
        var path = '/anime/catalog/releases' + transport.buildQuery({
            limit: 25,
            'f[sorting]': 'FRESH_AT_DESC',
            page: page
        });
        transport.request(path, callback, false, transport.CACHE_CATALOG);
    },

    release: function (id, callback) {
        var path = '/anime/releases/' + id;
        transport.request(path, callback, false, transport.CACHE_RELEASE);
    },

    franchise: function (id, callback) {
        var path = '/anime/franchises/release/' + id;
        transport.request(path, callback, false, transport.CACHE_FRANCHISE);
    },

    search: function (query, page, callback) {
        var path = '/anime/catalog/releases' + transport.buildQuery({
            limit: 25,
            'f[search]': query.trim(),
            'f[sorting]': 'FRESH_AT_DESC',
            page: page || 1
        });
        transport.request(path, callback, false, transport.CACHE_CATALOG);
    },

    schedule: function (callback) {
        var path = '/anime/schedule/week';
        transport.request(path, callback, false, transport.CACHE_SCHEDULE);
    },
    refreshConfig: function (callback) { session.refreshConfig(callback); },
    setCacheEnabled: function (v) { session.setCacheEnabled(v); },
    setBaseUrl: function (v) { session.setBaseUrl(v); },
    setCookie: function (v) { session.setCookie(v); },
    setUserAgent: function (v) { session.setUserAgent(v); },

    testBypass: function (callback) {
        var path = '/anime/catalog/releases?limit=1&page=1';
        console.log('API: Running LIVE bypass test...');
        transport.request(path, function (err) {
            if (err) {
                console.log('Bypass test failed: ' + err.message);
                callback(false, err.message);
            } else {
                console.log('Bypass test success!');
                callback(true);
            }
        }, true);
    }
};
