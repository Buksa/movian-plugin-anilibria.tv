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

// === MOVIAN IMPORTS ===
var page = require('movian/page');
var service = require('movian/service');
var settings = require('movian/settings');
var io = require('native/io');

// === LOCAL MODULES ===
var config = require('./src/config');
var apiClient = require('./src/api');
var ui = require('./src/ui');

// === PLUGIN INITIALIZATION ===
var plugin = JSON.parse(Plugin.manifest);
console.error(plugin.id + ' ' + plugin.version + ' initialized');

// Create service entry
service.create(plugin.title, config.PREFIX + ':start', 'video', true, config.LOGO);

// Create plugin settings
settings.globalSettings(plugin.id, plugin.title, config.LOGO, plugin.synopsis);
settings.createInfo('info', config.LOGO, 'Plugin developed by ' + plugin.author + '\n' + plugin.id + ' ' + plugin.version);
settings.createDivider('Settings:');
settings.createString('domain', 'Домен', config.baseUrl, function(v) {
  // Note: This change applies only after plugin reload.
  config.baseUrl = v;
});
settings.createString('apiUrl', 'apiUrl', config.apiUrl, function(v) {
  // Note: This change applies only after plugin reload.
  config.apiUrl = v;
});
settings.createString('coverUrl', 'coverUrl', config.coverUrl, function(v) {
  // Note: This change applies only after plugin reload.
  config.coverUrl = v;
});

// Setup HTTP Inspector
io.httpInspectorCreate('.*libria.*', function(ctrl) {
  ctrl.setHeader('Accept-Encoding', 'gzip');
  ctrl.setHeader('User-Agent', config.UA);
});


// === ROUTE HANDLERS ===

/**
 * Searcher route
 */
page.Searcher(plugin.title + ' - Result', config.LOGO, function(page, query) {
  page.metadata.icon = config.LOGO;
  page.metadata.title = plugin.title + ' - Search results for: ' + query;
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
      ui.buildSearchResults(page, results);
    }
    page.loading = false;
  });
});

/**
 * Start page route (Catalog)
 */
new page.Route(config.PREFIX + ':start', function(page) {
  page.loading = true;
  page.metadata.logo = config.LOGO;
  page.metadata.icon = config.LOGO;
  page.metadata.title = plugin.title;
  page.model.contents = 'grid';
  page.type = 'directory';

  var currentPage = 1;

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

        ui.buildCatalogPage(page, data);
        currentPage++;
      }

      page.loading = false;
    });
  }

  loader(); // Initial load
  page.asyncPaginator = loader; // Set the paginator
});

/**
 * Release details page route
 */
new page.Route(config.PREFIX + ':moviepage:(.*)', function(page, id) {
  page.loading = true;

  var releaseData = null;
  var franchiseData = null;
  var completedRequests = 0;

  function checkCompletion() {
    completedRequests++;
    if (completedRequests === 2) { // Wait for both requests
      if (releaseData) {
        ui.buildReleasePage(page, releaseData, franchiseData);
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
 * Play video route
 */
new page.Route(config.PREFIX + ':play:(.*)', function(page, data) {
  var episodeData = JSON.parse(data);
  page.loading = true;
  page.type = 'directory';
  page.metadata.logo = config.LOGO;
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
