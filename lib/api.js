// ============================================================================
// lib/api.js — HTTP-клиент для Anilibria API v1
// ============================================================================

var http = require('movian/http');

var BASE_URL = 'https://api.anilibria.app/api/v1';

// Per-endpoint cache times (seconds, for Movian HTTP cache)
var CACHE_CATALOG = 120;  // 2 min
var CACHE_RELEASE = 300;  // 5 min
var CACHE_SCHEDULE = 60;  // 1 min
var CACHE_FRANCHISE = 600; // 10 min

var CONFIG_URL = 'https://raw.githubusercontent.com/anilibria/anilibria-app/master/config.json';

var configLoaded = false;
var manualUrl = false;

var HEADERS = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Encoding': 'identity'
};

var globalCookie = '';

// Глобальный инспектор для установки User-Agent и Cookie на всех доменах Anilibria
// Используем нативный модуль 'native/io', так как в 'movian/http' метода inspector нет.
var io = require('native/io');
io.httpInspectorCreate('.*libria.*', function (req) {
    if (HEADERS['User-Agent']) {
        req.setHeader('User-Agent', HEADERS['User-Agent']);
    }
    // Добавляем Referer и Origin для имитации легитимного запроса из приложения/браузера
    // Это может помочь обойти защиту даже без куки cf_clearance
    req.setHeader('Referer', 'https://anilibria.top/');
    req.setHeader('Origin', 'https://anilibria.top');

    if (globalCookie) {
        req.setCookie('cf_clearance', globalCookie);
    }
}, false); // false = синхронный режим

function discoverMirror(callback) {
    var dnsUrl = "https://dns.google/resolve?type=TXT&name=sw.anilibria.app";
    console.log('API: Discovering mirror via DNS...');

    http.request(dnsUrl, { method: 'GET' }, function (err, res) {
        if (err) {
            console.log('API: DNS discovery failed: ' + err.message);
            return callback();
        }
        try {
            var data = JSON.parse(res.toString());
            if (data.Answer && data.Answer.length > 0) {
                for (var i = 0; i < data.Answer.length; i++) {
                    var txt = data.Answer[i].data.replace(/^"|"$/g, "");
                    // Ищем запись вида "anilibria.top=mirror.host"
                    if (txt.indexOf('anilibria.top=') === 0) {
                        var mirrorHost = txt.split('=')[1];
                        if (mirrorHost) {
                            BASE_URL = 'https://' + mirrorHost + '/api/v1';
                            console.log('API: Dynamic mirror discovered: ' + BASE_URL);
                            break;
                        }
                    }
                }
            }
        } catch (e) {
            console.log('API: DNS parse error');
        }
        callback();
    });
}

function loadConfig(callback, force) {
    if (!force && (configLoaded || manualUrl)) return callback();

    discoverMirror(function () {
        configLoaded = true;
        callback();
    });
}

var cacheEnabled = true;

// ─────────────────────────────────────────────────────────────────────────────
// Внутренние helpers
// ─────────────────────────────────────────────────────────────────────────────

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
    loadConfig(function () {
        var url = BASE_URL + path;
        var reqHeaders = {};
        for (var h in HEADERS) reqHeaders[h] = HEADERS[h];

        var opts = {
            method: 'GET',
            headers: reqHeaders
        };

        // HTTP-level cache (Movian es_io.c)
        if (!nocache && cacheEnabled) {
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
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Публичный API
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {

    /**
     * Каталог аниме с пагинацией
     * @param {number} page - номер страницы (начиная с 1)
     * @param {Function} callback - function(err, result), result={data, cacheHit}
     */
    catalog: function (page, callback) {
        var path = '/anime/catalog/releases' + buildQuery({
            limit: 25,
            'f[sorting]': 'FRESH_AT_DESC',
            page: page
        });
        request(path, callback, false, CACHE_CATALOG);
    },

    /**
     * Детали релиза по ID
     * @param {string|number} id - ID релиза
     * @param {Function} callback - function(err, result), result={data, cacheHit}
     */
    release: function (id, callback) {
        var path = '/anime/releases/' + id;
        request(path, callback, false, CACHE_RELEASE);
    },

    /**
     * Франшиза релиза (опционально)
     * @param {string|number} id - ID релиза
     * @param {Function} callback - function(err, result), result={data, cacheHit}; errors return data=null
     */
    franchise: function (id, callback) {
        var path = '/anime/franchises/release/' + id;
        request(path, function (err, result) {
            callback(null, err ? { data: null, cacheHit: false } : result);
        }, false, CACHE_FRANCHISE);
    },

    /**
     * Поиск по каталогу (новый API v1)
     * @param {string} query - поисковый запрос
     * @param {number} page - номер страницы
     * @param {Function} callback - function(err, result), result={data, cacheHit}
     */
    search: function (query, page, callback) {
        var path = '/anime/catalog/releases' + buildQuery({
            limit: 25,
            'f[search]': query.trim(),
            'f[sorting]': 'FRESH_AT_DESC',
            page: page || 1
        });
        request(path, callback, false, CACHE_CATALOG);
    },

    /**
     * Расписание выхода серий
     * @param {Function} callback - function(err, result), result={data, cacheHit}
     */
    schedule: function (callback) {
        var path = '/anime/schedule/week';
        request(path, callback, false, CACHE_SCHEDULE);
    },

    /** Включить / выключить кэширование */
    setCacheEnabled: function (v) { cacheEnabled = v; },

    /** Сменить URL API (для зеркал) */
    setBaseUrl: function (v) {
        if (v) {
            BASE_URL = v;
            manualUrl = (v !== 'https://api.anilibria.app/api/v1');
            console.log('API base URL changed to: ' + BASE_URL + (manualUrl ? ' (manual)' : ''));
        }
    },

    /** Принудительно обновить конфиг с GitHub */
    refreshConfig: function (callback) {
        configLoaded = false;
        manualUrl = false; // Сбрасываем ручной режим при принудительном обновлении
        loadConfig(function () {
            if (callback) callback();
        }, true);
    },

    /** Получить список зеркал из конфига */
    fetchMirrors: function (callback) {
        http.request(CONFIG_URL, { method: 'GET' }, function (err, res) {
            if (err) return callback(err);
            try {
                var cfg = JSON.parse(res.toString());
                var mirrors = [];
                if (cfg.addresses) {
                    cfg.addresses.forEach(function (addr) {
                        if (addr.api) {
                            var match = addr.api.match(/^(https?:\/\/[^\/]+)/);
                            if (match) mirrors.push([match[1] + '/api/v1', addr.name || addr.tag]);
                        }
                    });
                }
                callback(null, mirrors);
            } catch (e) { callback(e); }
        });
    },

    /** Установить Cookie (например, cf_clearance) */
    setCookie: function (v) {
        globalCookie = v;
        console.log('API: Cookie updated: ' + v);
    },

    /** Установить User-Agent */
    setUserAgent: function (v) {
        if (v) {
            HEADERS['User-Agent'] = v;
            console.log('API: User-Agent updated');
        }
    },

    /** Проверить работоспособность обхода Cloudflare */
    testBypass: function (callback) {
        var path = '/anime/catalog/releases?limit=1&page=1';
        console.log('API: Running LIVE bypass test...');
        request(path, function (err) {
            if (err) {
                console.log('Bypass test failed: ' + err.message);
                callback(false, err.message);
            } else {
                console.log('Bypass test success!');
                callback(true);
            }
        }, true); // true = nocache
    }
};
