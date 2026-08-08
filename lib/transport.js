// ============================================================================
// lib/transport.js — HTTP transport for Anilibria API
// ============================================================================
//
// Owns: request(), buildQuery(), httpInspectorCreate side-effect.
// Reads config via the config module (injected seam).
//
// ============================================================================

var http = require('movian/http');
var io = require('native/io');
var config = require('./config');

// Cache times per endpoint (seconds, for Movian HTTP cache)
var CACHE_CATALOG = 120;
var CACHE_RELEASE = 300;
var CACHE_SCHEDULE = 60;
var CACHE_FRANCHISE = 600;

// Install HTTP inspector on load — sets User-Agent, Referer, Origin, Cookie
// on every request to *.libria.* domains.
io.httpInspectorCreate('.*libria.*', function (req) {
    var headers = config.getHeaders();
    if (headers['User-Agent']) {
        req.setHeader('User-Agent', headers['User-Agent']);
    }
    req.setHeader('Referer', 'https://anilibria.top/');
    req.setHeader('Origin', 'https://anilibria.top');

    var cookie = config.getCookie();
    if (cookie) {
        req.setCookie('cf_clearance', cookie);
    }
}, false);

function buildQuery(params) {
    var parts = [];
    for (var key in params) {
        if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null) {
            parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
    }
    return parts.length > 0 ? '?' + parts.join('&') : '';
}

function request(path, callback, nocache, cacheTime) {
    var url = config.getBaseUrl() + path;
    var reqHeaders = {};
    var srcHeaders = config.getHeaders();
    for (var h in srcHeaders) reqHeaders[h] = srcHeaders[h];

    var opts = {
        method: 'GET',
        headers: reqHeaders,
        compression: true
    };

    if (!nocache && config.isCacheEnabled()) {
        opts.caching = true;
        opts.cacheTime = cacheTime || CACHE_CATALOG;
    }

    http.request(url, opts, function (err, res) {
        if (err) {
            callback(err);
            return;
        }

        var cacheHit = (res.statuscode === 0);

        if (res.statuscode !== 200 && !cacheHit) {
            callback(new Error('HTTP ' + res.statuscode));
            return;
        }

        try {
            var data = JSON.parse(res.toString());
            callback(null, {
                data: data,
                cacheHit: cacheHit
            });
        } catch (e) {
            callback(new Error('JSON parse error: ' + e.message));
        }
    });
}

module.exports = {
    request: request,
    buildQuery: buildQuery,
    CACHE_CATALOG: CACHE_CATALOG,
    CACHE_RELEASE: CACHE_RELEASE,
    CACHE_SCHEDULE: CACHE_SCHEDULE,
    CACHE_FRANCHISE: CACHE_FRANCHISE
};
