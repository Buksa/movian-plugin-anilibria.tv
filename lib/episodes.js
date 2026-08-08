// ============================================================================
// lib/episodes.js — Episode list renderer for release pages
// ============================================================================

var rt = require('./richtext');

function separator(page, title) {
    page.appendItem('', 'separator', {
        title: new rt.RichText(title)
    });
}

function renderEpisodes(page, episodes) {
    if (!episodes || episodes.length === 0) return;

    separator(page, rt.boldStr('[Ep] Эпизоды (' + episodes.length + ')'));

    episodes.forEach(function (ep) {
        var item = page.appendItem(ep.url, ep.type, ep.metadata);
        item.bindVideoMetadata({ title: ep.metadata.title });
    });
}

module.exports = {
    renderEpisodes: renderEpisodes
};
