// ============================================================================
// anilibria.js — Главный файл плагина Anilibria для Movian
// ============================================================================

var page = require('movian/page');
var service = require('movian/service');
var settings = require('movian/settings');

var api = require('./lib/api');
var fmt = require('./lib/formatters');
var ui = require('./lib/ui');
var resume = require('./lib/resume');

var plugin = JSON.parse(Plugin.manifest);
var PREFIX = fmt.PREFIX;
var LOGO = Plugin.path + plugin.icon;
var PAGE_SIZE = 25;

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

resume.createSettingsUI(settings);

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

    api.search(query, 1, function (err, data) {
        page.loading = false;
        if (err) {
            ui.renderError(page, 'Ошибка поиска: ' + err.message);
            return;
        }
        var items = fmt.catalog(data);
        ui.renderSearch(page, items);
    });
});

// === Главная ===
new page.Route(PREFIX + ':start', function (page) {
    page.type = 'directory';
    page.metadata.title = 'Anilibria';
    page.model.contents = 'grid';

    var currentPage = 1;
    var loading = false;
    var loadToken = 0;
    var PAGE_DELAY = 1200; // ms — delay before first-page haveMore to avoid GLW cloner races

    page.flush();

    function finishLoad(token, hasMore, fromCache) {
        loading = false;
        page.loading = false;

        var delay = (currentPage === 1 && hasMore) ? PAGE_DELAY
                  : fromCache ? 50
                  : 0;

        if (!delay) {
            page.haveMore(hasMore);
            return;
        }
        setTimeout(function () {
            if (token !== loadToken) return;
            page.haveMore(hasMore);
        }, delay);
    }

    function loader() {
        if (loading) return;
        loading = true;
        if (page.entries === 0) page.loading = true;

        var token = loadToken;

        api.catalog(currentPage, function (err, data, fromCache) {
            if (token !== loadToken) return;

            if (err) {
                ui.renderError(page, 'Ошибка загрузки каталога');
                page.haveMore(false);
                loading = false;
                page.loading = false;
                return;
            }

            var items = fmt.catalog(data);
            ui.renderCatalog(page, items);

            currentPage++;
            var hasMore = data.data && data.data.length >= PAGE_SIZE;
            finishLoad(token, hasMore, fromCache);

            // Auto-load next pages from cache (up to 3)
            if (fromCache && hasMore && currentPage <= 3) {
                setTimeout(loader, 10);
            }
        });
    }

    page.asyncPaginator = loader;
    loader();
});

// === Каталог (отдельная страница) ===
new page.Route(PREFIX + ':catalog', function (page) {
    page.type = 'directory';
    page.metadata.title = 'Каталог';
    page.model.contents = 'grid';

    var currentPage = 1;
    var loading = false;
    var loadToken = 0;
    var PAGE_DELAY = 1200;

    page.flush();

    function finishLoad(token, hasMore, fromCache) {
        loading = false;
        page.loading = false;

        var delay = (currentPage === 1 && hasMore) ? PAGE_DELAY
                  : fromCache ? 50
                  : 0;

        if (!delay) {
            page.haveMore(hasMore);
            return;
        }
        setTimeout(function () {
            if (token !== loadToken) return;
            page.haveMore(hasMore);
        }, delay);
    }

    function loader() {
        if (loading) return;
        loading = true;
        if (page.entries === 0) page.loading = true;

        var token = loadToken;

        api.catalog(currentPage, function (err, data, fromCache) {
            if (token !== loadToken) return;

            if (err) {
                ui.renderError(page, 'Ошибка загрузки каталога');
                page.haveMore(false);
                loading = false;
                page.loading = false;
                return;
            }

            var items = fmt.catalog(data);
            ui.renderCatalog(page, items);

            currentPage++;
            var hasMore = data.data && data.data.length >= PAGE_SIZE;
            finishLoad(token, hasMore, fromCache);

            if (fromCache && hasMore && currentPage <= 3) {
                setTimeout(loader, 10);
            }
        });
    }

    page.asyncPaginator = loader;
    loader();
});

// === Расписание ===
new page.Route(PREFIX + ':schedule', function (page) {
    page.type = 'directory';
    page.metadata.title = 'Расписание';
    page.loading = true;

    api.schedule(function (err, data) {
        page.loading = false;
        if (err) {
            ui.renderError(page, 'Ошибка загрузки расписания');
            return;
        }
        // API returns { data: [scheduleItem, ...] }
        ui.renderSchedule(page, data.data || []);
    });
});

// === Страница релиза ===
new page.Route(PREFIX + ':release:(.*)', function (page, id) {
    page.type = 'directory';
    page.metadata.title = 'Загрузка...';
    page.loading = true;

    api.release(id, function (err, release) {
        if (err) {
            page.loading = false;
            ui.renderError(page, 'Ошибка загрузки релиза');
            return;
        }

        api.franchise(id, function (fErr, franchiseData) {
            page.loading = false;

            var franchise = fmt.franchise(franchiseData, id);
            ui.renderRelease(page, release, franchise);

            // Resume: предложить продолжить просмотр
            var rc = resume.config;
            if (rc.enabled) {
                resume.find(page, page.getItems(), {
                    autoResume: rc.autoResume,
                    findNext: rc.findNext,
                    delay: rc.delay
                });
            }
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
console.log(plugin.id + ' v' + plugin.version + ' loaded');
