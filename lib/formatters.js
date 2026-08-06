// ============================================================================
// lib/formatters.js — Преобразование данных API в Movian-структуры
// ============================================================================

var assets = require('./assets');

var PREFIX = 'anilibria';

// ─────────────────────────────────────────────────────────────────────────────
// RichText класс для форматированного текста (API v2)
// ─────────────────────────────────────────────────────────────────────────────

function RichText(x) {
    this.str = x.toString();
}

RichText.prototype.toRichString = function() {
    return this.str;
};

RichText.prototype.concat = function(other) {
    this.str += other.toString();
    return this;
};

function boldStr(str) {
    return '<b>' + (str || '') + '</b>';
}

function coloredStr(str, color) {
    // Только HEX цвета для Movian
    return '<font color="' + color + '">' + (str || '') + '</font>';
}

function sizedStr(str, size) {
    return '<font size="' + size + '">' + (str || '') + '</font>';
}

// ─────────────────────────────────────────────────────────────────────────────
// Утилиты
// ─────────────────────────────────────────────────────────────────────────────

function duration(seconds) {
    if (!seconds) return '';
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ' мин ' + (s > 0 ? s + ' сек' : '');
}

function fileSize(bytes) {
    if (!bytes) return '';
    var units = ['B', 'KB', 'MB', 'GB'];
    var size = bytes;
    var i = 0;
    while (size >= 1024 && i < 3) { size /= 1024; i++; }
    return size.toFixed(1) + ' ' + units[i];
}

function truncate(text, max) {
    if (!text || text.length <= max) return text || '';
    var t = text.substring(0, max - 3);
    var sp = t.lastIndexOf(' ');
    if (sp > max * 0.8) t = t.substring(0, sp);
    return t + '...';
}

function rating(favorites) {
    if (!favorites) return undefined;
    return Math.min(100, Math.round(Math.log(favorites + 1) / Math.log(10) * 20));
}

// ─────────────────────────────────────────────────────────────────────────────
// Публичные форматтеры
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
    PREFIX: PREFIX,

    /**
     * Элемент каталога → Movian item descriptor
     */
    catalogItem: function (item) {
        var genres = item.genres ?
            item.genres.slice(0, 3).map(function (g) { return g.name || g; }).join(', ') :
            undefined;

        return {
            url: PREFIX + ':release:' + item.id,
            type: 'video',
            metadata: {
                title: (item.name && item.name.main) || 'Без названия',
                description: truncate(item.description || '', 200),
                icon: assets.imageSet(item.poster),  // ← ImageSet с width/height
                year: item.year,
                genre: genres,
                rating: rating(item.added_in_users_favorites),
                duration: item.average_duration_of_episode && item.episodes_total ?
                    item.average_duration_of_episode * item.episodes_total * 60 : undefined
            }
        };
    },

    /**
     * Массив каталога → массив Movian item descriptors
     */
    catalog: function (data) {
        if (!data || !data.data) return [];
        var self = this;
        return data.data.map(function (item) { return self.catalogItem(item); });
    },

    /**
     * Эпизоды релиза → массив Movian video items с multi-source videoparams
     */
    episodes: function (release) {
        if (!release.episodes) return [];

        return release.episodes.map(function (ep) {
            var num = ep.ordinal < 10 ? '0' + ep.ordinal : '' + ep.ordinal;
            var engName = (release.name && release.name.english) || (release.name && release.name.main) || '';
            var title = engName + ' S01E' + num;

            // Multi-source: Movian выбирает лучшее качество автоматически
            var sources = [];
            if (ep.hls_1080) sources.push({ url: 'hls:' + ep.hls_1080, title: '1080p' });
            if (ep.hls_720) sources.push({ url: 'hls:' + ep.hls_720, title: '720p' });
            if (ep.hls_480) sources.push({ url: 'hls:' + ep.hls_480, title: '480p' });

            if (sources.length === 0) return null;

            var videoParams = {
                canonicalUrl: PREFIX + ':release:' + release.id + ':' + ep.ordinal,
                no_fs_scan: true,
                title: title,
                sources: sources
            };

            return {
                url: 'videoparams:' + JSON.stringify(videoParams),
                type: 'video',
                metadata: {
                    title: title,
                    icon: assets.imageSet(release.poster),
                    description: ep.duration ? 'Длительность: ' + duration(ep.duration) : ''
                }
            };
        }).filter(function (item) { return item !== null; });
    },

    /**
     * Торренты → массив Movian items
     */
    torrents: function (release) {
        if (!release.torrents) return [];

        return release.torrents.map(function (t) {
            var size = fileSize(t.size);
            return {
                url: 'torrent:browse:' + t.magnet,
                type: 'list',
                metadata: {
                    title: t.label + ' ' + size + ' | S: ' + t.seeders + ' | L: ' + t.leechers,
                    icon: assets.imageSet(release.poster),
                    description: 'Размер: ' + size + ' | Сиды: ' + t.seeders + ' | Личи: ' + t.leechers
                }
            };
        });
    },

    /**
     * Франшиза → объект {title, info, releases[]} или null
     */
    franchise: function (data, currentId) {
        if (!data || !data[0] || !data[0].franchise_releases) return null;

        var fr = data[0];
        var releases = fr.franchise_releases
            .map(function (item) {
                var r = item.release;
                var info = [
                    r.year,
                    r.type && r.type.description,
                    r.season && r.season.description
                ].filter(Boolean).join(' | ');

                var isActive = r.id == currentId;
                var title = r.name.main + (r.name.english ? ' (' + r.name.english + ')' : '');
                
                // Добавляем пометку для активного релиза с RichText
                if (isActive) {
                    title = new RichText('<b>' + coloredStr('[*] ' + title + ' [Активный]', '#FFFF00')+'</b>');
                }

                return {
                    url: PREFIX + ':release:' + r.id,
                    type: 'list',
                    metadata: {
                        title: title,
                        description: info,
                        icon: assets.imageSet(r.poster)  // ← ImageSet для франшиз
                    }
                };
            });

        if (releases.length === 0) return null;

        return {
            title: 'Франшиза: ' + fr.name + (fr.name_english ? ' (' + fr.name_english + ')' : ''),
            info: [
                fr.first_year && fr.last_year ? fr.first_year + '-' + fr.last_year : null,
                fr.total_releases ? fr.total_releases + ' релизов' : null,
                fr.total_episodes ? fr.total_episodes + ' эпизодов' : null
            ].filter(Boolean).join(' | '),
            releases: releases
        };
    },

    /**
     * Расписание → массив {day, items[]}
     * API v1 returns { data: [{ release: {...}, published_release_episode: {...} }] }
     */
    schedule: function (data) {
        if (!data || !data.length) return [];

        var self = this;
        var items = data.map(function (item) {
            var release = item.release || item;
            return self.catalogItem(release);
        });

        return [{ day: 'Расписание', items: items }];
    },
    

    // Экспорт RichText и хелперов
    RichText: RichText,
    boldStr: boldStr,
    coloredStr: coloredStr,
    sizedStr: sizedStr
};
