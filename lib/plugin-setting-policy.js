// ============================================================================
// lib/plugin-setting-policy.js — Plugin setting state and effect policy
// ============================================================================

var DEFAULT_API_URL = 'https://api.anilibria.app/api/v1';
var DEFAULT_RESUME_DELAY = 1500;
var MIN_RESUME_DELAY = 500;
var MAX_RESUME_DELAY = 5000;

function text(value) {
    return value === null || value === undefined ? '' : String(value);
}

function bool(value) {
    return !!value;
}

function int(value) {
    var parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
}

function valueOr(source, key, fallback) {
    return source && source[key] !== undefined ? source[key] : fallback;
}

function clampDelay(value) {
    return Math.max(MIN_RESUME_DELAY,
        Math.min(MAX_RESUME_DELAY, int(value)));
}

function create(dependencies) {
    dependencies = dependencies || {};

    var effects = dependencies.effects || {};
    var logging = effects.logging || {};
    var api = effects.api || {};
    var continuation = effects.continuation || {};
    var continuationDefaults = continuation.snapshotConfig ?
        continuation.snapshotConfig() : {};
    var state = null;

    function definitions(group) {
        var all = [
            {
                group: 'general',
                id: 'debug',
                type: 'bool',
                title: 'Debug Mode',
                defaultValue: false
            },
            {
                group: 'general',
                id: 'glwDebug',
                type: 'bool',
                title: 'GLW Debug рамки',
                defaultValue: false
            },
            {
                group: 'general',
                id: 'cacheEnabled',
                type: 'bool',
                title: 'Включить кеширование',
                defaultValue: true
            },
            {
                group: 'general',
                id: 'apiUrl',
                type: 'string',
                title: 'URL API (зеркало)',
                defaultValue: DEFAULT_API_URL
            },
            {
                group: 'cloudflare',
                id: 'cfCookie',
                type: 'string',
                title: 'Cloudflare Cookie (cf_clearance)',
                defaultValue: ''
            },
            {
                group: 'cloudflare',
                id: 'cfUA',
                type: 'string',
                title: 'User-Agent для Cloudflare',
                defaultValue: ''
            },
            {
                group: 'continuation',
                id: 'resumeEnabled',
                type: 'bool',
                title: 'Включить возобновление просмотра',
                defaultValue: bool(valueOr(continuationDefaults, 'enabled', true))
            },
            {
                group: 'continuation',
                id: 'autoResume',
                type: 'bool',
                title: 'Автоматически возобновлять без диалога',
                defaultValue: bool(valueOr(continuationDefaults, 'autoResume', false))
            },
            {
                group: 'continuation',
                id: 'findNext',
                type: 'bool',
                title: 'Предлагать следующий эпизод',
                defaultValue: bool(valueOr(continuationDefaults, 'findNext', true))
            },
            {
                group: 'continuation',
                id: 'resumeDelay',
                type: 'int',
                title: 'Задержка перед диалогом (мс)',
                defaultValue: clampDelay(
                    valueOr(continuationDefaults, 'delay', DEFAULT_RESUME_DELAY)
                ),
                min: MIN_RESUME_DELAY,
                max: MAX_RESUME_DELAY,
                step: 100,
                unit: 'мс'
            }
        ];

        if (!group) return all;
        return all.filter(function (definition) {
            return definition.group === group;
        });
    }

    function defaults() {
        var result = {};
        definitions().forEach(function (definition) {
            result[definition.id] = definition.defaultValue;
        });
        return result;
    }

    function normalize(raw) {
        var fallback = defaults();
        raw = raw || {};
        return {
            debug: bool(valueOr(raw, 'debug', fallback.debug)),
            glwDebug: bool(valueOr(raw, 'glwDebug', fallback.glwDebug)),
            cacheEnabled: bool(valueOr(raw, 'cacheEnabled', fallback.cacheEnabled)),
            apiUrl: text(valueOr(raw, 'apiUrl', fallback.apiUrl)),
            cfCookie: text(valueOr(raw, 'cfCookie', fallback.cfCookie)),
            cfUA: text(valueOr(raw, 'cfUA', fallback.cfUA)),
            resumeEnabled: bool(valueOr(raw, 'resumeEnabled', fallback.resumeEnabled)),
            autoResume: bool(valueOr(raw, 'autoResume', fallback.autoResume)),
            findNext: bool(valueOr(raw, 'findNext', fallback.findNext)),
            resumeDelay: clampDelay(
                valueOr(raw, 'resumeDelay', fallback.resumeDelay)
            )
        };
    }

    function snapshot() {
        var result = {};
        Object.keys(state || {}).forEach(function (key) {
            result[key] = state[key];
        });
        return result;
    }

    function applyEffects(previous, next, force) {
        if (force || previous.debug !== next.debug) {
            if (typeof logging.setDebug === 'function') {
                logging.setDebug(next.debug);
            }
        }

        if (force || previous.cacheEnabled !== next.cacheEnabled) {
            if (typeof api.setCacheEnabled === 'function') {
                api.setCacheEnabled(next.cacheEnabled);
            }
        }
        if (force || previous.apiUrl !== next.apiUrl) {
            if (typeof api.setBaseUrl === 'function') {
                api.setBaseUrl(next.apiUrl);
            }
        }
        if (force || previous.cfCookie !== next.cfCookie) {
            if (typeof api.setCookie === 'function') {
                api.setCookie(next.cfCookie);
            }
        }
        if (force || previous.cfUA !== next.cfUA) {
            if (typeof api.setUserAgent === 'function') {
                api.setUserAgent(next.cfUA);
            }
        }

        var continuationPatch = {};
        var continuationChanged = false;
        if (force || previous.resumeEnabled !== next.resumeEnabled) {
            continuationPatch.enabled = next.resumeEnabled;
            continuationChanged = true;
        }
        if (force || previous.autoResume !== next.autoResume) {
            continuationPatch.autoResume = next.autoResume;
            continuationChanged = true;
        }
        if (force || previous.findNext !== next.findNext) {
            continuationPatch.findNext = next.findNext;
            continuationChanged = true;
        }
        if (force || previous.resumeDelay !== next.resumeDelay) {
            continuationPatch.delay = next.resumeDelay;
            continuationChanged = true;
        }
        if (continuationChanged && typeof continuation.configure === 'function') {
            continuation.configure(continuationPatch);
        }
    }

    function applySnapshot(raw) {
        var next = normalize(raw);
        applyEffects(state || {}, next, true);
        state = next;
        return snapshot();
    }

    function applyPatch(patch) {
        patch = patch || {};
        var next = normalize({
            debug: valueOr(patch, 'debug', state.debug),
            glwDebug: valueOr(patch, 'glwDebug', state.glwDebug),
            cacheEnabled: valueOr(patch, 'cacheEnabled', state.cacheEnabled),
            apiUrl: valueOr(patch, 'apiUrl', state.apiUrl),
            cfCookie: valueOr(patch, 'cfCookie', state.cfCookie),
            cfUA: valueOr(patch, 'cfUA', state.cfUA),
            resumeEnabled: valueOr(patch, 'resumeEnabled', state.resumeEnabled),
            autoResume: valueOr(patch, 'autoResume', state.autoResume),
            findNext: valueOr(patch, 'findNext', state.findNext),
            resumeDelay: valueOr(patch, 'resumeDelay', state.resumeDelay)
        });
        applyEffects(state, next, false);
        state = next;
        return snapshot();
    }

    state = normalize();

    return {
        definitions: definitions,
        snapshot: snapshot,
        applySnapshot: applySnapshot,
        applyPatch: applyPatch
    };
}

module.exports = {
    create: create
};
