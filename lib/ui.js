/**
 * ui.js
 *
 * Модуль для построения пользовательского интерфейса (страниц, списков).
 */

var config = require('./config');
var utils = require('./utils');
var prop = require('movian/prop');

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
   * Отладочная функция для вывода всех элементов страницы
   * @param {MovianPage} page - The Movian page object
   */
  debugPageItems: function(page) {
    console.log('[DEBUG] === АНАЛИЗ ЭЛЕМЕНТОВ СТРАНИЦЫ ===');
    try {
      var items = page.getItems();
      console.log('[DEBUG] Всего элементов на странице:', items.length);
      
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        console.log('[DEBUG] Элемент', i + ':',
                   'type=' + (item.root.type || 'undefined') +
                   ', title=' + (item.root.metadata && item.root.metadata.title ? item.root.metadata.title.toString() : 'N/A') +
                   ', playcount=' + (item.root.playcount ? item.root.playcount.valueOf() : 'undefined') +
                   ', lastplayed=' + (item.root.lastplayed ? item.root.lastplayed.valueOf() : 'undefined'));
        
        // Дамп свойств элемента
        if (item.root.type === 'video') {
          console.log('[DEBUG] Дамп video элемента', i + ':');
          try {
            item.dump();
          } catch (e) {
            console.log('[DEBUG] Ошибка дампа элемента:', e);
          }
        }
      }
    } catch (e) {
      console.log('[DEBUG] Ошибка анализа элементов страницы:', e);
    }
  },

  /**
   * Устанавливает фокус на последний просмотренный эпизод
   * @param {MovianPage} page - The Movian page object
   */
  setFocusOnLastWatchedEpisode: function(page) {
    console.log('[DEBUG] === УСТАНОВКА ФОКУСА НА ПОСЛЕДНИЙ ПРОСМОТРЕННЫЙ ЭПИЗОД ===');
    
    try {
      var items = page.getItems();
      var lastWatchedItem = null;
      var lastWatchedTime = 0;
      var videoItemsCount = 0;

      console.log('[DEBUG] Всего элементов для анализа:', items.length);

      // Найти последний просмотренный эпизод среди video элементов
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        
        console.log('[DEBUG] Анализ элемента', i + ':', 
                   'type=' + (item.root.type || 'undefined') + 
                   ', title=' + (item.root.metadata && item.root.metadata.title ? item.root.metadata.title.toString() : 'N/A'));
        
        // Проверяем только video элементы (эпизоды)
        if (item.root.type === 'video') {
          videoItemsCount++;
          console.log('[DEBUG] Найден video элемент #' + videoItemsCount);
          
          try {
            // Получить данные из привязанных метаданных (kvstore)
            var playcount = item.root.playcount ? item.root.playcount.valueOf() : 0;
            var lastplayed = item.root.lastplayed ? item.root.lastplayed.valueOf() : 0;
            var restartpos = item.root.restartpos ? item.root.restartpos.valueOf() : 0;
            
            console.log('[DEBUG] Метаданные video элемента:',
                       'playcount=' + playcount +
                       ', lastplayed=' + lastplayed +
                       ', restartpos=' + restartpos);
            
            // Изменяем логику: если есть playcount > 0, то это просмотренный эпизод
            // Если lastplayed = 0, используем playcount как приоритет
            var priority = lastplayed > 0 ? lastplayed : (playcount > 0 ? playcount : 0);
            
            if (playcount > 0 && priority > lastWatchedTime) {
              lastWatchedTime = priority;
              lastWatchedItem = item;
              console.log('[DEBUG] *** НОВЫЙ КАНДИДАТ НА ФОКУС *** (priority=' + priority + ')');
            }
          } catch (e) {
            console.log('[DEBUG] Ошибка доступа к метаданным элемента', i + ':', e);
          }
        }
      }

      console.log('[DEBUG] Результат анализа:',
                 'videoItemsCount=' + videoItemsCount +
                 ', lastWatchedFound=' + !!lastWatchedItem +
                 ', lastWatchedTime=' + lastWatchedTime);

      // Установить фокус на найденный элемент
      if (lastWatchedItem) {
        console.log('[DEBUG] Установка фокуса на элемент:', 
                   lastWatchedItem.root.metadata.title.toString());
        
        // Попробовать переместить элемент в начало списка для лучшего фокуса
        try {
          console.log('[DEBUG] Попытка перемещения элемента в начало списка');
          var firstVideoItem = null;
          for (var j = 0; j < items.length; j++) {
            if (items[j].root.type === 'video') {
              firstVideoItem = items[j];
              break;
            }
          }
          
          if (firstVideoItem && firstVideoItem !== lastWatchedItem) {
            console.log('[DEBUG] Перемещение элемента через moveBefore');
            lastWatchedItem.moveBefore(firstVideoItem);
            console.log('[DEBUG] Элемент перемещен');
          }
        } catch (e) {
          console.log('[DEBUG] Ошибка перемещения элемента:', e);
        }
        

        
        // Метод 1: Установить очень высокий приоритет фокуса
        console.log('[DEBUG] Установка focusable = 100.0');
        lastWatchedItem.root.focusable = 100.0;
        
        // Метод 2: Немедленная установка фокуса
        try {
          console.log('[DEBUG] Немедленная установка focused = 1');
          lastWatchedItem.root.focused = 1;
          console.log('[DEBUG] focused = 1 установлен');
        } catch (e) {
          console.log('[DEBUG] Ошибка установки focused:', e);
        }
        
        // Метод 3: Попробовать разные способы установки фокуса
        setTimeout(function() {
          console.log('[DEBUG] Попытка установки фокуса через prop.sendEvent');
          try {
            prop.sendEvent(lastWatchedItem.root, 'focus', true);
            console.log('[DEBUG] prop.sendEvent успешно');
          } catch (e) {
            console.log('[DEBUG] Ошибка prop.sendEvent:', e);
          }
          
          // Попробовать через GLW события
          try {
            console.log('[DEBUG] Попытка через GLW Activate');
            prop.sendEvent(lastWatchedItem.root.eventSink, 'Activate', 'focus');
            console.log('[DEBUG] GLW Activate успешно');
          } catch (e) {
            console.log('[DEBUG] Ошибка GLW Activate:', e);
          }
          
          // Попробовать через page model с правильным API
          try {
            console.log('[DEBUG] Попытка через page.model');
            var prop = require('movian/prop');
            if (page.model && page.model.nodes) {
              prop.sendEvent(page.model.nodes, 'focusChild', lastWatchedItem.root);
              console.log('[DEBUG] page.model focusChild успешно');
            }
          } catch (e) {
            console.log('[DEBUG] Ошибка page.model:', e);
          }
        }, 100);
        
        // Метод 4: Отложенная установка для перехвата системного фокуса
        setTimeout(function() {
          try {
            console.log('[DEBUG] Отложенная установка фокуса');
            lastWatchedItem.root.focusable = 1000.0; // Очень высокий приоритет
            lastWatchedItem.root.focused = 1;
            console.log('[DEBUG] Отложенная установка завершена');
          } catch (e) {
            console.log('[DEBUG] Ошибка отложенной установки:', e);
          }
        }, 500);
        
        console.log('[DEBUG] Фокус установлен успешно');
        return true;
      } else {
        console.log('[DEBUG] Не найдено просмотренных эпизодов для установки фокуса');
      }
    } catch (e) {
      console.log('[DEBUG] Критическая ошибка установки фокуса:', e);
    }
    
    return false;
  },

  /**
   * Пробует альтернативные методы установки фокуса
   * @param {MovianPage} page - The Movian page object
   */
  tryAlternativeFocusMethods: function(page) {
    console.log('[DEBUG] === АЛЬТЕРНАТИВНЫЕ МЕТОДЫ УСТАНОВКИ ФОКУСА ===');
    
    try {
      var items = page.getItems();
      var targetItem = null;
      var lastWatchedTime = 0;

      // Найти целевой элемент
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.root.type === 'video') {
          try {
            var playcount = item.root.playcount ? item.root.playcount.valueOf() : 0;
            var lastplayed = item.root.lastplayed ? item.root.lastplayed.valueOf() : 0;
            
            if (playcount > 0 && lastplayed > 0 && lastplayed > lastWatchedTime) {
              lastWatchedTime = lastplayed;
              targetItem = item;
            }
          } catch (e) {
            // ignore
          }
        }
      }

      if (!targetItem) {
        console.log('[DEBUG] Целевой элемент не найден');
        return;
      }

      console.log('[DEBUG] Целевой элемент найден:', targetItem.root.metadata.title.toString());

      // Метод 1: Через page model
      try {
        console.log('[DEBUG] Попытка через page.model.nodes');
        var prop = require('movian/prop');
        
        // Установить focused на уровне page model
        if (page.model && page.model.nodes) {
          prop.sendEvent(page.model.nodes, 'focusChild', targetItem.root);
          console.log('[DEBUG] Отправлено focusChild через page.model.nodes');
        }
      } catch (e) {
        console.log('[DEBUG] Ошибка метода page.model.nodes:', e);
      }

      // Метод 2: Через GLW сигналы
      setTimeout(function() {
        try {
          console.log('[DEBUG] Попытка через GLW сигналы');
          var prop = require('movian/prop');
          
          // Отправить различные GLW события
          prop.sendEvent(targetItem.root.eventSink, 'Activate', 'focus');
          prop.sendEvent(targetItem.root.eventSink, 'FocusChild', targetItem.root);
          prop.sendEvent(targetItem.root.eventSink, 'focus', 'interactive');
          
          console.log('[DEBUG] GLW сигналы отправлены');
        } catch (e) {
          console.log('[DEBUG] Ошибка GLW сигналов:', e);
        }
      }, 500);

      // Метод 3: Прямая установка свойств
      setTimeout(function() {
        try {
          console.log('[DEBUG] Попытка прямой установки свойств');
          
          // Установить различные свойства фокуса
          targetItem.root.focused = 1;
          targetItem.root.focusable = 100.0;
          
          // Попробовать установить на родительском элементе
          if (page.model && page.model.nodes) {
            page.model.nodes.focused = targetItem.root;
          }
          
          console.log('[DEBUG] Свойства фокуса установлены');
        } catch (e) {
          console.log('[DEBUG] Ошибка установки свойств:', e);
        }
      }, 1000);

      // Метод 4: Через подписки
      setTimeout(function() {
        try {
          console.log('[DEBUG] Попытка через подписки');
          
          // Подписаться на изменения фокуса
          prop.subscribeValue(model.nodes.focused, function(value) {
            console.log('[DEBUG] Фокус изменился на:', value);
          });
          
          // Попробовать установить фокус через subscription
          if (page.model && page.model.nodes) {
            page.model.nodes.focused = targetItem.root;
          }
          
        } catch (e) {
          console.log('[DEBUG] Ошибка подписок:', e);
        }
      }, 1500);

    } catch (e) {
      console.log('[DEBUG] Критическая ошибка альтернативных методов:', e);
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
