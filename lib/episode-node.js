// ============================================================================
// lib/episode-node.js — Episode model ↔ Movian page-node adapter
// ============================================================================

var episodePlayback = require('./episode-playback');

function valueOf(value, fallback) {
    if (value === null || typeof value === 'undefined') return fallback;
    try {
        return typeof value.valueOf === 'function' ? value.valueOf() : value;
    } catch (error) {
        return fallback;
    }
}

function append(page, episode) {
    var item = page.appendItem(episode.url, episode.type, episode.metadata);
    item.root.playback = episodePlayback.viewProjection(episode);
    item.root.display = episode.display;
    item.root.episode = episode.episode;
    item.root.duration = episode.duration;
    item.root.canonicalUrl = episode.canonicalUrl;

    if (episode.metadataBinding &&
        typeof item.bindVideoMetadata === 'function') {
        try {
            item.bindVideoMetadata(episode.metadataBinding);
        } catch (error) {
            // External metadata is enrichment. AniLibria playback and display
            // must remain usable while the TVDB adapter is unavailable.
            console.error('[episode-node] bindVideoMetadata failed: ' + error);
        }
    }

    return item;
}

function render(page, episodes) {
    if (!episodes || episodes.length === 0) return [];

    return episodes.map(function (episode) {
        return append(page, episode);
    });
}

function read(item, index) {
    var root = item && item.root;
    var playback = root && root.playback;
    var type = valueOf(root && root.type, null);

    if (type !== 'video') return null;

    var history = {
        playcount: valueOf(root.playcount, 0),
        restartpos: valueOf(root.restartpos, 0)
    };
    var playbackTitle = valueOf(playback && playback.title, undefined);
    var display = root.display || {};
    var metadata = root.metadata || {};
    var title = playbackTitle !== undefined ? playbackTitle :
        valueOf(display.title, valueOf(metadata.title, 'Эпизод'));

    return {
        source: 'page',
        title: title,
        historyTitle: title,
        url: valueOf(root.url, ''),
        canonicalUrl: valueOf(root.canonicalUrl, ''),
        episode: valueOf(playback && playback.episode,
            valueOf(root.episode, 0)),
        duration: valueOf(playback && playback.duration,
            valueOf(root.duration, 0)),
        playcount: history.playcount,
        restartpos: history.restartpos,
        index: index
    };
}

module.exports = {
    render: render,
    read: read
};
