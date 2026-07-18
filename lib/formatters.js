// ============================================================================
// lib/formatters.js — Преобразование данных API в Movian-структуры
// ============================================================================

var api = require('./api');

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

function coverUrl(poster) {
    if (!poster) return undefined;
    return api.COVER_URL + (poster.preview || poster.src || poster.optimized || '');
}

function coverUrls(poster) {
    if (!poster) return undefined;
    
    var urls = [];
    var baseUrl = api.COVER_URL;
    
    // Приоритет: preview → src → optimized
    if (poster.preview) urls.push(baseUrl + poster.preview);
    if (poster.src) urls.push(baseUrl + poster.src);
    if (poster.optimized) urls.push(baseUrl + poster.optimized);
    
    // Добавить зеркала CDN для надежности (если настроены)
    if (urls.length > 0 && api.MIRROR_COVER_URL) {
        var mirrorUrls = urls.map(function(url) {
            return url.replace(baseUrl, api.MIRROR_COVER_URL);
        });
        urls = urls.concat(mirrorUrls);
    }
    
    return urls.length > 0 ? urls : undefined;
}

function buildImageSet(basePath, sizes) {
    var images = [];
    for (var i = 0; i < sizes.length; i++) {
        var size = sizes[i];
        images.push({
            url: basePath + size.suffix,
            width: size.width,
            height: size.height
        });
    }
    return 'imageset:' + JSON.stringify(images);
}

function coverImageSet(poster) {
    if (!poster) return undefined;

    var baseUrl = api.COVER_URL;
    var mirrorUrl = api.MIRROR_COVER_URL;
    var images = [];

    // API v1: poster.optimized = { thumbnail: '.webp', preview: '.webp', src: '.webp' }
    var opt = poster.optimized || {};

    // Medium: WebP preview first, fallback to jpg src
    var medium = (opt.preview || opt.src || poster.src || poster.preview || '');
    // Large: WebP src first, fallback to jpg src
    var large = (opt.src || poster.src || poster.preview || '');

    var sizes = [
        { suffix: medium, width: 400, height: 600 },
        { suffix: large,  width: 600, height: 900 }
    ];

    // Main CDN
    for (var i = 0; i < sizes.length; i++) {
        if (sizes[i].suffix) {
            images.push({
                url: baseUrl + sizes[i].suffix,
                width: sizes[i].width,
                height: sizes[i].height
            });
        }
    }

    // Mirror CDN for resilience
    if (mirrorUrl) {
        for (var i = 0; i < sizes.length; i++) {
            if (sizes[i].suffix) {
                images.push({
                    url: mirrorUrl + sizes[i].suffix,
                    width: sizes[i].width,
                    height: sizes[i].height
                });
            }
        }
    }

    return images.length > 0 ? ('imageset:' + JSON.stringify(images)) : undefined;
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
                icon: coverImageSet(item.poster),  // ← ImageSet с width/height
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
                    //icon: coverImageSet(ep.preview),
                    icon: coverImageSet(release.poster),
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
                    icon: coverImageSet(release.poster),
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
                        icon: coverImageSet(r.poster)  // ← ImageSet для франшиз
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
    
    // Экспорт функций для ImageSet
    coverImageSet: coverImageSet,
    coverUrls: coverUrls,
    coverUrl: coverUrl,

    // Экспорт RichText и хелперов
    RichText: RichText,
    boldStr: boldStr,
    coloredStr: coloredStr,
    sizedStr: sizedStr
};
