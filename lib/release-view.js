// ============================================================================
// lib/release-view.js — Release fetch adapter
// Model contract:
//   model.metadata.* — page metadata, franchise and normalized torrent groups
//   model.episodes   — the only Movian page nodes
// ============================================================================

function create(dependencies) {
    dependencies = dependencies || {};

    var api = dependencies.api || require('./api');
    var releaseModel = dependencies.model || require('./release-model');
    var log = dependencies.log || require('./log');

    function load(id, fallbackLogo, callback) {
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

            api.franchise(id, function (franchiseErr, franchiseResult) {
                var franchiseData = (franchiseErr || !franchiseResult) ? null :
                    franchiseResult.data || null;

                if (franchiseErr) {
                    log.e('[release-view] franchise error: ' +
                        (franchiseErr.message || String(franchiseErr)));
                }

                callback(null, releaseModel.build(
                    release,
                    franchiseData,
                    fallbackLogo,
                    id
                ));
            });
        });
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
