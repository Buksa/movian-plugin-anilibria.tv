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
    var render = dependencies.render;
    var watchedScan = dependencies.watchedScan;

    if (!load) load = require('./release-view').load;
    if (!render) render = require('./ui').renderRelease;
    if (!watchedScan) watchedScan = require('./watched-episode').scan;

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

            render(page, model, options.viewPath, options.releaseUrl);
            watchedScan(page);
        });
    }

    return { present: present };
}

var defaultRoute;

function present(page, options) {
    if (!defaultRoute) defaultRoute = create();
    defaultRoute.present(page, options);
}

module.exports = {
    present: present,
    create: create
};
