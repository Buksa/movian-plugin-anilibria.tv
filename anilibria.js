// ============================================================================
// anilibria.js — Главный файл плагина Anilibria для Movian
// ============================================================================

var page = require('movian/page');
var service = require('movian/service');
var settings = require('movian/settings');

var api = require('./lib/api');
var fmt = require('./lib/formatters');
var pageEffectsModule = require('./lib/page-effects');
var catalogPageModule = require('./lib/catalog-page');
var watchedEpisode = require('./lib/watched-episode');
var releaseRoute = require('./lib/release-route');
var log = require('./lib/log');

var plugin = JSON.parse(Plugin.manifest);
var PREFIX = fmt.PREFIX;
var LOGO = Plugin.path + plugin.icon;
var PAGE_SIZE = 25;
var RELEASE_VIEW = Plugin.path + 'views/release.view';
var CATALOG_VIEW = Plugin.path + 'views/grid_video_switcher.view';

var pageEffects = pageEffectsModule.create();
var catalogPage = catalogPageModule.create({
    sources: {
        catalog: function (pageNumber, callback) {
            api.catalog(pageNumber, callback);
        },
        search: function (query, pageNumber, callback) {
            api.search(query, pageNumber, callback);
        },
        schedule: function (callback) {
            api.schedule(callback);
        }
    },
    effects: {
        catalog: pageEffects.catalog,
        search: pageEffects.search,
        schedule: pageEffects.schedule,
        error: pageEffects.error
    },
    logo: LOGO,
    catalogView: CATALOG_VIEW,
    pageSize: PAGE_SIZE,
    pluginTitle: plugin.title
});

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
new page.Searcher(plugin.title, LOGO, function (page, query) {
    catalogPage.search(page, query);
});

// === Главная и каталог ===
new page.Route(PREFIX + ':start', function (page) {
    catalogPage.catalog(page, 'Anilibria');
});

new page.Route(PREFIX + ':catalog', function (page) {
    catalogPage.catalog(page, 'Каталог');
});

// === Расписание ===
new page.Route(PREFIX + ':schedule', function (page) {
    catalogPage.schedule(page);
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
