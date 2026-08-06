// ============================================================================
// lib/release-view.js — Release render-model composition
// ============================================================================

var api = require('./api');
var fmt = require('./formatters');
var assets = require('./assets');

function renderModel(release, franchiseData, fallbackLogo, id) {
    return {
        metadata: {
            title: release.name.main,
            subtitle: release.name.english || '',
            logo: assets.imageSet(release.poster) || fallbackLogo
        },
        description: release.description || null,
        franchise: fmt.franchise(franchiseData, id),
        episodes: fmt.episodes(release),
        torrents: fmt.torrents(release)
    };
}

function load(id, fallbackLogo, callback) {
    api.release(id, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        var release = result.data;
        api.franchise(id, function (franchiseErr, franchiseResult) {
            var franchiseData = franchiseErr || !franchiseResult ? null :
                franchiseResult.data;

            callback(null, renderModel(release, franchiseData, fallbackLogo, id));
        });
    });
}

module.exports = {
    load: load
};
