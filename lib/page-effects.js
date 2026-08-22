// ============================================================================
// lib/page-effects.js — Typed Movian page mutations and render policy
// ============================================================================

var fmt = require('./formatters');
var rt = require('./richtext');
var defaultEpisodeNode = require('./episode-node');

var RichText = rt.RichText;
var boldStr = rt.boldStr;
var coloredStr = rt.coloredStr;

function create(dependencies) {
    dependencies = dependencies || {};
    var episodeNode = dependencies.episodeNode || defaultEpisodeNode;

    function separator(page, title) {
        page.appendItem('', 'separator', { title: new RichText(title) });
    }

    function assignMetadata(page, metadata) {
        Object.keys(metadata || {}).forEach(function (key) {
            page.metadata[key] = metadata[key];
        });
    }

    function empty(page, message, hint) {
        separator(page, coloredStr(message, '#FF0000'));
        if (hint) separator(page, hint);
    }

    function error(page, message) {
        empty(page, '[!] Ошибка', message);
    }

    return {
        catalog: function (page, items) {
            if (!items || items.length === 0) {
                empty(page, '[!] Нет данных');
                return;
            }
            items.forEach(function (item) {
                page.appendItem(item.url, item.type, item.metadata);
            });
        },

        release: function (page, model, viewPath, retryUrl) {
            page.type = 'raw';
            assignMetadata(page, model.metadata);
            page.metadata.glwview = viewPath;
            page.metadata.retryUrl = retryUrl;
            page.model.error = '';
            page.loading = false;
            return episodeNode.render(page, model.episodes || []);
        },

        schedule: function (page, scheduleData) {
            fmt.schedule(scheduleData).forEach(function (day) {
                if (day.items.length === 0) return;
                separator(page, boldStr('--- ' + day.day + ' ---'));
                day.items.forEach(function (item) {
                    page.appendItem(item.url, item.type, item.metadata);
                });
            });
        },

        search: function (page, items) {
            if (!items || items.length === 0) {
                empty(page, '[!] Ничего не найдено',
                    'Попробуйте изменить поисковый запрос');
                return;
            }
            items.forEach(function (item) {
                page.appendItem(item.url, item.type, item.metadata);
                page.entries++;
            });
        },

        empty: empty,
        error: error
    };
}

var defaultEffects = create();

module.exports = {
    create: create,
    catalog: defaultEffects.catalog,
    release: defaultEffects.release,
    schedule: defaultEffects.schedule,
    search: defaultEffects.search,
    empty: defaultEffects.empty,
    error: defaultEffects.error
};
