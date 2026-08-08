// ============================================================================
// lib/config.js — Anilibria API configuration state
// ============================================================================

var BASE_URL = 'https://api.anilibria.app/api/v1';

var HEADERS = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

var globalCookie = '';
var cacheEnabled = true;

module.exports = {
    getBaseUrl: function () { return BASE_URL; },
    setBaseUrl: function (v) {
        if (v) {
            BASE_URL = v;
            console.log('API base URL changed to: ' + BASE_URL);
        }
    },

    getHeaders: function () { return HEADERS; },
    setUserAgent: function (v) {
        if (v) {
            HEADERS['User-Agent'] = v;
            console.log('API: User-Agent updated');
        }
    },

    getCookie: function () { return globalCookie; },
    setCookie: function (v) {
        globalCookie = v;
        console.log('API: Cookie updated: ' + v);
    },

    isCacheEnabled: function () { return cacheEnabled; },
    setCacheEnabled: function (v) { cacheEnabled = v; }
};
