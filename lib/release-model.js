// ============================================================================
// lib/release-model.js — AniLibria payload to release-page model policy
// ============================================================================

var imageSource = require('./image-source');
var utils = require('./utils');
var episodePlayback = require('./episode-playback');
var torrentProjection = require('./torrent-projection');

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
        return episodePlayback.create({
            release: release,
            episode: ep,
            seriesIdentity: seriesIdentity,
            imageSource: imageSource,
            utils: utils
        });
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
                icon: imageSource.poster(release.poster)
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

function composeSections(release, franchiseData, id) {
    var identity = buildSeriesIdentity(release, franchiseData, id);

    return {
        episodes: buildEpisodes(release, identity),
        franchise: buildFranchise(franchiseData, id),
        torrents: torrentProjection.build(release.torrents)
    };
}

function sectionDescriptor(id, count, available) {
    return {
        id: id,
        count: count,
        available: available,
        focusId: 'release-tab-' + id,
        panelId: 'release-panel-' + id
    };
}

function sectionDescriptors(sections) {
    return {
        episodes: sectionDescriptor('episodes', sections.episodes.length, true),
        franchise: sectionDescriptor(
            'franchise',
            sections.franchise.count,
            sections.franchise.count > 0
        ),
        torrents: sectionDescriptor(
            'torrents',
            sections.torrents.count,
            sections.torrents.count > 0
        )
    };
}

function initialTab(sectionState) {
    return sectionState.episodes.count > 0 ? 'episodes' :
        (sectionState.franchise.available ? 'franchise' :
            (sectionState.torrents.available ? 'torrents' : 'episodes'));
}

function buildPageMetadata(release, poster, sections) {
    var sectionState = sectionDescriptors(sections);
    var episodeCount = sectionState.episodes.count;
    var tab = initialTab(sectionState);

    return {
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
        sections: sectionState,
        initialTab: tab,
        activeTab: tab,
        showOverview: false,
        franchise: sections.franchise,
        torrentGroups: sections.torrents.groups
    };
}

function build(release, franchiseData, fallbackLogo, id) {
    var sections = composeSections(release, franchiseData, id);
    var poster = imageSource.poster(release.poster) || fallbackLogo;

    return {
        metadata: buildPageMetadata(release, poster, sections),
        episodes: sections.episodes
    };
}

module.exports = {
    build: build
};
