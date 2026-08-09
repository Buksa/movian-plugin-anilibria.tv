// ============================================================================
// lib/resume.js — Resume policy, page source, presenter and effects seam
// ============================================================================

var DEFAULT_DELAY = 1500;

var config = {
    enabled: true,
    autoResume: false,
    findNext: true,
    delay: DEFAULT_DELAY
};

function number(value) {
    var parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
}

function normalize(value, source) {
    value = value || {};
    return {
        source: source || value.source || 'unknown',
        title: value.title || '',
        historyTitle: value.historyTitle || value.title || '',
        url: value.url || '',
        canonicalUrl: value.canonicalUrl || '',
        season: number(value.season),
        episode: number(value.episode),
        index: value.index,
        playcount: number(value.playcount),
        restartpos: number(value.restartpos),
        position: number(value.position),
        duration: number(value.duration),
        progress: number(value.progress),
        watchedAt: number(value.watchedAt)
    };
}

function readValue(object, name, fallback) {
    var value;

    try {
        if (!object || object[name] === null || typeof object[name] === 'undefined') {
            return fallback;
        }
        value = object[name];
        return value && typeof value.valueOf === 'function' ? value.valueOf() : value;
    } catch (e) {
        return fallback;
    }
}

function pageCandidate(item, index) {
    var root = item && item.root;
    var display = root && root.display;
    var metadata = root && root.metadata;
    var type = readValue(root, 'type', null);
    var displayTitle = readValue(display, 'title', '');
    var metadataTitle = readValue(metadata, 'title', '');

    if (type !== 'video') return null;

    return normalize({
        source: 'page',
        title: displayTitle || metadataTitle || 'Эпизод',
        historyTitle: displayTitle || metadataTitle || 'Эпизод',
        url: readValue(root, 'url', ''),
        canonicalUrl: readValue(root, 'canonicalUrl', ''),
        episode: readValue(root, 'episode', 0),
        duration: readValue(root, 'duration', 0),
        playcount: readValue(root, 'playcount', 0),
        restartpos: readValue(root, 'restartpos', 0),
        index: index
    }, 'page');
}

function hasResumeSignal(candidate) {
    return !!(candidate && (candidate.playcount > 0 || candidate.restartpos > 0));
}

function findLastWatched(items) {
    var result = null;
    items = items || [];

    for (var i = 0; i < items.length; i++) {
        var candidate = pageCandidate(items[i], i);
        if (hasResumeSignal(candidate)) result = candidate;
    }

    return result;
}

function findNext(items, currentItem) {
    if (!currentItem || typeof currentItem.index !== 'number') return null;

    for (var i = currentItem.index + 1; i < (items || []).length; i++) {
        var candidate = pageCandidate(items[i], i);
        if (candidate) return candidate;
    }

    return null;
}

function needsNext(lastWatched, findNextOption) {
    return !!(findNextOption && lastWatched && lastWatched.playcount > 0);
}

function decide(lastWatched, nextCandidate, findNextOption) {
    if (!hasResumeSignal(lastWatched)) {
        return { kind: 'none', last: lastWatched || null, target: null };
    }

    if (needsNext(lastWatched, findNextOption) && nextCandidate) {
        return { kind: 'next', last: lastWatched, target: nextCandidate };
    }

    return { kind: 'resume', last: lastWatched, target: lastWatched };
}

function openUrl(url) {
    try {
        var prop = require('movian/prop');
        var navigators = prop.global.navigators;
        if (!navigators || !navigators.nodes) return false;

        var navigator = navigators.nodes[0];
        if (!navigator || !navigator.eventSink) return false;

        prop.sendEvent(navigator.eventSink, 'openurl', { url: url });
        return true;
    } catch (e) {
        console.error('[resume] openUrl error: ' + e);
        return false;
    }
}

function defaultEffects() {
    var popup = require('native/popup');
    return {
        confirm: function (message) {
            return popup.message(message, true, true);
        },
        open: openUrl
    };
}

function present(decision, options) {
    if (!decision || decision.kind === 'none' || !decision.target) return;

    options = options || {};
    var effects = options.effects || defaultEffects();
    var lastWatched = decision.last;
    var target = decision.target;

    if (options.autoResume) {
        effects.open(target.url);
        return;
    }

    var message = decision.kind === 'next' ?
        'Вы смотрели: "' + (lastWatched.historyTitle || lastWatched.title) + '"\n\n' +
        'Продолжить со следующего эпизода?\n"' + target.title + '"' :
        'Продолжить просмотр?\n\n"' + target.title + '"';

    if (effects.confirm(message)) effects.open(target.url);
}

function currentItems(page, fallback) {
    if (page && page.getItems) {
        try {
            return page.getItems();
        } catch (e) { }
    }
    return fallback || [];
}

function find(page, items, options) {
    options = options || {};
    if (!config.enabled) return;

    var autoResume = options.autoResume !== undefined ? options.autoResume : config.autoResume;
    var shouldFindNext = options.findNext !== undefined ? options.findNext : config.findNext;
    var delay = options.delay !== undefined ? options.delay : config.delay;
    var schedule = options.schedule || setTimeout;

    schedule(function () {
        var renderedItems = currentItems(page, items);
        var lastWatched = findLastWatched(renderedItems);
        if (!lastWatched) return;

        var next = shouldFindNext ? findNext(renderedItems, lastWatched) : null;
        present(decide(lastWatched, next, shouldFindNext), {
            autoResume: autoResume,
            effects: options.effects
        });
    }, delay);
}

function createSettingsUI(settings) {
    settings.createDivider('Возобновление просмотра:');

    settings.createBool('resumeEnabled', 'Включить возобновление просмотра',
        config.enabled, function (value) { config.enabled = value; });

    settings.createBool('autoResume', 'Автоматически возобновлять без диалога',
        config.autoResume, function (value) { config.autoResume = value; });

    settings.createBool('findNext', 'Предлагать следующий эпизод',
        config.findNext, function (value) { config.findNext = value; });

    settings.createInt('resumeDelay', 'Задержка перед диалогом (мс)',
        config.delay, 500, 5000, 100, 'мс', function (value) {
            config.delay = Math.max(500, Math.min(5000, value));
        }
    );
}

module.exports = {
    config: config,
    normalize: normalize,
    hasResumeSignal: hasResumeSignal,
    findLastWatched: findLastWatched,
    findNext: findNext,
    needsNext: needsNext,
    decide: decide,
    present: present,
    find: find,
    createSettingsUI: createSettingsUI
};
