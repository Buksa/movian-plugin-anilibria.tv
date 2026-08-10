// ============================================================================
// lib/release-model.js — AniLibria payload to release-page model policy
// ============================================================================

var assets = require('./assets');
var utils = require('./utils');

function firstFranchise(data) {
    if (!data || !data[0] || !data[0].franchise_releases) return null;
    return typeof data[0].franchise_releases.map === 'function' ? data[0] : null;
}

function activeFranchiseEntry(franchise, currentId) {
    if (!franchise) return null;
    for (var i = 0; i < franchise.franchise_releases.length; i++) {
        var entry = franchise.franchise_releases[i];
        if (entry && entry.release && entry.release.id == currentId) return entry;
    }
    return null;
}

function normalizedName(value) {
    return String(value || '').toLowerCase()
        .replace(/[\s_-]+/g, ' ')
        .replace(/^\s+|\s+$/g, '');
}

function explicitSeasonNumber(release) {
    var name = release.name || {};
    var candidates = [name.english, name.main, release.alias];
    var patterns = [
        /(?:^|[\s_-])season[\s_-]*(\d+)(?:$|[\s_-])/i,
        /(?:^|[\s_-])(\d+)(?:st|nd|rd|th)[\s_-]+season(?:$|[\s_-])/i,
        /(?:^|[\s_-])сезон[\s_-]*(\d+)(?:$|[\s_-])/i
    ];

    for (var i = 0; i < candidates.length; i++) {
        if (!candidates[i]) continue;
        for (var j = 0; j < patterns.length; j++) {
            var match = patterns[j].exec(candidates[i]);
            if (match) return Number(match[1]);
        }
    }
    return null;
}

function isEpisodicRelease(release) {
    var value = release.type && release.type.value;
    return (value === 'TV' || value === 'ONA' || value === 'WEB') &&
        release.episodes && release.episodes.length > 0;
}

function buildSeriesIdentity(release, franchiseData, currentId) {
    var franchise = firstFranchise(franchiseData);
    var active = activeFranchiseEntry(franchise, currentId);
    var releaseName = release.name || {};
    var title = franchise && (franchise.name_english || franchise.name);
    var explicitSeason = explicitSeasonNumber(release);
    var order = active && Number(active.sort_order);
    var season = null;

    title = title || releaseName.english || releaseName.main || '';

    if (explicitSeason && (!order || order === explicitSeason)) {
        season = explicitSeason;
    } else if (!explicitSeason && order === 1 && franchise &&
        isEpisodicRelease(release)) {
        var sameEnglish = normalizedName(franchise.name_english) &&
            normalizedName(franchise.name_english) === normalizedName(releaseName.english);
        var sameMain = normalizedName(franchise.name) &&
            normalizedName(franchise.name) === normalizedName(releaseName.main);
        if (sameEnglish || sameMain) season = 1;
    }

    return {
        title: title,
        season: season
    };
}

function buildEpisodes(release, seriesIdentity) {
    if (!release.episodes) return [];

    return release.episodes.map(function (ep) {
        var sources = [];
        if (ep.hls_1080) sources.push({ url: 'hls:' + ep.hls_1080, title: '1080p' });
        if (ep.hls_720) sources.push({ url: 'hls:' + ep.hls_720, title: '720p' });
        if (ep.hls_480) sources.push({ url: 'hls:' + ep.hls_480, title: '480p' });
        if (sources.length === 0) return null;

        var episodeNumber = Number(ep.ordinal);
        var displayTitle = ep.name || 'Эпизод ' + episodeNumber;
        var durationText = ep.duration ? utils.duration(ep.duration) : '';
        var releaseTitle = (release.name && (release.name.english || release.name.main)) || '';
        var playbackTitle = releaseTitle ?
            releaseTitle + ' — ' + displayTitle : displayTitle;
        var canonicalUrl = 'anilibria:release:' + release.id + ':' + episodeNumber;
        var preview = assets.episodeImageSet(ep.preview, release.poster);
        var metadataBinding = null;

        if (seriesIdentity.title && seriesIdentity.season !== null) {
            metadataBinding = {
                title: seriesIdentity.title,
                season: seriesIdentity.season,
                episode: episodeNumber,
                duration: ep.duration || -1,
                year: release.year || -1
            };
        }

        return {
            url: 'videoparams:' + JSON.stringify({
                canonicalUrl: canonicalUrl,
                no_fs_scan: true,
                title: playbackTitle,
                sources: sources
            }),
            canonicalUrl: canonicalUrl,
            type: 'video',
            episode: episodeNumber,
            duration: ep.duration || 0,
            display: {
                title: displayTitle,
                subtitle: 'Эпизод ' + episodeNumber,
                preview: preview,
                episode: episodeNumber,
                duration: ep.duration || 0,
                durationText: durationText
            },
            metadata: {
                title: displayTitle,
                icon: preview,
                description: durationText,
                duration: ep.duration || 0
            },
            metadataBinding: metadataBinding
        };
    }).filter(function (item) {
        return item !== null;
    });
}

