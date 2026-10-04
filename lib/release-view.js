// ============================================================================
// lib/release-view.js — Release fetch adapter
// Model contract:
//   model.metadata.* — page metadata, franchise and normalized torrent groups
//   model.episodes   — the only Movian page nodes
// ============================================================================

function create(dependencies) {
    dependencies = dependencies || {};

    var api = dependencies.api || require('./api');
    var projection = dependencies.projection ||
        require('./release-page-projection');
    var log = dependencies.log || require('./log');

    function complete(id, fallbackLogo, release, franchiseData, callback) {
        callback(null, projection.project({
            release: release,
            franchiseData: franchiseData,
            fallbackLogo: fallbackLogo,
            currentId: id
        }));
    }

    function loadOptional(id, fallbackLogo, release, callback) {
        api.franchise(id, function (err, result) {
            var franchiseData = (err || !result) ? null : result.data || null;

            if (err) {
                log.e('[release-view] franchise error: ' +
                    (err.message || String(err)));
            }

            complete(id, fallbackLogo, release, franchiseData, callback);
        });
    }

    function loadRequired(id, fallbackLogo, callback) {
        api.release(id, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            var release = result && result.data;
            if (!release || typeof release !== 'object' || Array.isArray(release)) {
                callback(new Error('Release payload is unavailable'));
                return;
            }

            loadOptional(id, fallbackLogo, release, callback);
        });
    }

    function load(id, fallbackLogo, callback) {
        loadRequired(id, fallbackLogo, callback);
    }

    return { load: load };
}

var defaultLoader;

function load(id, fallbackLogo, callback) {
    if (!defaultLoader) defaultLoader = create();
    defaultLoader.load(id, fallbackLogo, callback);
}

module.exports = {
    create: create,
    load: load
};
