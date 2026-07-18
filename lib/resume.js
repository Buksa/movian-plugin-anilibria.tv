// ============================================================================
// lib/resume.js — Возобновление просмотра (single file)
// ============================================================================

var popup = require('native/popup');
var prop = require('movian/prop');

// ─────────────────────────────────────────────────────────────────────────────
// Навигация через eventSink
// ─────────────────────────────────────────────────────────────────────────────

function openUrl(url) {
    try {
        var navs = prop.global.navigators;
        if (!navs || !navs.nodes) return false;
        var nav = navs.nodes[0];
        if (!nav || !nav.eventSink) return false;

        prop.sendEvent(nav.eventSink, 'openurl', { url: url });
        return true;
    } catch (e) {
        console.error('[resume] openUrl error: ' + e);
        return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Поиск последнего просмотренного
// ─────────────────────────────────────────────────────────────────────────────

function findLastWatched(items) {
    var result = null;

    for (var i = 0; i < items.length; i++) {
        try {
            var item = items[i];
            var type = item.root.type ? item.root.type.valueOf() : null;
            var playcount = item.root.playcount ? item.root.playcount.valueOf() : 0;

            if (type === 'video' && playcount > 0) {
                result = {
                    index: i,
                    title: item.root.metadata.title.valueOf(),
                    url: item.root.url.valueOf()
                };
            }
        } catch (e) {
            continue;
        }
    }

    return result;
}

function findNext(items, idx) {
    var nextIdx = idx + 1;
    if (nextIdx >= items.length) return null;

    try {
        var item = items[nextIdx];
        return {
            index: nextIdx,
            title: item.root.metadata.title.valueOf(),
            url: item.root.url.valueOf()
        };
    } catch (e) {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Публичный API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Настройки по умолчанию (мутируются через settings)
 */
var config = {
    enabled: true,
    autoResume: false,
    findNext: true,
    delay: 1500
};

module.exports = {
    config: config,

    /**
     * Найти последний просмотренный эпизод и предложить продолжить
     *
     * @param {Object} page    — Movian page object
     * @param {Array}  items   — page.getItems()
     * @param {Object} options — {autoResume, findNext, delay}
     */
    find: function (page, items, options) {
        options = options || {};
        var auto = options.autoResume || false;
        var shouldFindNext = options.findNext !== false;
        var delay = options.delay || 1500;

        setTimeout(function () {
            var lastWatched = findLastWatched(items);
            if (!lastWatched) return;

            var target = lastWatched;
            if (shouldFindNext) {
                var next = findNext(items, lastWatched.index);
                if (next) target = next;
            }

            if (auto) {
                openUrl(target.url);
            } else {
                var message = shouldFindNext && target !== lastWatched ?
                    'Вы смотрели: "' + lastWatched.title + '"\n\n' +
                    'Продолжить со следующего эпизода?\n"' + target.title + '"' :
                    'Продолжить просмотр?\n\n"' + target.title + '"';

                if (popup.message(message, true, true)) {
                    openUrl(target.url);
                }
            }
        }, delay);
    },

    /**
     * Создать UI настроек resume в Movian Settings
     * @param {Object} settings — require('movian/settings')
     */
    createSettingsUI: function (settings) {
        var c = config;

        settings.createDivider('Возобновление просмотра:');

        settings.createBool('resumeEnabled', 'Включить возобновление просмотра',
            c.enabled, function (v) { c.enabled = v; }
        );

        settings.createBool('autoResume', 'Автоматически возобновлять без диалога',
            c.autoResume, function (v) { c.autoResume = v; }
        );

        settings.createBool('findNext', 'Предлагать следующий эпизод',
            c.findNext, function (v) { c.findNext = v; }
        );

        settings.createInt('resumeDelay', 'Задержка перед диалогом (мс)',
            c.delay, 500, 5000, 100, 'мс', function (v) {
                c.delay = Math.max(500, Math.min(5000, v));
            }
        );
    }
};
