# GLW `#import` и относительные пути внутри `zip://`

Дата: 2026-08-11  
Исследованный core: `/home/uzver/movian-public-clean`  
Revision: `97ac4ccada2f211e2e6c964abd413dec853b7a3a`  
Ограничение: это только исследование; core не изменялся.

## Вывод

Исправлять следует **внутри ZIP adapter, в `zip_file_find` после `zip_archive_find` и до `zip_archive_find_file`** (`fa_zip.c:493-501`): нормализовать только уже отделённый member suffix и отклонять попытку подняться выше archive root. Не следует глобально менять `fa_absolute_path` и не следует нормализовать полный `zip://` URL в GLW resolver.

Это фиксирует archive identity до канонизации, а один seam покрывает `open`, `stat`, `scandir` и `reference`, которые все проходят через `zip_file_find`. GLW resolver остаётся ответственным за относительное concatenation, но не пытается угадывать границу archive.

Для установленного plugin archive security root этого исправления — **корень всего собственного ZIP archive**. Confinement к plugin subdirectory может быть отдельной policy (и требует отдельного root context); не следует незаметно смешивать её с этим fix.

## Фактический call path

1. Исходный view загружается как `gcv->gcv_url`; `glw_view.c:225-255` вызывает `fa_load`, создаёт `TOKEN_START` с `file = gcv_url`, затем лексирует view.
2. `glw_view_preproc.c:288-313` распознаёт `#include`; `:316-345` распознаёт `#import`. После строкового токена directive вызывает `glw_view_load1(gr, t->t_rstring, ei, t, may_unlock)` (`:307`, `:338`). Import deduplication (`:326-336`) сравнивает исходные строковые имена, до resolution.
3. `glw_view_lexer.c:394-405` (`glw_view_load1`) вызывает `glw_resolve_path(url, prev->file, gr, NULL)`; затем `glw_view_lexer.c:406-425` делает `fa_load(rstr_get(p))`. `prev->file` — URL родительского view/import (`glw_view_lexer.c:414-417` используется для ошибки).
4. `glw_view_attrib.c:36-59` (`glw_resolve_path`) специально обрабатывает `skin://` (`:42-49`), выставляет local flag для `dataroot://` (`:51-56`), а остальные значения передаёт в `fa_absolute_path(filename, at)` (`:58`).
5. `fileaccess.c:191-203` (`fa_absolute_path`) возвращает input без изменений, если filename содержит `:`, пуст, абсолютен, у `at` нет `/`, либо начинается с `./` (`:197`). Иначе он просто добавляет filename к каталогу родительского URL (`:200-202`); `.`/`..` не удаляются.
6. `fileaccess.c:230-252` (`fa_open_ex`) вызывает `fa_resolve_proto`; `fileaccess.c:89-169` распознаёт scheme до `:`, передаёт protocol-specific filename без `zip://` prefix (`:125-165`). Для `zip://...` это путь, который далее получает ZIP adapter.
7. `fa_zip.c:492-502` (`zip_file_find`) вызывает `zip_archive_find(url, &r)` и затем `zip_archive_find_file(za, za->za_root, r, 0)`. `fa_zip.c:422-485` ищет archive, отрезая компоненты только по `/`; `r` — остаток после найденного archive URL (`:462-465`).
8. `fa_zip.c:159-207` рекурсивно ищет компоненты ZIP tree, разделяя `/` и `\\` (`:172-182`), сопоставляя имя буквально без dot-segment canonicalization (`:184-206`). `zip_open` (`fa_zip.c:725-805`) открывает найденный file entry либо возвращает `Entry not found in archive` (`:734-743`).

Для установленного plugin archive core строит URL вида `zip://<zipfile>/<plugin-root>`: `plugins.c:467-497` (`plugin_resolve_zip_path`) сканирует `zip://<zipfile>`, а для archive с верхним каталогом возвращает `zip://<zipfile>/<dir>` (`:483-491`). Затем plugin JSON грузится как `<zippath>/plugin.json` (`plugins.c:504-519`). Поэтому родительский view может иметь, например, `zip:///data/plugins/a.zip/aninetria/views/prototypes/01.view`.

## Минимальный repro

Создать archive с таким layout:

```text
aninetria/
  plugin.json
  views/
    common.view
    sub/child.view
```

`sub/child.view`:

```glw
#import "../common.view"
```

Открыть `zip:///tmp/aninetria.zip/aninetria/views/sub/child.view` (или загрузить установленный plugin view с тем же URL). Текущий путь вычисляется так:

