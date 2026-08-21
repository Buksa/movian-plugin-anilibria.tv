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
var log = require('./log');

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

function requestOptions(reqHeaders, nocache, cacheTime) {
    var opts = {
        method: 'GET',
        headers: reqHeaders,
        compression: true,
        noFail: true
    };

    if (!nocache && config.isCacheEnabled()) {
        opts.caching = true;
        opts.cacheTime = cacheTime || CACHE_CATALOG;
    }

    return opts;
}

function responseError(statuscode) {
    return new Error('HTTP ' + statuscode);
}

function parseResponse(res) {
    if (!res) return new Error('HTTP request returned no response');

    var cacheHit = (res.statuscode === 0);
    if (res.statuscode !== 200 && !cacheHit) {
        return responseError(res.statuscode);
    }

    try {
        return {
            data: JSON.parse(res.toString()),
            cacheHit: cacheHit
        };
    } catch (e) {
        return new Error('JSON parse error: ' + e.message);
    }
}

function requestOnce(url, reqHeaders, nocache, cacheTime, callback) {
    http.request(url, requestOptions(reqHeaders, nocache, cacheTime),
        function (err, res) {
            if (err) {
                callback(err);
                return;
            }

            if (res && res.statuscode === 304) {
                callback(null, null, true);
                return;
            }

            callback(null, parseResponse(res), false);
        });
}

function request(path, callback, nocache, cacheTime) {
    var url = config.getBaseUrl() + path;
    var reqHeaders = {};
    var srcHeaders = config.getHeaders();
    for (var h in srcHeaders) reqHeaders[h] = srcHeaders[h];

    requestOnce(url, reqHeaders, nocache, cacheTime, function (err, result, notModified) {
        if (err) {
            callback(err);
            return;
        }

        if (!notModified) {
            callback(result instanceof Error ? result : null,
                result instanceof Error ? undefined : result);
            return;
        }

        log.d('[transport] HTTP 304; retrying uncached request: ' + url);
        requestOnce(url, reqHeaders, true, cacheTime, function (retryErr, retryResult, retryNotModified) {
            if (retryErr) {
                callback(retryErr);
                return;
            }
            if (retryNotModified) {
                callback(new Error('HTTP 304 after uncached retry'));
                return;
            }
            callback(retryResult instanceof Error ? retryResult : null,
                retryResult instanceof Error ? undefined : retryResult);
        });
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
