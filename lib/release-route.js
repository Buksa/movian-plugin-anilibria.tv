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
    var resumeFind = dependencies.resumeFind;
    var resumeConfig = dependencies.resumeConfig;
    var resumeModule;

    if (!load) load = require('./release-view').load;
    if (!render) render = require('./ui').renderRelease;
    if (!resumeFind || !resumeConfig) {
        resumeModule = require('./resume');
        resumeFind = resumeFind || resumeModule.find;
        resumeConfig = resumeConfig || resumeModule.config || {};
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

            render(page, model, options.viewPath, options.releaseUrl);

            if (resumeConfig.enabled) {
                resumeFind(page, page.getItems(), {
                    autoResume: resumeConfig.autoResume,
                    findNext: resumeConfig.findNext,
                    delay: resumeConfig.delay
                });
            }
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
