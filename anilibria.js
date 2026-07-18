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

var apiUrlSetting = settings.createString('apiUrl', 'URL API (зеркало)', 'https://api.anilibria.app/api/v1', function (v) {
    api.setBaseUrl(v);
});

settings.createAction('selectMirror', 'Выбрать зеркало (GitHub)', function () {
    api.fetchMirrors(function (err, mirrors) {
        if (err) {
            console.log('Error fetching mirrors:', err);
            return;
        }
        page.redirect(PREFIX + ':select_mirror', { mirrors: mirrors });
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
            console.log('✅ ТЕСТ ПРОЙДЕН: Список серий успешно получен!');
        } else {
            console.log('❌ ТЕСТ ПРОВАЛЕН: ' + error);
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
    page.loading = true;

    // Показываем сразу каталог с пагинацией
    var currentPage = 1;
    page.flush();

    function loader() {
        api.catalog(currentPage, function (err, data, fromCache) {
            page.loading = false;
            if (err) {
                ui.renderError(page, 'Ошибка загрузки каталога');
                page.haveMore(false);
                return;
            }

            var items = fmt.catalog(data);
            ui.renderCatalog(page, items);

            currentPage++;
            var hasMore = data.data && data.data.length >= PAGE_SIZE;
            page.haveMore(hasMore);

            // Авто-подгрузка из кэша (до 3 страниц)
            if (fromCache && hasMore && currentPage <= 3) {
                setTimeout(loader, 10);
            }
        });
    }

    loader();
    page.asyncPaginator = loader;
});

// === Каталог (отдельная страница) ===
new page.Route(PREFIX + ':catalog', function (page) {
    page.type = 'directory';
    page.metadata.title = 'Каталог';
    page.model.contents = 'grid';
    page.loading = true;

    var currentPage = 1;
    page.flush();

    function loader() {
        api.catalog(currentPage, function (err, data, fromCache) {
            page.loading = false;
            if (err) {
                ui.renderError(page, 'Ошибка загрузки каталога');
                page.haveMore(false);
                return;
            }

            var items = fmt.catalog(data);
            ui.renderCatalog(page, items);

            currentPage++;
            var hasMore = data.data && data.data.length >= PAGE_SIZE;
            page.haveMore(hasMore);

            if (fromCache && hasMore && currentPage <= 3) {
                setTimeout(loader, 10);
            }
        });
    }

    loader();
    page.asyncPaginator = loader;
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
        ui.renderSchedule(page, data);
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

// === Выбор зеркала ===
new page.Route(PREFIX + ':select_mirror', function (page, params) {
    page.type = 'directory';
    page.metadata.title = 'Выберите зеркало Anilibria';

    params.mirrors.forEach(function (m) {
        page.appendItem(PREFIX + ':apply_mirror:' + encodeURIComponent(m[0]), 'video', {
            title: m[1],
            description: m[0]
        });
    });
});

new page.Route(PREFIX + ':apply_mirror:(.*)', function (page, url) {
    var decodedUrl = decodeURIComponent(url);
    apiUrlSetting.set(decodedUrl);
    api.setBaseUrl(decodedUrl);
    page.back();
});

// ─────────────────────────────────────────────────────────────────────────────
console.log(plugin.id + ' v' + plugin.version + ' loaded');
