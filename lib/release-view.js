// ============================================================================
// lib/release-view.js — Release fetch adapter
// Model contract:
//   model.metadata.* — page metadata, franchise and normalized torrent groups
//   model.episodes   — the only Movian page nodes
// ============================================================================

var api = require('./api');
var releaseModel = require('./release-model');

function load(id, fallbackLogo, callback) {
    api.release(id, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        var release = result.data;
        api.franchise(id, function (franchiseErr, franchiseResult) {
            var franchiseData = (franchiseErr || !franchiseResult) ? null :
                franchiseResult.data;

            if (franchiseErr) {
                console.error('[release-view] franchise error:', franchiseErr.message);
            }

            callback(null, releaseModel.build(release, franchiseData, fallbackLogo, id));
        });
    });
}

module.exports = {
    load: load
};
