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
     * Страница релиза (detail page)
     */
    renderRelease: function (page, model) {
        // Метаданные страницы
        page.type = 'directory';
        page.metadata.title = model.metadata.title;
        page.metadata.subtitle = model.metadata.subtitle;
        page.metadata.logo = model.metadata.logo;

        // Описание
        if (model.metadata.description) {
            separator(page, boldStr('[Info] Описание'));
            var descItem = page.appendPassiveItem("info", null, {
                title: "Overview"
            });
            descItem.root.description = new RichText(model.metadata.description);
        }

        // Франшиза
        var franchise = model.metadata.franchise;
        if (franchise) {
            separator(page, franchise.title);
            if (franchise.info) {
                separator(page, franchise.info);
            }
            franchise.releases.forEach(function (item) {
                page.appendItem(item.url, item.type, item.metadata);
            });
        }

        // Эпизоды
        var episodes = model.episodes || [];
        if (episodes.length > 0) {
            episodesMod.renderEpisodes(page, episodes);
        }

        // Торренты (сгруппированы по качеству)
        var byQuality = model.metadata.torrentsByQuality || {};
        ['4K', '1080p', '720p'].forEach(function (q) {
            var list = byQuality[q] || [];
            if (list.length === 0) return;
            separator(page, boldStr('[DL] Торренты ' + q));
            list.forEach(function (t) {
                page.appendItem(t.url, 'list', {
                    title: t.label + ' ' + (t.size || '') + ' | S: ' + (t.seeders || 0) + ' | L: ' + (t.leechers || 0),
                    icon: model.metadata.logo,
                    description: 'Размер: ' + (t.size || '') + ' | Сиды: ' + (t.seeders || 0) + ' | Личи: ' + (t.leechers || 0)
                });
            });
        });
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
