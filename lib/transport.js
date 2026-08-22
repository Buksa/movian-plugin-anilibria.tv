// ============================================================================
// lib/transport.js — HTTP transport for Anilibria API
// ============================================================================
//
// Owns: request(), buildQuery(), HTTP outcome and 304 retry policy.
// Reads an immutable request snapshot from api-session.
//
// ============================================================================

var http = require('movian/http');
var io = require('native/io');
var session = require('./api-session');
var log = require('./log');

// Cache times per endpoint (seconds, for Movian HTTP cache)
var CACHE_CATALOG = 120;
var CACHE_RELEASE = 300;
var CACHE_SCHEDULE = 60;
var CACHE_FRANCHISE = 600;

// Session owns the global inspector policy; transport supplies the Movian adapter.
session.installInspector(io);

function buildQuery(params) {
    var parts = [];
    for (var key in params) {
        if (params.hasOwnProperty(key) && params[key] !== undefined && params[key] !== null) {
            parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
    }
    return parts.length > 0 ? '?' + parts.join('&') : '';
}

function requestOptions(state, nocache, cacheTime) {
    var opts = {
        method: 'GET',
        headers: state.headers,
        compression: true,
        noFail: true
    };

    if (!nocache && state.cacheEnabled) {
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

function requestOnce(url, state, nocache, cacheTime, callback) {
    http.request(url, requestOptions(state, nocache, cacheTime),
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
    var state = session.snapshot();
    var url = state.baseUrl + path;

    requestOnce(url, state, nocache, cacheTime, function (err, result, notModified) {
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
        requestOnce(url, session.snapshot(), true, cacheTime,
            function (retryErr, retryResult, retryNotModified) {
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
