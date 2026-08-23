// ============================================================================
// lib/settings-state.js — Plugin settings binding and update policy
// ============================================================================

var DEFAULT_API_URL = 'https://api.anilibria.app/api/v1';

function text(value) {
    return value === null || value === undefined ? '' : String(value);
}

function create(dependencies) {
    dependencies = dependencies || {};

    var api = dependencies.api || require('./api');
    var log = dependencies.log || require('./log');
    var service = dependencies.service || require('movian/service');
    var watched = dependencies.watched || require('./watched-episode');

    function bind(settings) {
        settings.createDivider('Общие:');

        settings.createBool('debug', 'Debug Mode', false, function (value) {
            var enabled = !!value;
            service.debug = enabled;
            log.setDebug(enabled);
        });

        settings.createBool('glwDebug', 'GLW Debug рамки', false,
            function () {
            }
        );

        settings.createBool('cacheEnabled', 'Включить кеширование', true,
            function (value) {
                api.setCacheEnabled(!!value);
            }
        );

        settings.createString('apiUrl', 'URL API (зеркало)', DEFAULT_API_URL,
            function (value) {
                api.setBaseUrl(text(value));
            }
        );

        settings.createAction('refreshMirror', 'Обновить зеркало (DNS)', function () {
            if (typeof api.refreshConfig !== 'function') {
                log.e('Mirror refresh is unavailable');
                return;
            }
            api.refreshConfig(function (err, result) {
                if (err) {
                    log.e('Mirror refresh failed: ' + (err.message || String(err)));
                    return;
                }
                console.log('Mirror refreshed via ' +
                    ((result && result.source) || 'DNS') + ': ' +
                    ((result && result.url) || ''));
            });
        });

        settings.createString('cfCookie', 'Cloudflare Cookie (cf_clearance)', '',
            function (value) {
                api.setCookie(text(value));
            }
        );

        settings.createString('cfUA', 'User-Agent для Cloudflare', '',
            function (value) {
                api.setUserAgent(text(value));
            }
        );

        settings.createAction('testBypass', 'Проверить обход Cloudflare', function () {
            console.log('--- Начинаю тест обхода Cloudflare ---');
            api.testBypass(function (success, error) {
                if (success) {
                    console.log('ТЕСТ ПРОЙДЕН: Список серий успешно получен!');
                } else {
                    console.log('ТЕСТ ПРОВАЛЕН: ' + error);
                }
            });
        });

        var watchedConfig = watched.snapshotConfig();
        settings.createDivider('Возобновление просмотра:');

        settings.createBool('resumeEnabled', 'Включить возобновление просмотра',
            watchedConfig.enabled, function (value) {
                watched.configure({ enabled: !!value });
            }
        );

        settings.createBool('autoResume', 'Автоматически возобновлять без диалога',
            watchedConfig.autoResume, function (value) {
                watched.configure({ autoResume: !!value });
            }
        );

        settings.createBool('findNext', 'Предлагать следующий эпизод',
            watchedConfig.findNext, function (value) {
                watched.configure({ findNext: !!value });
            }
        );

        settings.createInt('resumeDelay', 'Задержка перед диалогом (мс)',
            watchedConfig.delay, 500, 5000, 100, 'мс', function (value) {
                watched.configure({ delay: value });
            }
        );
    }

    return { bind: bind };
}

var defaultState;

function bind(settings) {
    if (!defaultState) defaultState = create();
    return defaultState.bind(settings);
}

module.exports = {
    create: create,
    bind: bind
};
