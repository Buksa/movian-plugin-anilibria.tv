// ============================================================================
// lib/api.js — HTTP-клиент для Anilibria API v1
// ============================================================================

var http = require('movian/http');

var BASE_URL = 'https://api.anilibria.app/api/v1';
var FALLBACK_URL = 'https://wwnd.space/public/api/index.php'; // Бэкап через alice cache
var COVER_URL = 'https://static-libria.weekstorm.one';
var MIRROR_COVER_URL = 'https://static.anilibria.tv'; // Зеркало для ImageSet
var CACHE_TIME = 3000; // 5 минут

var APP_VERSION_NAME = '2.14.2';
var APP_VERSION_CODE = '73';
var APP_ID = 'ru.radiationx.anilibria.app';
var CONFIG_URL = 'https://raw.githubusercontent.com/anilibria/anilibria-app/master/config.json';

var configLoaded = false;
var configError = null;
var manualUrl = false;

function updateHeaders() {
    HEADERS['App-Id'] = APP_ID;
    HEADERS['App-Ver-Name'] = APP_VERSION_NAME;
    HEADERS['App-Ver-Code'] = APP_VERSION_CODE;
}

var HEADERS = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Encoding': 'identity'
    // 'mobileApp': 'true',
    // 'App-Id': APP_ID,
    // 'App-Ver-Name': APP_VERSION_NAME,
    // 'App-Ver-Code': APP_VERSION_CODE
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

function request(url, callback, nocache) {
    loadConfig(function () {
        var reqHeaders = {};
        for (var h in HEADERS) reqHeaders[h] = HEADERS[h];

        var opts = {
            method: 'GET',
            debug: true,
            headers: reqHeaders
        };

        // Включаем кэш только если он разрешен глобально и это не принудительный запрос (nocache)
        // Если ключи отсутствуют, Movian (es_io.c) по умолчанию отключает кэширование.
        if (!nocache && cacheEnabled) {
            opts.caching = true;
            opts.cacheTime = CACHE_TIME;
        }

        http.request(url, opts, function (err, res) {
            if (err) {
                callback(err);
                return;
            }

            var fromCache = (res.statuscode === 0);

            if (res.statuscode !== 200 && res.statuscode !== 0) {
                callback(new Error('HTTP ' + res.statuscode));
                return;
            }

            try {
                var data = JSON.parse(res.toString());
                callback(null, data, fromCache);
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
    COVER_URL: COVER_URL,
    MIRROR_COVER_URL: MIRROR_COVER_URL,

    /**
     * Каталог аниме с пагинацией
     * @param {number} page - номер страницы (начиная с 1)
     * @param {Function} callback - function(err, data, fromCache)
     */
    catalog: function (page, callback) {
        var url = BASE_URL + '/anime/catalog/releases' + buildQuery({
            limit: 25,
            'f[sorting]': 'FRESH_AT_DESC',
            page: page
        });
        request(url, callback);
    },

    /**
     * Детали релиза по ID
     * @param {string|number} id - ID релиза
     * @param {Function} callback - function(err, data, fromCache)
     */
    release: function (id, callback) {
        var url = BASE_URL + '/anime/releases/' + id;
        request(url, callback);
    },

    /**
     * Франшиза релиза (опционально)
     * @param {string|number} id - ID релиза
     * @param {Function} callback - function(err, data) — ошибки игнорируются
     */
    franchise: function (id, callback) {
        var url = BASE_URL + '/anime/franchises/release/' + id;
        request(url, function (err, data) {
            callback(null, err ? null : data);
        });
    },

    /**
     * Поиск по каталогу (новый API v1)
     * @param {string} query - поисковый запрос
     * @param {number} page - номер страницы
     * @param {Function} callback - function(err, data, fromCache)
     */
    search: function (query, page, callback) {
        var url = BASE_URL + '/anime/catalog/releases' + buildQuery({
            limit: 25,
            'f[search]': query.trim(),
            'f[sorting]': 'RELEVANCE',
            page: page || 1
        });
        request(url, callback);
    },

    /**
     * Расписание выхода серий
     * @param {Function} callback - function(err, data, fromCache)
     */
    schedule: function (callback) {
        var url = BASE_URL + '/anime/schedule/week';
        request(url, callback);
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
        var url = BASE_URL + '/anime/catalog/releases?limit=1&page=1';
        console.log('API: Running LIVE bypass test...');
        request(url, function (err, data) {
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