```text
at       = zip:///tmp/aninetria.zip/aninetria/views/sub/child.view
filename = ../common.view
result   = zip:///tmp/aninetria.zip/aninetria/views/sub/../common.view
```

`fa_absolute_path` оставляет `..`; ZIP tree получает entry `aninetria/views/sub/../common.view`, а `zip_archive_find_file` ищет literal child named `..`, которого обычно нет. `fa_load` завершается ошибкой `Entry not found in archive`, и `glw_view_load1` формирует `Unable to open ...` (`glw_view_lexer.c:413-418`).

Boundary repro для security regression:

```text
zip:///tmp/aninetria.zip/aninetria/views/sub/../../../../outside.view
```

После `zip_archive_find` archive уже должен быть `/tmp/aninetria.zip`; нормализатор member suffix обязан отклонить underflow относительно `za_root`. Нельзя интерпретировать `..` как путь за пределами archive, fallback к filesystem или sibling archive.

Контрпример против GLW-resolver seam:

```text
zip://file:///tmp/a.zip/views/../../../b.zip/x.view
```

`glw_resolve_path`/глобальная full-URL canonicalization не знает, какая часть URL является archive identity. Схлопывание `..` до canonical URL может превратить запрос к entry `a.zip` в запрос к другому archive `b.zip`; это cross-archive confusion. В adapter seam `zip_archive_find` сначала фиксирует `za` через `fa_stat`/поиск archive (`fa_zip.c:422-485`), и только затем нормализуется `r`.

## Фактическое runtime/prototype evidence

Минимальный runtime repro был воспроизведён дважды на dev plugin (временные файлы не входят в этот repository):

* archive: `/tmp/glw-import-repro.zip`;
* entries: `views/common.view` и `views/sub/child.view`;
* `views/sub/child.view` содержит `#import "../common.view"`;
* dev plugin: `/tmp/zip-view-plugin`;
* route: `ziprepro:start`;
* mdev log: `views/sub/../common.view -- Entry not found in archive`.

Это подтверждает не только syntactic concatenation, но и фактический failure в ZIP tree до исправления: GLW передаёт unresolved member suffix в `fa_load`, а adapter не находит literal `..` component.

Отдельный prototype `/tmp/zip_member_normalize_probe.c` проверил proposed adapter helper без изменения core: canonical parent, `.` segments, backslash separators и encoded segments прошли ожидаемые проверки; root underflow и cross-archive member cases были отвергнуты. Probe является evidence для test design, не заменяет focused core tests и не добавлялся в repository.

## Что уже нормализуется, а что нет

* `fa_absolute_path` — только syntactic concatenation; dot segments не нормализует (`fileaccess.c:191-203`). Особый `./` возвращается как есть (`:197`), то есть это не полноценная canonicalizer.
* `fa_pathjoin` — также только concat, хотя удаляет повторяющиеся ведущие `./` у второго аргумента (`fileaccess.c:1882-1890`). Он используется для `skin://` в `glw_view_attrib.c:44-45`, не для ordinary `#import`.
* `fa_normalize` (`fileaccess.c:208-222`) — protocol hook (`fap_normalize`), но `fa_protocol_zip` не задаёт `.fap_normalize` (`fa_zip.c:882-894`); это не готовое решение ZIP entries.
* `fa_resolve_proto` не декодирует `%2e`/`%2f`; он лишь выделяет scheme и снимает `//` для adapter (`fileaccess.c:89-165`). ZIP lookup поэтому воспринимает percent-encoded segments буквально. Нормализатор не должен сначала декодировать произвольные URL bytes: это может изменить filename semantics и смешать URL escaping с path traversal.
* ZIP adapter разделяет также backslash (`fa_zip.c:172-175`), поэтому security rule обязана учитывать и `/`, и `\\`, даже если GLW view обычно пишет POSIX-style paths.

## Сравнение seams