function releaseInfo(release) {
    return [
        release.year,
        release.type && release.type.description,
        release.episodes_total ? release.episodes_total + ' эпизодов' : null,
        release.is_ongoing ? 'Онгоинг' : 'Завершён'
    ].filter(Boolean).join(' · ');
}

function emptyFranchise() {
    return {
        title: 'Франшиза',
        info: null,
        count: 0,
        releases: []
    };
}

function buildFranchise(data, currentId) {
    var franchise = firstFranchise(data);
    if (!franchise) return emptyFranchise();

    var releases = franchise.franchise_releases.map(function (entry) {
        var release = entry && entry.release;
        if (!release || !release.name || typeof release.name.main === 'undefined') {
            return null;
        }

        return {
            url: 'anilibria:release:' + release.id,
            type: 'list',
            active: release.id == currentId,
            metadata: {
                title: release.name.main +
                    (release.name.english ? ' (' + release.name.english + ')' : ''),
                description: releaseInfo(release),
                icon: assets.imageSet(release.poster)
            }
        };
    }).filter(function (item) {
        return item !== null;
    });

    if (releases.length === 0) return emptyFranchise();

    return {
        title: 'Франшиза: ' + franchise.name +
            (franchise.name_english ? ' (' + franchise.name_english + ')' : ''),
        info: [
            franchise.first_year && franchise.last_year ?
                franchise.first_year + '-' + franchise.last_year : null,
            franchise.total_releases ? franchise.total_releases + ' релизов' : null,
            franchise.total_episodes ? franchise.total_episodes + ' эпизодов' : null
        ].filter(Boolean).join(' · '),
        count: releases.length,
        releases: releases
    };
}

function qualityLabel(torrent) {
    var raw = torrent.quality && (torrent.quality.value || torrent.quality.description);
    raw = raw || torrent.label || '';
    if (/2160|4K/i.test(raw)) return '4K';
    if (/1080/i.test(raw)) return '1080p';
    if (/720/i.test(raw)) return '720p';
    return 'Другое';
}

function codecLabel(torrent) {
    var codec = torrent.codec && (torrent.codec.label || torrent.codec.value);
    if (codec) return codec;
    if (/HEVC|H\.?265|x265/i.test(torrent.label || '')) return 'HEVC';
    if (/AVC|H\.?264|x264/i.test(torrent.label || '')) return 'AVC';
    return 'Другой';
}

function codecRank(codec) {
    if (/AVC/i.test(codec)) return 0;
    if (/HEVC/i.test(codec)) return 1;
    return 2;
}

