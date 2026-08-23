# AniLibria

This context covers anime releases, their episodes, franchise relationships, and playback state as presented by the plugin.

## Language

**Release**:
An AniLibria title entry with metadata, episodes, and optional franchise and torrent information.
_Avoid_: show, product

**Episode**:
A playable installment belonging to a release, with a stable ordinal and playback state.
_Avoid_: item, card

**Franchise**:
The ordered relationship connecting releases that belong to the same title sequence.
_Avoid_: collection, group

**Franchise release sequence**:
The ordered set of releases in a franchise, including the current release when present.
_Avoid_: carousel, rail

**Watched episode**:
An episode with recorded playback history, including play count or a saved position.
_Avoid_: completed item

**Plugin setting**:
A user-controlled preference or action that changes API access or playback behavior through the plugin settings surface.
_Avoid_: configuration, option

**API mirror**:
An alternate AniLibria API base URL selected by DNS discovery or explicitly supplied by the user.
_Avoid_: endpoint, server

**Catalog pagination**:
The ordered loading of catalog pages with cache state, availability of more pages, and user-visible loading completion.
_Avoid_: infinite scroll, page list

**Release enrichment**:
The required release data combined with optional franchise context used to present a Release.
_Avoid_: metadata fetch, decoration
