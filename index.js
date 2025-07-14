/**
 *  anilibra.tv plugin for Movian
 *
 *  Copyright (C) 2019-2025 Buksa
 *
 *  This program is free software": "you can redistribute it and/or modif,
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * Anilibria.tv plugin for Movian
 * Refactored for Duktape 1.8.0 compatibility
 */

// === IMPORTS ===
var page = require('movian/page');
var service = require('movian/service');
var settings = require('movian/settings');
var http = require('movian/http');
var io = require('native/io');

// === CONSTANTS ===
/**
 * Plugin manifest data.
 * @type {object}
 * @property {string} id - The plugin ID.
 * @property {string} icon - The path to the plugin icon.
 */
var plugin = JSON.parse(Plugin.manifest);
/**
 * Prefix for Movian routes, based on the plugin ID.
 * @type {string}
 */
var PREFIX = plugin.id;
/**
 * Path to the plugin's logo.
 * @type {string}
 */
var LOGO = Plugin.path + plugin.icon;
/**
 * User-Agent string to be used for HTTP requests.
 * @type {string}
 */
var UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// === CONFIGURATION ===
/**
 * Configuration object for the plugin.
 * @type {object}
 * @property {string} baseUrl - The base URL for Anilibria.tv.
 * @property {string} apiUrl - The API URL for Anilibria.tv.
 * @property {string} coverUrl - The base URL for cover images.
 * @property {number} pageSize - The number of items per page in listings.
 * @property {number} [cacheTime] - The cache time for HTTP requests in milliseconds (currently commented out).
 */
var config = {
  baseUrl: 'anilibria.tv',
  apiUrl: 'https://aniliberty.top/api/v1',
  coverUrl: 'https://static-libria.weekstorm.one',
  pageSize: 25,
  //cacheTime: 6000
};

// === UTILITIES ===
/**
 * Collection of utility functions.
 * @namespace utils
 */