function shortTorrentLabel(torrent) {
    var label = torrent.label || '';
    var title = label.split(/\s+-\s+Ani(?:Liberty|Libria)[^[]*/i)[0] || label;
    var format = torrent.type && (torrent.type.description || torrent.type.value);
    var range = torrent.description;
    if (!range) {
        var match = /\[(\d+\s*[-–]\s*\d+)\]\s*$/.exec(label);
        range = match && match[1];
    }
    return [
        title,
        format,
        range ? 'Эпизоды ' + range : null
    ].filter(Boolean).join(' · ');
}

function torrentItem(torrent) {
    var codec = codecLabel(torrent);
    var seeders = Number(torrent.seeders) || 0;
    var leechers = Number(torrent.leechers) || 0;
    var bitrate = Number(torrent.bitrate) || 0;
    var bitDepth = torrent.color &&
        (torrent.color.description || torrent.color.value) || '';

    return {
        url: 'torrent:browse:' + torrent.magnet,
        type: 'list',
        label: torrent.label || '',
        shortLabel: shortTorrentLabel(torrent),
        quality: qualityLabel(torrent),
        codec: codec,
        codecRank: codecRank(codec),
        bitDepth: bitDepth,
        hardsub: !!torrent.is_hardsub,
        hardsubText: torrent.is_hardsub ? 'Hardsub' : '',
        bitrate: bitrate,
        bitrateText: bitrate ? bitrate + ' kb/s' : '',
        size: Number(torrent.size) || 0,
        sizeText: utils.fileSize(torrent.size),
        seeders: seeders,
        seedersText: 'S:' + seeders,
        leechers: leechers,
        leechersText: 'L:' + leechers,
        noSeeders: seeders === 0,
        episodeRange: torrent.description || ''
    };
}

function buildTorrentGroups(release) {
    var groups = {};
    var count = 0;
    var order = ['4K', '1080p', '720p', 'Другое'];
    var torrents = release.torrents || [];

    torrents.forEach(function (torrent) {
        var item = torrentItem(torrent);
        if (!groups[item.quality]) groups[item.quality] = [];
        groups[item.quality].push(item);
        count++;
    });

    var result = [];
    order.forEach(function (quality) {
        var items = groups[quality] || [];
        if (items.length === 0) return;
        items.sort(function (a, b) {
            return a.codecRank - b.codecRank || b.seeders - a.seeders;
        });
        result.push({
            quality: quality,
            items: items
        });
    });

    return {
        count: count,
        groups: result
    };
}

function build(release, franchiseData, fallbackLogo, id) {
    var identity = buildSeriesIdentity(release, franchiseData, id);
    var episodes = buildEpisodes(release, identity);
    var franchise = buildFranchise(franchiseData, id);
    var torrents = buildTorrentGroups(release);
    var poster = assets.imageSet(release.poster) || fallbackLogo;
    var episodeCount = episodes.length;
    var franchiseCount = franchise.count;
    var torrentCount = torrents.count;
    var initialTab = episodeCount > 0 ? 'episodes' :
        (franchiseCount > 0 ? 'franchise' :
            (torrentCount > 0 ? 'torrents' : 'episodes'));

    return {
        metadata: {
            title: release.name.main,
            subtitle: release.name.english || '',
            logo: poster,
            description: release.description || '',
            year: release.year,
            status: release.is_ongoing ? 'Онгоинг' : 'Завершён',
            genres: release.genres ? release.genres.map(function (genre) {
                return genre.name || genre;
            }).join(', ') : '',
            episodes_total: release.episodes_total === null ||
                typeof release.episodes_total === 'undefined' ?
                episodeCount : release.episodes_total,
            status_ongoing: !!release.is_ongoing,
            rating: release.rating,
            ageRating: release.age_rating ?
                (release.age_rating.label || release.age_rating) : '',
            poster: poster,
            poster_landscape: poster,
            episodeCount: episodeCount,
            franchiseCount: franchiseCount,
            torrentCount: torrentCount,
            hasSecondaryTabs: franchiseCount > 0 || torrentCount > 0,
            initialTab: initialTab,
            activeTab: initialTab,
            showOverview: false,
            resumeCandidate: {
                available: false,
                url: '',
                title: '',
                progress: 0
            },
            franchise: franchise,
            torrentGroups: torrents.groups
        },
        episodes: episodes
    };
}

module.exports = {
    build: build
};
