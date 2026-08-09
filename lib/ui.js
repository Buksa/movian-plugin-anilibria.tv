// ============================================================================
// lib/ui.js — Рендеринг страниц Movian
// ============================================================================

var fmt = require('./formatters');
var rt = require('./richtext');
var episodesMod = require('./episodes');

var RichText = rt.RichText;
var boldStr = rt.boldStr;
var coloredStr = rt.coloredStr;

// ─────────────────────────────────────────────────────────────────────────────
// Утилиты
// ─────────────────────────────────────────────────────────────────────────────

function separator(page, title) {
    page.appendItem('', 'separator', {
        title: new RichText(title)
    });
}

function assignMetadata(page, metadata) {
    Object.keys(metadata || {}).forEach(function (key) {
        page.metadata[key] = metadata[key];
    });
}

module.exports = {
    separator: separator,

    /**
     * Каталог аниме
     */
    renderCatalog: function (page, items) {
        if (!items || items.length === 0) {
            separator(page, coloredStr('[!] Нет данных', '#FF0000'));
            return;
        }

        items.forEach(function (item) {
            page.appendItem(item.url, item.type, item.metadata);
        });
    },

    /**
     * Project a release render-model onto a route-owned raw page.
     *
     * Only episodes become page nodes. Franchise and torrent collections stay
     * under metadata for the custom GLW view, so node semantics remain stable
     * for resume/history and external metadata binding.
     */
    renderRelease: function (page, model, viewPath, retryUrl) {
        page.type = 'raw';
        assignMetadata(page, model.metadata);
        page.metadata.glwview = viewPath;
        page.metadata.retryUrl = retryUrl;
        page.model.error = '';
        // Expose the content before adding focusable episode clones so GLW can
        // assign initial focus to the highest-weight row as it is created.
        page.loading = false;
        return episodesMod.renderEpisodes(page, model.episodes || []);
    },

    /**
     * Расписание
     */
    renderSchedule: function (page, scheduleData) {
        var days = fmt.schedule(scheduleData);

        days.forEach(function (day) {
            if (day.items.length > 0) {
                separator(page, boldStr('--- ' + day.day + ' ---'));
                day.items.forEach(function (item) {
                    page.appendItem(item.url, item.type, item.metadata);
                });
            }
        });
    },

    /**
     * Результаты поиска
     */
    renderSearch: function (page, items) {
        if (!items || items.length === 0) {
            separator(page, coloredStr('[!] Ничего не найдено', '#FF0000'));
            separator(page, 'Попробуйте изменить поисковый запрос');
            return;
        }

        items.forEach(function (item) {
            page.appendItem(item.url, item.type, item.metadata);
            page.entries++;
        });
    },

    /**
     * Ошибка
     */
    renderError: function (page, message) {
        separator(page, coloredStr('[!] Ошибка', '#FF0000'));
        separator(page, message);
    }
};
