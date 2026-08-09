// ============================================================================
// lib/episodes.js — Episode page-item adapter
// ============================================================================

function renderEpisodes(page, episodes) {
    if (!episodes || episodes.length === 0) return [];

    return episodes.map(function (episode) {
        var item = page.appendItem(episode.url, episode.type, episode.metadata);
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
                console.error('[episodes] bindVideoMetadata failed: ' + error);
            }
        }
        return item;
    });
}

module.exports = {
    renderEpisodes: renderEpisodes
};
