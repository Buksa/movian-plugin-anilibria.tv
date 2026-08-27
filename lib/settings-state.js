// ============================================================================
// lib/settings-state.js — Movian settings adapter
// ============================================================================

var policyModule = require('./plugin-setting-policy');

function create(dependencies) {
    dependencies = dependencies || {};

    var api = dependencies.api || require('./api');
    var log = dependencies.log || require('./log');
    var service = dependencies.service || require('movian/service');
    var continuation = dependencies.continuation ||
        require('./viewing-continuation');
    var policy = dependencies.policy || policyModule.create({
        effects: {
            logging: {
                setDebug: function (enabled) {
                    service.debug = enabled;
                    log.setDebug(enabled);
                }
            },
            api: api,
            continuation: continuation
        }
    });

    function bind(settings) {
        var values = {};
        var binding = true;

        function register(definition) {
            values[definition.id] = definition.defaultValue;

            function changed(value) {
                values[definition.id] = value;
                if (!binding) {
                    var patch = {};
                    patch[definition.id] = value;
                    policy.applyPatch(patch);
                }
            }

            if (definition.type === 'bool') {
                settings.createBool(
                    definition.id,
                    definition.title,
                    definition.defaultValue,
                    changed
                );
            } else if (definition.type === 'string') {
                settings.createString(
                    definition.id,
                    definition.title,
                    definition.defaultValue,
                    changed
                );
            } else if (definition.type === 'int') {
                settings.createInt(
                    definition.id,
                    definition.title,
                    definition.defaultValue,
                    definition.min,
                    definition.max,
                    definition.step,
                    definition.unit,
                    changed
                );
            }
        }

        function registerGroup(group) {
            policy.definitions(group).forEach(register);
        }

        settings.createDivider('Общие:');
        registerGroup('general');

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

        registerGroup('cloudflare');

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

        settings.createDivider('Возобновление просмотра:');
        registerGroup('continuation');

        binding = false;
        policy.applySnapshot(values);
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
