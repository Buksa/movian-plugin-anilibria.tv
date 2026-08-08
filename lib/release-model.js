// ============================================================================
// lib/release-model.js — Release payload to render-model policy
// ============================================================================

var assets = require('./assets');
var rt = require('./richtext');
var utils = require('./utils');

function buildEpisodes(release) {
    if (!release.episodes) return [];

    return release.episodes.map(function (ep) {
        var num = ep.ordinal < 10 ? '0' + ep.ordinal : '' + ep.ordinal;
        var engName = (release.name && release.name.english) ||
            (release.name && release.name.main) || '';
        var title = engName + ' S01E' + num;
        var sources = [];

        if (ep.hls_1080) sources.push({ url: 'hls:' + ep.hls_1080, title: '1080p' });
        if (ep.hls_720) sources.push({ url: 'hls:' + ep.hls_720, title: '720p' });
        if (ep.hls_480) sources.push({ url: 'hls:' + ep.hls_480, title: '480p' });
        if (sources.length === 0) return null;

        var videoParams = {
            canonicalUrl: 'anilibria:release:' + release.id + ':' + ep.ordinal,
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
                description: ep.duration ? 'Длительность: ' + utils.duration(ep.duration) : ''
            }
        };
    }).filter(function (item) { return item !== null; });
}

function buildFranchise(data, currentId) {
    if (!data || !data[0] || !data[0].franchise_releases) return null;

    var fr = data[0];
    var entries = fr.franchise_releases;
    if (typeof entries.map !== 'function') return null;

    var releases = entries.map(function (item) {
        var r = item && item.release;
        if (!r || !r.name || typeof r.name.main === 'undefined') return null;

        var info = [
            r.year,
            r.type && r.type.description,
            r.season && r.season.description
        ].filter(Boolean).join(' | ');
        var isActive = r.id == currentId;
        var title = r.name.main + (r.name.english ? ' (' + r.name.english + ')' : '');

        if (isActive) {
            title = new rt.RichText('<b>' +
                rt.coloredStr('[*] ' + title + ' [Активный]', '#FFFF00') + '</b>');
        }

        return {
            url: 'anilibria:release:' + r.id,
            type: 'list',
            metadata: {
                title: title,
                description: info,
                icon: assets.imageSet(r.poster)
            }
        };
    }).filter(function (item) { return item !== null; });

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
}

function buildPosterLandscape(release) {
    if (!release.poster) return '';
    var opt = release.poster.optimized || {};
    return opt.preview || opt.src || release.poster.src || release.poster.preview || '';
}

function buildTorrentsByQuality(release) {
    var torrents = release.torrents || [];
    var byQuality = { '4K': [], '1080p': [], '720p': [] };

    torrents.forEach(function (t) {
        var label = t.label || '';
        var quality = '720p';
        if (label.indexOf('2160') !== -1 || label.indexOf('4K') !== -1) quality = '4K';
        else if (label.indexOf('1080') !== -1) quality = '1080p';
        else if (label.indexOf('720') !== -1) quality = '720p';

        byQuality[quality].push({
            label: t.label,
            size: t.size,
            seeders: t.seeders,
            leechers: t.leechers,
            url: 'torrent:browse:' + t.magnet
        });
    });

    return byQuality;
}

function emptyFranchise() {
    return {
        title: 'Франшиза',
        info: null,
        releases: []
    };
}

function build(release, franchiseData, fallbackLogo, id) {
    return {
        metadata: {
            title: release.name.main,
            subtitle: release.name.english || '',
            logo: assets.imageSet(release.poster) || fallbackLogo,
            description: release.description || '',
            year: release.year,
            status: release.is_ongoing ? 'Онгоинг' : 'Завершён',
            genres: release.genres ? release.genres.map(function (g) {
                return g.name || g;
            }).join(', ') : '',
            episodes_total: release.episodes_total,
            status_ongoing: release.is_ongoing,
            rating: release.rating,
            ageRating: release.age_rating ? (release.age_rating.label || release.age_rating) : '',
            poster: release.poster ? release.poster.src : '',
            poster_landscape: buildPosterLandscape(release),
            torrentsByQuality: buildTorrentsByQuality(release),
            franchise: buildFranchise(franchiseData, id) || emptyFranchise()
        },
        episodes: buildEpisodes(release),
        resumeCandidate: null
    };
}

module.exports = {
    build: build
};
