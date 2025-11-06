/**
 *  anilibra.tv plugin for Movian
 *
 *  Copyright (C) 2019-2025 Buksa
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 */

// === MOVIAN IMPORTS ===
var page = require('movian/page');
var service = require('movian/service');
var settings = require('movian/settings');
var io = require('native/io');

// === LOCAL MODULES ===
var config = require('./lib/config');
var apiClient = require('./lib/api');
var ui = require('./lib/ui');
var log = require('./lib/log');
var resume = require('./lib/resume_playback'); // ← НОВЫЙ МОДУЛЬ

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
  config.baseUrl = v;
});

// === НАСТРОЙКИ ПРОДОЛЖЕНИЯ ПРОСМОТРА ===

settings.createDivider('Продолжение просмотра:');

settings.createInfo('resume_info', config.LOGO,
  'Автоматическое определение последнего просмотренного эпизода\n' +
  'и предложение продолжить со следующего'
);

settings.createBool('autoResume','Автоматически продолжать без вопроса',
  config.autoResume, function(v) {
    config.autoResume = v;
    print('[SETTINGS] autoResume изменено на: ' + v);
  }
);

settings.createBool('findNextEpisode','Продолжать со следующего эпизода',
  config.findNextEpisode, function(v) {
    config.findNextEpisode = v;
    print('[SETTINGS] findNextEpisode изменено на: ' + v);
  }
);

settings.createInt('resumeDelay','Задержка перед popup (мс)',
  config.resumeDelay, 500, 5000, 100, '', function(v) {
    config.resumeDelay = v;
    print('[SETTINGS] resumeDelay изменено на: ' + v);
  }
);


// settings.createBool('setFocusOnResume','Устанавливать фокус на эпизод',
//   config.setFocusOnResume, function(v) {
//     config.setFocusOnResume = v;
//     print('[SETTINGS] setFocusOnResume изменено на: ' + v);
//   }
// );


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
    if (completedRequests === 2) {
      if (releaseData) {
        ui.buildReleasePage(page, releaseData, franchiseData);

        // === ПРОДОЛЖЕНИЕ ПРОСМОТРА ===
        
        // Импортируем модуль (если еще не импортирован в начале файла)
        var resume = require('./lib/resume_playback');
        
        // Вызываем с настройками из config
        resume.find(page, page.getItems(), {
          // Основные настройки
          autoResume: config.autoResume,
          findNext: config.findNextEpisode,
          delay: config.resumeDelay,
          

        });
        
        // Опционально: установить фокус (если включено в настройках)
        if (config.setFocusOnResume) {
          setTimeout(function() {
            resume.focus(page.getItems(), config.findNextEpisode);
          }, config.resumeDelay + 500); // После popup
        }

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
 * АЛЬТЕРНАТИВНЫЕ ВАРИАНТЫ ИСПОЛЬЗОВАНИЯ:
 * 
 * 1. Упрощенный (минимум опций):
 * 
 *    resume.find(page, page.getItems());
 * 
 * 
 * 2. Только информация (без действий):
 * 
 *    var info = resume.info(page.getItems());
 *    if (info) {
 *      console.log('Последний:', info.title);
 *      console.log('Следующий доступен:', info.hasNext);
 *      if (info.hasNext) {
 *        console.log('Следующий:', info.nextEpisode.title);
 *      }
 *    }
 * 
 * 
 * 3. Только фокус без redirect:
 * 
 *    resume.focus(page.getItems(), true);  // на следующий
 *    resume.focus(page.getItems(), false); // на последний просмотренный
 * 
 * 
 * 4. Условное использование (например, только для сериалов):
 * 
 *    if (releaseData.type === 'TV') {
 *      resume.find(page, page.getItems(), {
 *        autoResume: config.autoResume,
 *        findNext: config.findNextEpisode
 *      });
 *    }
 */

/**
 * Play video route
 */
new page.Route(config.PREFIX + ':play:(.*)', function(page, data) {
  var canonicalUrl = config.PREFIX + ':play:' + data;
  var episodeData = JSON.parse(data);
  
  console.log('[PLAY] Opening episode:', episodeData.title);
  print('[PLAY] Opening episode: ' + episodeData.title);
  
  page.loading = true;
  page.type = 'directory';
  page.metadata.logo = config.LOGO;
  page.metadata.title = episodeData.title;

  var videoparams = {
    canonicalUrl: canonicalUrl,
    no_fs_scan: true,
    title: episodeData.title,
    sources: []
  };

  var qualities = [
    ['480', 'hls_480'],
    ['720', 'hls_720'],
    ['1080', 'hls_1080']
  ];

  // Собираем все качества
  for (var i = 0; i < qualities.length; i++) {
    var quality = qualities[i][0];
    var key = qualities[i][1];
    var url = episodeData[key];
    
    if (url) {
      videoparams.sources.push({
        url: 'hls:' + url,
        title: quality + 'p'
      });
    }
  }

  // Если есть хотя бы один источник
  if (videoparams.sources.length > 0) {
    // Добавляем элементы для каждого качества
    for (var i = 0; i < videoparams.sources.length; i++) {
      var source = videoparams.sources[i];
      var singleSourceParams = {
        canonicalUrl: canonicalUrl,
        no_fs_scan: true,
        title: episodeData.title,
        sources: [source]
      };
      
      var videoStr = 'videoparams:' + JSON.stringify(singleSourceParams);
      page.appendItem(videoStr, 'item', {
        title: '[HLS] - ' + source.title + ' - ' + episodeData.title
      });
    }
  } else {
    page.appendItem('', 'separator', {
      title: 'Ошибка: не найдено источников видео'
    });
  }

  page.loading = false;
});