| Вариант | Archive-boundary traversal | URL schemes / encoded segments | Compatibility и locality | Leverage и test seam | Оценка |
|---|---|---|---|---|---|
| 1. Глобально изменить `fa_absolute_path` (`fileaccess.c:191-203`) | Общая dot-normalization не знает, где archive URL заканчивается; может схлопнуть `zip://archive/../x` до URL, относящегося уже к другому archive/filesystem path. Нужен scheme-aware parser, что слишком много ответственности для generic helper. | Риск изменить все relative callers и special cases (`:197`); colon/opaque schemes должны остаться нетронутыми. Percent decoding всё равно не решается. | Максимальный blast radius: все callers `fa_absolute_path`, не только GLW. Возможна поломка исторического `./` поведения. | Легко покрыть helper unit tests, но сложно доказать корректность каждого scheme. | **Отклонить**: слишком глобально и опасно. |
| 2. Нормализовать в `glw_resolve_path` | Resolver видит parent URL, но не знает фактическую archive boundary: её определяет `zip_archive_find` через `fa_stat` и slash-walk (`fa_zip.c:422-485`). Full-URL normalization может сменить archive identity (контрпример выше). | Явно сохранить `skin://`, `dataroot://`, absolute/opaque URLs и percent-encoded bytes недостаточно для безопасного определения `zip://` boundary. | Локальный GLW blast radius, но seam расположен до protocol dispatch и не может гарантировать archive invariant. | Удобен для pure resolver tests, однако не покрывает `fa_stat`/`fa_scandir`/`reference` и допускает cross-archive confusion. | **Отклонить**. |
| 3. Нормализовать member path в ZIP adapter (`fa_zip.c`, `zip_file_find` после `zip_archive_find`) | Archive identity уже зафиксирована в `za`; stack-normalize только `r`, reject underflow относительно `za_root`. Полный URL не переписывается. | Scheme parsing уже завершён в `fa_resolve_proto`; encoded segments остаются literal. `/` и `\\` обрабатываются согласованно с `zip_archive_find_file`. | Меняет semantics всех ZIP consumers, но это единая и явная ZIP invariant. Archive root — security root; plugin-subdirectory confinement отдельна. | Центральный seam покрывает open/stat/scandir/reference; нужны focused ZIP fixture tests, существующего dedicated harness не найдено. | **Выбрать**. |
| 4. Нормализовать в `fa_load`/`fa_open_ex` после protocol dispatch | Слишком поздно и scheme context уже частично потерян; легко смешать archive filename и entry. Не гарантирует, что другие `fa_stat`/`fa_scandir` callers одинаковы. | Может затронуть все reads и opaque URLs. | Не локально к import; несогласованность между open/stat/scan. | Слабый test seam и высокий regression risk. | **Отклонить**. |

## Security invariants для выбранного seam

1. **Archive identity invariant:** `zip_archive_find` сначала выбирает и удерживает `za` (`fa_zip.c:422-485`); нормализация не имеет права менять archive URL `u` или повторно запускать generic URL resolution.
2. **Archive-root invariant:** stack normalization начинается относительно `za_root`; `..` при пустом stack — reject. Для этого fix security root — весь собственный archive. Нет fallback к filesystem, parent of archive или sibling archive.
3. **Separator invariant:** `/` и `\\` обрабатываются одинаково либо backslash отклоняется до adapter; нельзя позволить обход через alternate separator.
4. **Dot invariant:** `.` удаляется; обычные components сохраняются byte-for-byte (case-sensitive URL text; ZIP lookup itself остаётся case-insensitive как сейчас, `fa_zip.c:184-186`).
5. **Encoding invariant:** `%2e`, `%2f`, `%5c` не декодируются implicit normalizer-ом. Если когда-либо добавится URL decoding, он должен быть отдельной policy с tests и выполняться до boundary check, иначе encoded traversal станет bypass.
6. **Scheme invariant:** `skin://`, `dataroot://`, absolute paths и URLs с `:` не проходят generic filesystem dot normalization без явного parser branch. Existing `skin://` mapping remains at `glw_view_attrib.c:42-49`.
7. **Failure invariant:** rejected traversal returns deterministic error through each ZIP operation; `zip_file_find` returns NULL and callers report their existing error (`fa_zip.c:523-536`, `:734-743`, `:861-878`). GLW then reports load failure (`glw_view_lexer.c:413-418`).
8. **Scope invariant:** archive-root confinement is this change's contract. Restricting imports to the installed plugin subdirectory requires a separately supplied root/policy and separate tests; do not infer it from a URL string.
9. **Dedup invariant:** import cycle/dedup behavior remains unchanged unless canonical identity is deliberately added; current dedup compares raw import strings (`glw_view_preproc.c:326-328`).

## Тестовая матрица / acceptance criteria

Минимальная acceptance matrix для будущего core patch:

