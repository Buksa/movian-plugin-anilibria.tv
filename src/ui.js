/**
 * ui.js
 *
 * Модуль для построения пользовательского интерфейса (страниц, списков).
 */

var config = require('./config');
var utils = require('./utils');

var pageBuilders = {
  /**
   * Builds the search results page.
   * @param {MovianPage} page - The Movian page object.
   * @param {object} results - The search results data.
   */
  buildSearchResults: function(page, results) {
    if (!results.data) return;

    for (var i = 0; i < results.data.length; i++) {
      var item = results.data[i];
      page.appendItem(config.PREFIX + ':moviepage:' + item.id, 'video', {
        title: item.names[0],
        icon: config.coverUrl + item.poster
      });
      page.entries++;
    }
  },

  /**
   * Builds a catalog page of anime releases.
   * @param {MovianPage} page - The Movian page object.
   * @param {object} data - The catalog data.
   */
  buildCatalogPage: function(page, data) {
    if (!data.data || data.data.length === 0) {
      page.appendItem('', 'separator', {
        title: 'Нет данных для отображения'
      });
      return;
    }

    for (var i = 0; i < data.data.length; i++) {
      var item = data.data[i];
      page.appendItem(config.PREFIX + ':moviepage:' + item.id, 'video', {
        title: item.name.main,
        description: item.description || 'Описание отсутствует',
        icon: config.coverUrl + (item.poster.preview || item.poster.src),
        year: item.year,
        age_rating: item.age_rating ? item.age_rating.label : undefined
      });
    }
  },

  /**
   * Builds a detailed release page, including episodes, torrents, franchise info, and team members.
   * @param {MovianPage} page - The Movian page object.
   * @param {object} releaseData - The data for the specific anime release.
   * @param {object} franchiseData - The franchise data for the release.
   */
  buildReleasePage: function(page, releaseData, franchiseData) {
    this.setPageMetadata(page, releaseData);
    this.addEpisodes(page, releaseData);
    this.addTorrents(page, releaseData);
    this.addFranchise(page, franchiseData, releaseData.id);
    //this.addTeamMembers(page, releaseData);
  },

  /**
   * Sets the metadata for a Movian page based on release data.
   * @param {MovianPage} page - The Movian page object.
   * @param {object} data - The release data.
   */
  setPageMetadata: function(page, data) {
    page.type = 'directory';
    page.metadata.title = data.name.main;
    page.metadata.subtitle = data.name.english || '';
    page.metadata.icon = config.LOGO;
    page.metadata.logo = config.coverUrl + (data.poster.preview || data.poster.src);
  },

  /**
   * Adds episode listings to a Movian page.
   * @param {MovianPage} page - The Movian page object.
   * @param {object} data - The release data containing episode information.
   */
  addEpisodes: function(page, data) {
    if (!data.episodes || data.episodes.length === 0) return;

    page.appendItem('', 'separator', {
      title: 'Эпизоды:'
    });

    for (var i = 0; i < data.episodes.length; i++) {
      var episode = data.episodes[i];
      var episodeTitle = data.name.english + ' S01E' + utils.padZero(episode.ordinal);
      var episodeData = {
        id: data.id,
        ordinal: episode.ordinal,
        title: episodeTitle,
        hls_480: episode.hls_480,
        hls_720: episode.hls_720,
        hls_1080: episode.hls_1080,
        duration: episode.duration
      };

      var item = page.appendItem(
        config.PREFIX + ':play:' + JSON.stringify(episodeData),
        'video', {
          title: episodeTitle,
          description: 'Длительность: ' + utils.formatDuration(episode.duration)
        }
      );

      item.bindVideoMetadata({
        title: episodeTitle
      });
    }
  },

  /**
   * Adds torrent listings to a Movian page.
   * @param {MovianPage} page - The Movian page object.
   * @param {object} data - The release data containing torrent information.
   */
  addTorrents: function(page, data) {
    if (!data.torrents || data.torrents.length === 0) return;

    page.appendItem('', 'separator', {
      title: 'Торренты:'
    });

    for (var i = 0; i < data.torrents.length; i++) {
      var torrent = data.torrents[i];
      page.appendItem('torrent:browse:' + torrent.magnet, 'list', {
        title: torrent.label + ' ' + utils.formatSize(torrent.size) + ' | S: ' + torrent.seeders + ' | L: ' + torrent.leechers,
        description: 'Размер: ' + utils.formatSize(torrent.size) + ' | Сиды: ' + torrent.seeders + ' | Личи: ' + torrent.leechers
      });
    }
  },

  /**
   * Adds franchise-related releases to a Movian page.
   * @param {MovianPage} page - The Movian page object.
   * @param {object} franchiseData - The franchise data.
   * @param {string} currentId - The ID of the current release to exclude from the list.
   */
  addFranchise: function(page, franchiseData, currentId) {
    if (!franchiseData || franchiseData.length === 0) return;

    var franchise = franchiseData[0];
    var otherReleases = [];

    for (var i = 0; i < franchise.franchise_releases.length; i++) {
      var release = franchise.franchise_releases[i];
      if (release.release.id != currentId) {
        otherReleases.push(release);
      }
    }

    if (otherReleases.length === 0) return;

    var franchiseTitle = 'Франшиза: ' + franchise.name;
    if (franchise.name_english) {
      franchiseTitle += ' (' + franchise.name_english + ')';
    }

    page.appendItem('', 'separator', {
      title: franchiseTitle
    });

    // Общая информация о франшизе
    var franchiseInfo = [];
    if(franchise.first_year && franchise.last_year) {
      franchiseInfo.push(franchise.first_year + '-' + franchise.last_year);
    }
    if(franchise.total_releases) {
      franchiseInfo.push(franchise.total_releases + ' релизов');
    }
    if(franchise.total_episodes) {
      franchiseInfo.push(franchise.total_episodes + ' эпизодов');
    }
    if(franchise.total_duration) {
      franchiseInfo.push(franchise.total_duration);
    }
    
    if(franchiseInfo.length > 0) {
      page.appendItem('', 'separator', {
        title: franchiseInfo.join(' | ')
      });
    }

    for (var i = 0; i < otherReleases.length; i++) {
      var release = otherReleases[i].release;
      var releaseInfo = [];

      if (release.year) releaseInfo.push(release.year);
      if (release.type && release.type.description) releaseInfo.push(release.type.description);
      if (release.season && release.season.description) releaseInfo.push(release.season.description);

      var title = release.name.main;
      if (release.name.english) {
        title += ' (' + release.name.english + ')';
      }

      page.appendItem(config.PREFIX + ':moviepage:' + release.id, 'list', {
        title: title,
        description: releaseInfo.join(' | '),
        icon: config.coverUrl + (release.poster.preview || release.poster.src)
      });
    }
  },

  /**
   * Adds team members involved in the release to a Movian page.
   * @param {MovianPage} page - The Movian page object.
   * @param {object} data - The release data containing team members information.
   */
  addTeamMembers: function(page, data) {
    if (!data.members || data.members.length === 0) return;

    page.appendItem('', 'separator', {
      title: 'Команда (' + data.members.length + ')'
    });

    for (var i = 0; i < data.members.length; i++) {
      var member = data.members[i];
      page.appendItem('', 'separator', {
        title: member.nickname,
        description: member.role.description
      });
    }
  }
};

module.exports = pageBuilders;
