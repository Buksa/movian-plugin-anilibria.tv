> **Historical.** This review describes the state at `b00be13` ("Initial snapshot
> before review fixes"). Its findings are the reason for the commits that follow;
> the three spot-checked defects — `page.redirect()` on the module object,
> `apiUrlSetting.set()`, and the `RELEVANCE` sort value — are all absent from the
> current tree. Kept as the rationale for those changes, not as an open defect list.

# Plan: Review & Fix Anilibria Plugin (vs HDRezka reference)

## Overview

Reviewed `~/movian-plugin-anilibria` against:
- Movian ecmascript API source (`res/ecmascript/modules/movian/page.js`, `es_io.c`, etc.)
- Anilibria API v1 schema (`v1.json`)
- **HDRezka plugin** as the reference implementation by the same author

Found **4 bugs** (2 critical, 2 moderate) and several code-quality issues. HDRezka patterns noted where applicable.

---

## Bugs

### BUG 1 (Critical): `page.redirect()` called on the module object

**File:** `anilibria.js:51`

```javascript
var page = require('movian/page');  // ← this is the MODULE
// ...
settings.createAction('selectMirror', ..., function () {
    api.fetchMirrors(function (err, mirrors) {
        page.redirect(PREFIX + ':select_mirror', { mirrors: mirrors });
        //    ^^^^^^^^^ Module has no .redirect() — only Page instances do
    });
});
```

`page` is the `movian/page` module (exports `Route`, `Searcher`), not a page instance. `Page.prototype.redirect` only exists on page objects created inside Route/Searcher callbacks. Clicking "Выбрать зеркало" in settings will throw `page.redirect is not a function`.

**HDRezka pattern:** Never calls `page.redirect()` from settings callbacks. Navigation from settings uses routes (`:login`, `:logout`) or direct URL opening.

**Fix:** Remove the interactive mirror selection from settings (it's fundamentally broken in a settings context). The plugin already auto-discovers mirrors via DNS. If manual mirror selection is needed, create a dedicated route and navigate to it.

### BUG 2 (Critical): `apiUrlSetting.set()` doesn't exist

**File:** `anilibria.js:241`

```javascript
apiUrlSetting.set(decodedUrl);
```

`settings.createString()` returns an object with a `value` getter/setter (see `res/ecmascript/modules/movian/settings.js:97-119`). There is no `.set()` method.

**HDRezka pattern:** Uses `state.domain = v` or direct property assignment, never `.set()`.

**Fix:** Change to:
```javascript
apiUrlSetting.value = decodedUrl;
```

### BUG 3 (Moderate): Schedule API response format mismatch

**File:** `lib/formatters.js:306-322` and `anilibria.js:184`

The Anilibria API `/anime/schedule/week` returns:
```json
{ "data": [{ "release": {...}, "published_release_episode": {...} }] }
```

Two problems:
1. `fmt.schedule(data)` receives `{data:[...]}` but calls `data.map()` — TypeError
2. Each item has `release` property, but code checks `dayData.list || dayData.releases` — both undefined, schedule renders empty

**HDRezka pattern:** API response handling always unwraps the expected structure first (`data.items`, `data.results`, etc.) before iterating.

**Fix in `anilibria.js`:**
```javascript
ui.renderSchedule(page, data.data || []);
```

**Fix in `lib/formatters.js`:**
```javascript
schedule: function (data) {
    if (!data || !data.length) return [];
    var self = this;
    // API returns flat array of {release: ...} items
    var items = data.map(function (item) {
        var release = item.release || item;
        return self.catalogItem(release);
    });
    return [{ day: 'Расписание', items: items }];
}
```

### BUG 4 (Moderate): `RELEVANCE` is not a valid sorting value

**File:** `lib/api.js:210`

```javascript
'f[sorting]': 'RELEVANCE'
```

The API enum only supports: `FRESH_AT_DESC`, `FRESH_AT_ASC`, `RATING_DESC`, `RATING_ASC`, `YEAR_DESC`, `YEAR_ASC`.

**Fix:** Use `FRESH_AT_DESC` for search (sort by freshness) or omit the sorting parameter entirely.

---

## Code Quality Issues

### Q1: Duplicate RichText/boldStr/coloredStr

Both `lib/formatters.js` and `lib/ui.js` define identical `RichText`, `boldStr`, `coloredStr`, `sizedStr`.

**HDRezka pattern:** UI helpers are in `utils/ui.js` and imported by pages. No duplication.

**Fix:** Keep definitions in `formatters.js` only. Import in `ui.js`:
```javascript
var fmt = require('./formatters');
// Use fmt.boldStr, fmt.coloredStr, etc.
```

### Q2: CACHE_TIME comment is wrong

```javascript
var CACHE_TIME = 3000; // 5 минут
```

3000 ms = 3 seconds, not 5 minutes.

**Fix:** Change comment to `// 3 seconds` or change value to `300000` (5 minutes).

### Q3: `print()` left in production code

`lib/formatters.js:201`:
```javascript
print(JSON.stringify(ep,null,2));
```

Debug output on every release page load.

**HDRezka pattern:** Uses `utils/log.js` with debug flag. No raw `print()` in production.

**Fix:** Remove the `print()` call.

### Q4: Dead `renderHome` function

`lib/ui.js:54-66` defines `renderHome()` which is never called.

**Fix:** Remove it.

### Q5: Settings store not used

**HDRezka pattern:** Uses `movian/store` for persistent settings (e.g., `store.create('cache')`).

Anilibria uses the settings API's built-in persistence, which is fine, but could benefit from `movian/store` for the API URL and mirror list.

---

## Structural Comparison (HDRezka vs Anilibria)

| Aspect | HDRezka | Anilibria |
|--------|---------|-----------|
| Architecture | Modular (routes/, pages/, api/, utils/) | Flat (lib/) |
| Start page | Menu with links to sections | Direct catalog |
| httpInspector | Exact host patterns, multi-host | Wildcard `'.*libria.*'` |
| Search | Top 3 + "show all" link | Shows all results |
| Resume | Full system (candidate/policy/resolver) | Simple (findLastWatched) |
| UI helpers | appendExpandable, bindMetadata | Basic separator/appendItem |
| Settings state | state object + setters | Direct API calls |

---

## Files to Modify

| File | Changes |
|------|---------|
| `anilibria.js` | Fix mirror selection (Bug 1), fix apiUrlSetting.set (Bug 2), fix schedule data passing (Bug 3) |
| `lib/formatters.js` | Fix schedule format (Bug 3), fix search sorting (Bug 4), remove print (Q3), remove duplicate RichText (Q1), fix CACHE_TIME comment (Q2) |
| `lib/ui.js` | Remove duplicate RichText (Q1), import from formatters.js, remove dead renderHome (Q4) |

---

## Verification

1. **Static check:** Ensure all `require()` paths resolve and no syntax errors
2. **Mirror selection:** Settings action no longer crashes (Bug 1 fix)
3. **Mirror apply:** `apiUrlSetting.value = url` works (Bug 2 fix)
4. **Schedule:** API response correctly parsed and rendered (Bug 3 fix)
5. **Search:** Uses valid sorting enum (Bug 4 fix)
6. **No debug print spam** in logs (Q3 fix)
