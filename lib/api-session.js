// ============================================================================
// lib/api-session.js — API URL, headers, cookie, cache, and HTTP inspector
// ============================================================================

var DEFAULT_BASE_URL = 'https://api.anilibria.app/api/v1';
var DEFAULT_HEADERS = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

function cloneHeaders(headers) {
    var copy = {};
    for (var key in headers) copy[key] = headers[key];
    return copy;
}

function normalizeBaseUrl(value) {
    if (typeof value !== 'string') return null;

    value = value.replace(/^\s+|\s+$/g, '');
    if (!/^https?:\/\//i.test(value)) return null;

    value = value.replace(/\/+$/, '');
    return value || null;
}

function create() {
    var baseUrl = DEFAULT_BASE_URL;
    var headers = cloneHeaders(DEFAULT_HEADERS);
    var cookie = '';
    var cacheEnabled = true;
    var inspectorInstalled = false;

    function snapshot() {
        return {
            baseUrl: baseUrl,
            headers: cloneHeaders(headers),
            cookie: cookie,
            cacheEnabled: cacheEnabled
        };
    }

    function installInspector(io) {
        if (inspectorInstalled) return;
        if (!io || typeof io.httpInspectorCreate !== 'function') {
            throw new Error('HTTP inspector adapter is unavailable');
        }

        io.httpInspectorCreate('.*libria.*', function (req) {
            var state = snapshot();
            if (state.headers['User-Agent']) {
                req.setHeader('User-Agent', state.headers['User-Agent']);
            }
            req.setHeader('Referer', 'https://anilibria.top/');
            req.setHeader('Origin', 'https://anilibria.top');
            if (state.cookie) req.setCookie('cf_clearance', state.cookie);
        }, false);
        inspectorInstalled = true;
    }

    return {
        snapshot: snapshot,
        installInspector: installInspector,
        setBaseUrl: function (value) {
            var normalized = normalizeBaseUrl(value);
            if (!normalized) return false;
            baseUrl = normalized;
            return true;
        },
        setUserAgent: function (value) {
            if (typeof value !== 'string') return false;
            value = value.replace(/^\s+|\s+$/g, '');
            if (!value) return false;
            headers['User-Agent'] = value;
            return true;
        },
        setCookie: function (value) {
            cookie = value === null || typeof value === 'undefined' ? '' : String(value);
            return true;
        },
        setCacheEnabled: function (value) {
            cacheEnabled = !!value;
        }
    };
}

var defaultSession = create();

module.exports = {
    create: create,
    snapshot: defaultSession.snapshot,
    installInspector: defaultSession.installInspector,
    setBaseUrl: defaultSession.setBaseUrl,
    setUserAgent: defaultSession.setUserAgent,
    setCookie: defaultSession.setCookie,
    setCacheEnabled: defaultSession.setCacheEnabled
};
