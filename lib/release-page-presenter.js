// ============================================================================
// lib/release-page-presenter.js — Release route ordering and effects seam
// ============================================================================

function initializePage(page, options) {
    page.type = 'raw';
    page.metadata.glwview = options.viewPath;
    page.metadata.title = 'Загрузка...';
    page.metadata.retryUrl = options.releaseUrl;
    page.model.error = '';
    page.loading = true;
}

function present(page, options) {
    options = options || {};
    initializePage(page, options);

    options.load(options.id, options.logo, function (err, model) {
        if (err) {
            page.metadata.title = 'Не удалось загрузить релиз';
            page.model.error = 'Ошибка загрузки релиза: ' +
                (err.message || String(err));
            page.loading = false;
            return;
        }

        options.render(page, model, options.viewPath, options.releaseUrl);

        var resumeConfig = options.resumeConfig || {};
        if (resumeConfig.enabled) {
            options.resumeFind(page, page.getItems(), {
                autoResume: resumeConfig.autoResume,
                findNext: resumeConfig.findNext,
                delay: resumeConfig.delay
            });
        }
    });
}

module.exports = {
    present: present
};