var utils = {
  /**
   * Formats a duration in seconds into a human-readable string (e.g., "X мин Y сек").
   * @param {number} seconds - The duration in seconds.
   * @returns {string} The formatted duration string.
   */
  formatDuration: function(seconds) {
    if (!seconds) return '';
    var minutes = Math.floor(seconds / 60);
    var secs = seconds % 60;
    return minutes + ' мин ' + secs + ' сек';
  },

  /**
   * Formats a size in bytes into a human-readable string (e.g., "X.Y MB").
   * @param {number} bytes - The size in bytes.
   * @returns {string} The formatted size string.
   */
  formatSize: function(bytes) {
    if (!bytes) return '';
    var units = ['B', 'KB', 'MB', 'GB'];
    var size = bytes;
    var unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return size.toFixed(1) + ' ' + units[unitIndex];
  },

  /**
   * Pads a number with a leading zero if it's less than 10.
   * @param {number} n - The number to pad.
   * @returns {string|number} The padded number as a string, or the original number if not padded.
   */
  padZero: function(n) {
    return (n < 10 ? '0' : '') + n;
  },

  /**
   * Builds a URL by appending an endpoint and optionally adding query parameters.
   * @param {string} endpoint - The API endpoint.
   * @param {object} [params] - An object containing query parameters.
   * @returns {string} The constructed URL.
   */
  buildUrl: function(endpoint, params) {
    var url = config.apiUrl + endpoint;
    if (params) {
      var queryString = [];
      for (var key in params) {
        if (params.hasOwnProperty(key)) {
          queryString.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
      }
      if (queryString.length > 0) {
        url += '?' + queryString.join('&');
      }
    }
    return url;
  },

  /**
   * Extends a target object with properties from a source object.
   * @param {object} target - The object to extend.
   * @param {object} source - The object whose properties will be copied.
   * @returns {object} The extended target object.
   */
  extend: function(target, source) {
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
    return target;
  }
};

// === API CLIENT ===
/**
 * API client for interacting with the Anilibria API.
 * @namespace apiClient
 */
var apiClient = {
  /**
   * Default headers to be sent with API requests.
   * @type {object}
   */
  defaultHeaders: {
    'Accept': 'application/json',
    'User-Agent': UA,
    'Content-Type': 'application/json',
    'Content-encoding': 'br'
  },

  /**
   * Makes an HTTP request to the Anilibria API.
   * @param {string} url - The URL to request.
   * @param {object} [options] - Options for the HTTP request (e.g., method, headers, postdata).
   * @param {function(Error|null, object|null)} callback - The callback function to handle the response.
   */
  request: function(url, options, callback) {
    var requestOptions = {
      method: 'GET',
      headers: utils.extend({}, this.defaultHeaders),
      caching: true,
      cacheTime: config.cacheTime // Note: config.cacheTime is currently commented out in config
    };

    if (options) {
      utils.extend(requestOptions, options);
      if (options.headers) {
        utils.extend(requestOptions.headers, options.headers);
      }
    }

    http.request(url, requestOptions, function(error, response) {
      if (error) {
        console.error('API request failed:', error);
        callback(error, null);
        return;
      }

      if (response.statuscode !== 200) {
        var err = new Error('HTTP ' + response.statuscode);
        callback(err, null);
        return;
      }

      try {
        var data = JSON.parse(response.toString());
        console.log(data); // Log the response data
        callback(null, data);
      } catch (parseError) {
        callback(parseError, null);
      }
    });
  },

  /**
   * Searches for anime based on a query.
   * @param {string} query - The search query.
   * @param {function(Error|null, object|null)} callback - The callback function to handle the search results.
   */
  searchAnime: function(query, callback) {
    var url = 'https://www.' + config.baseUrl + '/public/api/index.php';
    var options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      postdata: {
        query: 'search',
        search: query,
        filter: 'id,code,names,poster'
      }
    };

    this.request(url, options, callback);
  },

  /**
   * Retrieves a catalog of anime releases.
   * @param {number} pageNum - The page number to retrieve.
   * @param {function(Error|null, object|null)} callback - The callback function to handle the catalog data.
   */
  getCatalog: function(pageNum, callback) {
    var url = utils.buildUrl('/anime/catalog/releases', {
      limit: config.pageSize,
      'f[sorting]': 'FRESH_AT_DESC',
      page: pageNum || 1
    });

    this.request(url, {}, callback);
  },

  /**
   * Retrieves details for a specific anime release.
   * @param {string} id - The ID of the anime release.
   * @param {function(Error|null, object|null)} callback - The callback function to handle the release data.
   */
  getRelease: function(id, callback) {
    var url = utils.buildUrl('/anime/releases/' + id);
    this.request(url, {}, callback);
  },

  /**
   * Retrieves franchise information for a given release.
   * @param {string} id - The ID of the anime release.
   * @param {function(Error|null, object|null)} callback - The callback function to handle the franchise data.
   */
  getFranchise: function(id, callback) {
    var url = utils.buildUrl('/anime/franchises/release/' + id);
    this.request(url, {}, function(error, data) {
      // Franchise might be missing, which is not critical
      callback(null, error ? null : data);
    });
  }
};

// === PAGE BUILDERS ===
/**
 * Functions responsible for building Movian pages.
 * @namespace pageBuilders
 */
