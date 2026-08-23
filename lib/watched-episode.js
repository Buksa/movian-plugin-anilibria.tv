// ============================================================================
// lib/watched-episode.js — Watched episode history and resume policy
// ============================================================================

var DEFAULT_DELAY = 1500;
var episodeNode = require('./episode-node');

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
    var identity = value.identity || value;
    return {
        source: source || value.source || 'unknown',
        title: identity.title || '',
        historyTitle: identity.historyTitle || identity.title || '',
        url: identity.url || value.url || '',
        canonicalUrl: identity.canonicalUrl || value.canonicalUrl || '',
        season: number(identity.season),
        episode: number(identity.episode),
        index: value.index,
        playcount: number(value.playcount),
        restartpos: number(value.restartpos),
        position: number(value.position),
        duration: number(identity.duration !== undefined ?
            identity.duration : value.duration),
        progress: number(value.progress),
        watchedAt: number(value.watchedAt)
    };
}

function pageEpisode(item, index) {
    var candidate = episodeNode.read(item, index);
    return candidate ? normalize(candidate) : null;
}

function hasWatchedSignal(candidate) {
    return !!(candidate && (candidate.playcount > 0 || candidate.restartpos > 0));
}

function findLastWatched(items) {
    var result = null;
    items = items || [];

    for (var i = 0; i < items.length; i++) {
        var candidate = pageEpisode(items[i], i);
        if (hasWatchedSignal(candidate)) result = candidate;
    }

    return result;
}

function findNext(items, currentItem) {
    if (!currentItem || typeof currentItem.index !== 'number') return null;

    for (var i = currentItem.index + 1; i < (items || []).length; i++) {
        var candidate = pageEpisode(items[i], i);
        if (candidate) return candidate;
    }

    return null;
}

function needsNext(lastWatched, findNextOption) {
    return !!(findNextOption && lastWatched && lastWatched.playcount > 0);
}

function decide(lastWatched, nextCandidate, findNextOption) {
    if (!hasWatchedSignal(lastWatched)) {
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
        console.error('[watched-episode] openUrl error: ' + e);
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

function scan(page, items, options) {
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

function snapshotConfig() {
    return {
        enabled: config.enabled,
        autoResume: config.autoResume,
        findNext: config.findNext,
        delay: config.delay
    };
}

function configure(patch) {
    patch = patch || {};
    if (patch.enabled !== undefined) config.enabled = !!patch.enabled;
    if (patch.autoResume !== undefined) config.autoResume = !!patch.autoResume;
    if (patch.findNext !== undefined) config.findNext = !!patch.findNext;
    if (patch.delay !== undefined) {
        var delay = number(patch.delay);
        config.delay = Math.max(500, Math.min(5000, delay));
    }
    return snapshotConfig();
}

module.exports = {
    normalize: normalize,
    hasWatchedSignal: hasWatchedSignal,
    findLastWatched: findLastWatched,
    findNext: findNext,
    needsNext: needsNext,
    decide: decide,
    present: present,
    scan: scan,
    snapshotConfig: snapshotConfig,
    configure: configure
};
