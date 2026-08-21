// ============================================================================
// lib/episode-playback.js — Single episode identity, media and playback policy
// ============================================================================

function create(options) {
    var release = options.release;
    var episode = options.episode;
    var seriesIdentity = options.seriesIdentity || { title: '', season: null };
    var assets = options.assets;
    var utils = options.utils;
    var sources = [];

    if (episode.hls_1080) sources.push({ url: 'hls:' + episode.hls_1080, title: '1080p' });
    if (episode.hls_720) sources.push({ url: 'hls:' + episode.hls_720, title: '720p' });
    if (episode.hls_480) sources.push({ url: 'hls:' + episode.hls_480, title: '480p' });
    if (sources.length === 0) return null;

    var number = Number(episode.ordinal);
    var title = episode.name || 'Эпизод ' + number;
    var duration = episode.duration || 0;
    var durationText = duration ? utils.duration(duration) : '';
    var releaseTitle = (release.name &&
        (release.name.english || release.name.main)) || '';
    var playbackTitle = releaseTitle ? releaseTitle + ' — ' + title : title;
    var canonicalUrl = 'anilibria:release:' + release.id + ':' + number;
    var preview = assets.episodeImageSet(episode.preview, release.poster);
    var metadataBinding = null;

    if (seriesIdentity.title && seriesIdentity.season !== null) {
        metadataBinding = {
            title: seriesIdentity.title,
            season: seriesIdentity.season,
            episode: number,
            duration: episode.duration || -1,
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
        type: 'video',
        canonicalUrl: canonicalUrl,
        episode: number,
        duration: duration,
        display: {
            title: title,
            subtitle: 'Эпизод ' + number,
            preview: preview,
            episode: number,
            duration: duration,
            durationText: durationText
        },
        metadata: {
            title: title,
            icon: preview,
            description: durationText,
            duration: duration
        },
        playback: {
            canonicalUrl: canonicalUrl,
            episode: number,
            title: title,
            subtitle: 'Эпизод ' + number,
            preview: preview,
            duration: duration,
            durationText: durationText
        },
        metadataBinding: metadataBinding
    };
}

function viewProjection(episode) {
    if (episode.playback) return episode.playback;
    return {
        canonicalUrl: episode.canonicalUrl,
        episode: episode.episode,
        title: episode.display.title,
        subtitle: episode.display.subtitle,
        preview: episode.display.preview,
        duration: episode.duration,
        durationText: episode.display.durationText
    };
}

module.exports = {
    create: create,
    viewProjection: viewProjection
};