var pageBuilders = {
  /**
   * Builds the search results page.
   * @param {MovianPage} page - The Movian page object.
   * @param {object} results - The search results data.
   */
  buildSearchResults: function(page, results) {
    console.error(results.data.length); // Log the number of results

    if (!results.data) return;

    for (var i = 0; i < results.data.length; i++) {
      var item = results.data[i];
      console.error(item.id) // Log the item ID
      page.appendItem(PREFIX + ':moviepage:' + item.id, 'video', {
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
      page.appendItem(PREFIX + ':moviepage:' + item.id, 'video', {
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
    page.metadata.icon = LOGO;
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
        PREFIX + ':play:' + JSON.stringify(episodeData),
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

      page.appendItem(PREFIX + ':moviepage:' + release.id, 'list', {
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


 console.error(plugin.id + ' ' + plugin.version + ' initialized');

/**
 * Creates a service entry in Movian for the plugin.
 */
service.create(plugin.title, PREFIX + ':start', 'video', true, LOGO);
/**
 * Creates global settings for the plugin in Movian.
 */
settings.globalSettings(plugin.id, plugin.title, LOGO, plugin.synopsis);

// Plugin settings
settings.createInfo('info', LOGO, 'Plugin developed by ' + plugin.author + '\n' + plugin.id + ' ' + plugin.version);
settings.createDivider('Settings:');
/**
 * Creates a string setting for the domain, allowing users to change the base URL.
 */
settings.createString('domain', 'Домен', config.baseUrl, function(v) {
  config.baseUrl = v;
});

// HTTP Inspector
/**
 * Sets up an HTTP inspector to modify headers for requests to '.*libria.*' URLs,
 * adding 'Accept-Encoding' and 'User-Agent' headers.
 */
io.httpInspectorCreate('.*libria.*', function(ctrl) {
  ctrl.setHeader('Accept-Encoding', 'gzip');
  ctrl.setHeader('User-Agent', UA);
});



// === ROUTE HANDLERS ===
/**
 * Movian Searcher route handler for performing anime searches.
 * @param {MovianPage} page - The Movian page object.
 * @param {string} query - The search query entered by the user.
 */
page.Searcher(PREFIX + ' - Result', LOGO, function(page, query) {
  page.metadata.icon = LOGO;
  page.metadata.title = PREFIX + ' - Search results for: ' + query;
  page.type = 'directory';
  page.loading = true;
  page.entries = 0;

  apiClient.searchAnime(query, function(error, results) {
    if (error) {
      console.error('Search failed:', error);
      page.appendItem('', 'separator', {
        title: 'Ошибка поиска'
      });
    } else {
      pageBuilders.buildSearchResults(page, results);
    }
    page.loading = false;
  });
});

/**
 * Movian Route handler for the plugin's starting page (catalog of releases).
 * This route supports asynchronous pagination.
 * @param {MovianPage} page - The Movian page object.
 */
new page.Route(PREFIX + ':start', function(page) {
  page.loading = true;
  page.metadata.logo = LOGO;
  page.metadata.icon = LOGO;
  page.metadata.title = PREFIX;
  page.model.contents = 'grid';
  page.type = 'directory';

  var currentPage = 1;

  /**
   * Loader function for asynchronous pagination of the catalog.
   * Fetches the next page of catalog data.
   */
  function loader() {
    apiClient.getCatalog(currentPage, function(error, data) {
      if (error) {
        console.error('Failed to load catalog:', error);
        page.appendItem('', 'separator', {
          title: 'Ошибка загрузки данных'
        });
        page.haveMore(false);
      } else {
        if (data.meta && data.meta.pagination.current_page >= data.meta.pagination.total_pages) {
          page.haveMore(false);
        } else {
          page.haveMore(true);
        }

        pageBuilders.buildCatalogPage(page, data);
        currentPage++;
      }

      page.loading = false;
    });
  }

  loader(); // Initial load
  page.asyncPaginator = loader; // Set the paginator for subsequent loads
});

/**
 * Movian Route handler for a specific movie/anime release page.
 * Fetches release details and franchise information concurrently.
 * @param {MovianPage} page - The Movian page object.
 * @param {string} id - The ID of the anime release.
 */
new page.Route(PREFIX + ':moviepage:(.*)', function(page, id) {
  page.loading = true;

  var releaseData = null;
  var franchiseData = null;
  var completedRequests = 0;

  /**
   * Checks if all necessary API requests have completed and then builds the page.
   */
  function checkCompletion() {
    completedRequests++;
    if (completedRequests === 2) { // Wait for both releaseData and franchiseData
      if (releaseData) {
        pageBuilders.buildReleasePage(page, releaseData, franchiseData);
      } else {
        page.error('Не удалось загрузить данные релиза');
      }
      page.loading = false;
    }
  }

  apiClient.getRelease(id, function(error, data) {
    if (!error) {
      releaseData = data;
    }
    checkCompletion();
  });

  apiClient.getFranchise(id, function(error, data) {
    if (!error) {
      franchiseData = data;
    }
    checkCompletion();
  });
});

/**
 * Movian Route handler for playing an episode.
 * Presents available HLS qualities for the episode.
 * @param {MovianPage} page - The Movian page object.
 * @param {string} data - JSON string containing episode data.
 */
new page.Route(PREFIX + ':play:(.*)', function(page, data) {
  var episodeData = JSON.parse(data);
  page.loading = true;
  page.type = 'directory';
  page.metadata.logo = LOGO;
  page.metadata.title = episodeData.title;

  var qualities = [
    ['480', 'hls_480'],
    ['720', 'hls_720'],
    ['1080', 'hls_1080']
  ];

  for (var i = 0; i < qualities.length; i++) {
    var quality = qualities[i][0];
    var key = qualities[i][1];
    var url = episodeData[key];

    if (url) {
      page.appendItem('hls:' + url, 'item', {
        title: '[HLS] - ' + quality + 'p - ' + episodeData.title
      });
    }
  }

  page.loading = false;
});