// ============================================================================
// lib/viewing-continuation.js — Продолжение просмотра policy and lifecycle
// ============================================================================

var DEFAULT_DELAY = 1500;
var defaultEpisodeNode = require('./episode-node');

function number(value) {
    var parsed = Number(value);
    return isNaN(parsed) ? 0 : parsed;
}

function createPolicyState(initial) {
    var state = {
        enabled: true,
        autoResume: false,
        findNext: true,
        delay: DEFAULT_DELAY
    };

    function snapshot() {
        return {
            enabled: state.enabled,
            autoResume: state.autoResume,
            findNext: state.findNext,
            delay: state.delay
        };
    }

    function configure(patch) {
        patch = patch || {};
        if (patch.enabled !== undefined) state.enabled = !!patch.enabled;
        if (patch.autoResume !== undefined) state.autoResume = !!patch.autoResume;
        if (patch.findNext !== undefined) state.findNext = !!patch.findNext;
        if (patch.delay !== undefined) {
            var delay = number(patch.delay);
            state.delay = Math.max(500, Math.min(5000, delay));
        }
        return snapshot();
    }

    configure(initial);

    return {
        snapshot: snapshot,
        configure: configure
    };
}

var sharedPolicy = createPolicyState();

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

function hasWatchedSignal(candidate) {
    return !!(candidate && (candidate.playcount > 0 || candidate.restartpos > 0));
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
        console.error('[viewing-continuation] openUrl error: ' + e);
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

function create(dependencies) {
    dependencies = dependencies || {};

    var episodeNode = dependencies.episodeNode || defaultEpisodeNode;
    var policy = dependencies.policy || sharedPolicy;
    var configuredEffects = dependencies.effects || null;
    var generation = 0;
    var pending = null;

    function pageEpisode(item, index) {
        var candidate = episodeNode.read(item, index);
        return candidate ? normalize(candidate) : null;
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

    function present(decision, options) {
        if (!decision || decision.kind === 'none' || !decision.target) return;

        options = options || {};
        var effects = options.effects || configuredEffects || defaultEffects();
        var lastWatched = decision.last;
        var target = decision.target;

        if (options.autoResume) {
            effects.open(target.url);
            return;
        }

        var message = decision.kind === 'next' ?
            'Вы смотрели: "' + (lastWatched.historyTitle || lastWatched.title) +
            '"\n\nПродолжить со следующего эпизода?\n"' + target.title + '"' :
            'Продолжить просмотр?\n\n"' + target.title + '"';

        if (effects.confirm(message)) effects.open(target.url);
    }

    function currentItems(page) {
        if (!page || !page.getItems) return [];
        try {
            return page.getItems() || [];
        } catch (e) {
            return [];
        }
    }

    function cancelActive(active) {
        if (!active || active.cancelled) return;

        active.cancelled = true;
        if (pending === active) {
            pending = null;
            generation++;
        }
        if (active.timeoutId !== null && active.clear) {
            active.clear(active.timeoutId);
        }
    }

    function cancelPending() {
        var active = pending;
        pending = null;
        generation++;
        cancelActive(active);
    }

    function scan(page, options) {
        options = options || {};
        cancelPending();

        var settings = policy.snapshot();
        if (!settings.enabled) return function () {};

        var schedule = options.schedule || setTimeout;
        var clear = options.clearSchedule || clearTimeout;
        var active = {
            token: generation,
            timeoutId: null,
            cancelled: false,
            clear: clear
        };

        pending = active;
        active.timeoutId = schedule(function () {
            if (active.cancelled || active.token !== generation) return;
            pending = null;

            var renderedItems = currentItems(page);
            var lastWatched = findLastWatched(renderedItems);
            if (!lastWatched) return;

            var next = settings.findNext ? findNext(renderedItems, lastWatched) : null;
            present(decide(lastWatched, next, settings.findNext), {
                autoResume: settings.autoResume,
                effects: options.effects
            });
        }, settings.delay);

        return function () {
            cancelActive(active);
        };
    }

    return {
        normalize: normalize,
        hasWatchedSignal: hasWatchedSignal,
        findLastWatched: findLastWatched,
        findNext: findNext,
        needsNext: needsNext,
        decide: decide,
        present: present,
        scan: scan,
        cancel: cancelPending,
        snapshotConfig: policy.snapshot,
        configure: policy.configure
    };
}

function snapshotConfig() {
    return sharedPolicy.snapshot();
}

function configure(patch) {
    return sharedPolicy.configure(patch);
}

module.exports = {
    create: create,
    snapshotConfig: snapshotConfig,
    configure: configure
};
