// ============================================================================
// anilibria.js — Главный файл плагина Anilibria для Movian
// ============================================================================

var page = require('movian/page');
var service = require('movian/service');
var settings = require('movian/settings');

var api = require('./lib/api');
var fmt = require('./lib/formatters');
var pageEffectsModule = require('./lib/page-effects');
var catalogPageModule = require('./lib/catalog-page-operations');
var settingsStateModule = require('./lib/settings-state');
var releaseRouteModule = require('./lib/release-route');

var plugin = JSON.parse(Plugin.manifest);
var PREFIX = fmt.PREFIX;
var LOGO = Plugin.path + plugin.icon;
var PAGE_SIZE = 25;
var RELEASE_VIEW = Plugin.path + 'views/release.view';
var CATALOG_VIEW = Plugin.path + 'views/grid_video_switcher.view';

var pageEffects = pageEffectsModule.create();
var settingsState = settingsStateModule.create({ api: api, service: service });

var releaseRoute = releaseRouteModule.create();
var catalogPage = catalogPageModule.create({
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

settingsState.bind(settings);

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
