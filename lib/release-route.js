// ============================================================================
// lib/release-route.js — Release route policy and page effects
// ============================================================================


function initializePage(page, options) {
    page.type = 'raw';
    page.metadata.glwview = options.viewPath;
    page.metadata.title = 'Загрузка...';
    page.metadata.retryUrl = options.releaseUrl;
    page.model.error = '';
    page.loading = true;
}

function create(dependencies) {
    dependencies = dependencies || {};

    var load = dependencies.load;
    var release = dependencies.release;
    var continuation = dependencies.continuation;

    if (!load) load = require('./release-view').load;
    if (!release) release = require('./page-effects').release;
    if (!continuation) {
        continuation = require('./viewing-continuation').create();
    }

    function present(page, options) {
        options = options || {};
        initializePage(page, options);

        load(options.id, options.logo, function (err, model) {
            if (err) {
                page.metadata.title = 'Не удалось загрузить релиз';
                page.model.error = 'Ошибка загрузки релиза: ' +
                    (err.message || String(err));
                page.loading = false;
                return;
            }

            release(page, model, options.viewPath, options.releaseUrl);
            continuation.scan(page);
        });
    }

    return { present: present };
}


module.exports = {
    create: create
};
