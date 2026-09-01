// ============================================================================
// lib/page-effects.js — Typed Movian page mutations and render policy
// ============================================================================

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

    function empty(page, message, hint) {
        separator(page, coloredStr(message, '#FF0000'));
        if (hint) separator(page, hint);
    }

    function error(page, message) {
        empty(page, '[!] Ошибка', message);
    }

    function renderItems(page, items) {
        var count = 0;
        items.forEach(function (item) {
            page.appendItem(item.url, item.type, item.metadata);
            count++;
        });
        return count;
    }

    function renderCollection(page, items, emptyMessage, hint) {
        if (!items || items.length === 0) {
            empty(page, emptyMessage, hint);
            return 0;
        }
        return renderItems(page, items);
    }

    function renderSchedule(page, days) {
        var count = 0;
        (days || []).forEach(function (day) {
            var items = day.items || [];
            if (items.length === 0) return;
            separator(page, boldStr('--- ' + day.day + ' ---'));
            count += renderItems(page, items);
        });
        return count;
    }

    return {
        catalog: function (page, items) {
            return renderCollection(page, items, '[!] Нет данных');
        },

        release: function (page, model, viewPath, retryUrl) {
            return episodeNode.render(page, model.episodes || []);
        },

        schedule: function (page, days) {
            return renderSchedule(page, days);
        },

        search: function (page, items) {
            return renderCollection(page, items, '[!] Ничего не найдено',
                'Попробуйте изменить поисковый запрос');
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
