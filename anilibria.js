// ============================================================================
// anilibria.js — Главный файл плагина Anilibria для Movian
// ============================================================================

var page = require('movian/page');
var service = require('movian/service');
var settings = require('movian/settings');

var api = require('./lib/api');
var fmt = require('./lib/formatters');
var ui = require('./lib/ui');
var watchedEpisode = require('./lib/watched-episode');
var pagination = require('./lib/pagination');
var releaseRoute = require('./lib/release-route');
var log = require('./lib/log');

var plugin = JSON.parse(Plugin.manifest);
var PREFIX = fmt.PREFIX;
var LOGO = Plugin.path + plugin.icon;
var PAGE_SIZE = 25;
var RELEASE_VIEW = Plugin.path + 'views/release.view';
var CATALOG_VIEW = Plugin.path + 'views/grid_video_switcher.view';

// ─────────────────────────────────────────────────────────────────────────────
// Сервис (иконка в меню Movian)
// ─────────────────────────────────────────────────────────────────────────────

service.create(plugin.title, PREFIX + ':start', 'video', true, LOGO);

// ─────────────────────────────────────────────────────────────────────────────
// Настройки
// ─────────────────────────────────────────────────────────────────────────────

settings.globalSettings(plugin.id, plugin.title, LOGO, plugin.synopsis);

settings.createInfo('info', LOGO,
    'Plugin by ' + plugin.author + '\n' + plugin.id + ' v' + plugin.version
);

settings.createDivider('Общие:');
function setDebug(value) {
    service.debug = !!value;
    log.setDebug(service.debug);
}

settings.createBool('debug', 'Debug Mode', false, setDebug);

settings.createBool('cacheEnabled', 'Включить кеширование', true, function (v) {
    api.setCacheEnabled(v);
});

settings.createString('apiUrl', 'URL API (зеркало)', 'https://api.anilibria.app/api/v1', function (v) {
    api.setBaseUrl(v);
});

settings.createAction('refreshMirror', 'Обновить зеркало (DNS)', function () {
    api.refreshConfig(function () {
        console.log('Mirror refreshed via DNS');
    });
});

settings.createString('cfCookie', 'Cloudflare Cookie (cf_clearance)', '', function (v) {
    api.setCookie(v);
});

settings.createString('cfUA', 'User-Agent для Cloudflare', '', function (v) {
    api.setUserAgent(v);
});

settings.createAction('testBypass', 'Проверить обход Cloudflare', function () {
    console.log('--- Начинаю тест обхода Cloudflare ---');
    api.testBypass(function (success, error) {
        if (success) {
            console.log('ТЕСТ ПРОЙДЕН: Список серий успешно получен!');
        } else {
            console.log('ТЕСТ ПРОВАЛЕН: ' + error);
        }
    });
});

watchedEpisode.createSettingsUI(settings);

// ─────────────────────────────────────────────────────────────────────────────
// Маршруты
// ─────────────────────────────────────────────────────────────────────────────

// === Поиск ===
page.Searcher(plugin.title, LOGO, function (page, query) {
    page.metadata.title = plugin.title + ' — Поиск: ' + query;
    page.type = 'directory';
    page.loading = true;
    page.entries = 0;

    if (!query || query.trim().length < 2) {
        ui.renderError(page, 'Минимум 2 символа для поиска');
        page.loading = false;
        return;
    }

    api.search(query, 1, function (err, result) {
        page.loading = false;
        if (err) {
            ui.renderError(page, 'Ошибка поиска: ' + err.message);
            return;
        }
        var items = fmt.catalog(result.data);
        ui.renderSearch(page, items);
    });
});

// === Каталог с пагинацией ===
function setupCatalogPage(page, title) {
    page.type = 'raw';
    page.metadata.title = title;
    page.metadata.icon = LOGO;
    page.metadata.glwview = CATALOG_VIEW;
    page.metadata.error = '';
    page.model.contents = 'grid';
    page.entries = 0;
    page.loading = true;

    var pager = pagination.create({
        maxPrefetchPage: 1,
        loadPage: function (pageNumber, callback) {
            api.catalog(pageNumber, function (err, result) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, {
                    items: fmt.catalog(result.data),
                    hasMore: !!(result.data.data &&
                        result.data.data.length >= PAGE_SIZE),
                    cacheHit: !!result.cacheHit
                });
            });
        },

        onLoadStart: function () {
            if (page.entries === 0) page.loading = true;
        },

        onLoadEnd: function () {
            page.loading = false;
        },

        onItems: function (items) {
            page.metadata.error = '';
            ui.renderCatalog(page, items);
        },

        onError: function (error) {
            page.metadata.error = 'Ошибка загрузки каталога: ' +
                (error && error.message ? error.message : 'повторите попытку');
        },

        onHaveMore: function (hasMore) {
            page.haveMore(hasMore);
        }
    });

    page.asyncPaginator = pager.load;
    pager.load();
}

// === Главная ===
new page.Route(PREFIX + ':start', function (page) {
    setupCatalogPage(page, 'Anilibria');
});

// === Каталог (отдельная страница) ===
new page.Route(PREFIX + ':catalog', function (page) {
    setupCatalogPage(page, 'Каталог');
});

// === Расписание ===
new page.Route(PREFIX + ':schedule', function (page) {
    page.type = 'directory';
    page.metadata.title = 'Расписание';
    page.loading = true;

    api.schedule(function (err, result) {
        page.loading = false;
        if (err) {
            ui.renderError(page, 'Ошибка загрузки расписания');
            return;
        }
        // API returns { data: [scheduleItem, ...] }
        ui.renderSchedule(page, result.data.data || []);
    });
});

// === Страница релиза ===
new page.Route(PREFIX + ':release:(.*)', function (page, id) {
    var releaseUrl = PREFIX + ':release:' + id;

    releaseRoute.present(page, {
        id: id,
        logo: LOGO,
        viewPath: RELEASE_VIEW,
        releaseUrl: releaseUrl
    });
});

// ─────────────────────────────────────────────────────────────────────────────
console.log(plugin.id + ' v' + plugin.version + ' loaded');