| Case | Parent / input | Expected |
|---|---|---|
| filesystem sibling | `/skin/views/a.view` + `../common.view` | `/skin/common.view`; existing filesystem behavior preserved |
| filesystem dot | `/skin/views/a.view` + `./x.view` | defined legacy-compatible result; no accidental CWD lookup |
| ZIP child | `zip:///tmp/a.zip/root/views/a.view` + `child.view` | `zip:///tmp/a.zip/root/views/child.view` |
| ZIP parent | same + `../common.view` | `zip:///tmp/a.zip/root/views/../common.view` normalized to `zip:///tmp/a.zip/root/common.view` |
| ZIP root underflow | `zip:///tmp/a.zip/root/a.view` + `../../outside.view` | reject in `zip_file_find` after archive selection; no `fa_load` of rewritten outer URL |
| repeated dots | `sub/./x/../common.view` | `sub/common.view` |
| alternate separator | `sub\\..\\common.view` | same safe result or explicit reject; never escape root |
| encoded dot | `%2e%2e/common.view` | treated literally or rejected by explicit policy; never silently decoded into traversal |
| scheme absolute | `http://host/x.view`, `dataroot://x`, `skin://x` | existing scheme branch/semantics unchanged |
| archive URL with nested slash | archive path `/tmp/a.b/c.zip` | archive delimiter is not confused with filesystem path; `zip_archive_find` still finds archive |
| cross-archive confusion | `zip://file:///tmp/a.zip/views/../../../b.zip/x.view` | archive remains `a.zip`; member underflow rejects; never select `b.zip` |
| missing entry | normalized but absent file | ordinary `Entry not found in archive`, no crash |
| import dedup/cycle | two raw spellings resolving same file | preserve current raw-string dedup unless intentionally changed and tested |

Acceptance is behavioral, not just string-based: a fixture ZIP must prove successful `#import "../common.view"`, and boundary/cross-archive fixtures must prove no entry outside the selected archive is opened. Because the seam is in the adapter, tests should exercise `fa_stat`, `fa_load`, `fa_scandir` and `fa_reference` through `zip_file_find`, plus GLW preprocessor error propagation. No existing dedicated `fa_zip` or GLW import test suite was found under core `tests/`; closest source-level test patterns are small C tests such as `src/prop/prop_test.c` and `src/audio2/audio_test.c`, so a focused C test or harness fixture is needed.

## Open questions

* The intended root for this fix is the entire ZIP archive (`za_root`), which is the plugin's own archive boundary. Should installed-plugin subdirectory confinement (`<plugin-root>` from `plugins.c:483-491`) be added as a separate policy with an explicit root context?
* Should `#include` receive exactly the same ZIP member normalization as `#import`? Both call `glw_view_load1` (`glw_view_preproc.c:300-308`, `:319-339`), and both eventually use the ZIP adapter.
* Should `./` retain current `fa_absolute_path` behavior or be corrected separately? This is a compatibility decision, not required to fix ZIP `..`.
* Do any non-GLW consumers intentionally depend on literal ZIP entry names containing `.` or `..`? ZIP tree currently permits such names during archive load (`fa_zip.c:369-377` plus `zip_archive_find_file(..., create=1)`), so rejecting traversal must distinguish canonical navigation from a literal archive member policy.
* Does URL escaping enter before `glw_resolve_path` in any caller? Current inspected path does not decode percent escapes; a future URL parser change must preserve the encoding invariant.
* What adapter error API should represent member underflow? `zip_file_find` currently returns NULL and callers supply operation-specific errors (`fa_zip.c:523-536`, `:734-743`, `:861-878`); a focused patch may add a distinct diagnostic without changing the NULL contract.

## Reproduction / source-inspection commands

The source facts above are anchored to the revision recorded at the top. A maintainer can reproduce the relevant slices with:

```sh
git -C /home/uzver/movian-public-clean rev-parse HEAD
sed -n '294,345p' /home/uzver/movian-public-clean/src/ui/glw/glw_view_preproc.c
sed -n '394,425p' /home/uzver/movian-public-clean/src/ui/glw/glw_view_lexer.c
sed -n '36,59p' /home/uzver/movian-public-clean/src/ui/glw/glw_view_attrib.c
sed -n '89,169p;191,222p;1882,1890p' /home/uzver/movian-public-clean/src/fileaccess/fileaccess.c
sed -n '159,207p;422,502p;725,805p;882,894p' /home/uzver/movian-public-clean/src/fileaccess/fa_zip.c
sed -n '467,519p' /home/uzver/movian-public-clean/src/plugins.c
```

These commands are read-only; no formatter, linter, or project-wide test was run.
