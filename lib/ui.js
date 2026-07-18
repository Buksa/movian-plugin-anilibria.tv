// ============================================================================
// lib/ui.js — Рендеринг страниц Movian
// ============================================================================

var api = require('./api');
var fmt = require('./formatters');

var RichText = fmt.RichText;
var boldStr = fmt.boldStr;
var coloredStr = fmt.coloredStr;

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
    renderRelease: function (page, release, franchise) {
        // Метаданные страницы
        page.type = 'directory';
        page.metadata.title = release.name.main;
        page.metadata.subtitle = release.name.english || '';

        // ImageSet для логотипа страницы с width/height
        var posterImageSet = fmt.coverImageSet(release.poster);
        if (posterImageSet) {
            page.metadata.logo = posterImageSet;
        } else {
            page.metadata.logo = api.COVER_URL +
                (release.poster.preview || release.poster.src);
        }

        // Описание
        if (release.description) {
            separator(page, boldStr('[Info] Описание'));
            var descItem = page.appendPassiveItem("info", null, {
                title: "Overview"
            });
            descItem.root.description = new RichText(release.description);
        }

        // Франшиза
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
        var episodes = fmt.episodes(release);
        if (episodes.length > 0) {
            separator(page, boldStr('[Ep] Эпизоды (' + episodes.length + ')'));
            episodes.forEach(function (ep) {
                var item = page.appendItem(ep.url, ep.type, ep.metadata);
                item.bindVideoMetadata({ title: ep.metadata.title });
            });
        }

        // Торренты
        var torrents = fmt.torrents(release);
        if (torrents.length > 0) {
            separator(page, boldStr('[DL] Торренты'));
            torrents.forEach(function (t) {
                page.appendItem(t.url, t.type, t.metadata);
            });
        }
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
