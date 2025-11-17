// ============================================================================
// lib/ui.js - UI рендеринг (упрощенный)
// ============================================================================

function separator(page, title) {
  page.appendItem('', 'separator', { title: title });
}

module.exports = {
  renderCatalog: function(page, items) {
    if (!items || items.length === 0) {
      separator(page, 'Нет данных');
      return;
    }
    
    items.forEach(function(item) {
      page.appendItem(item.url, item.type, item.metadata);
    });
  },
  
  renderRelease: function(page, release, franchise) {
    var config = require('./config');
    var formatters = require('./formatters');
    
    // Метаданные страницы
    page.type = 'directory';
    page.metadata.title = release.name.main;
    page.metadata.subtitle = release.name.english || '';
    page.metadata.logo = config.API.COVER_URL + 
      (release.poster.preview || release.poster.src);
    
    // Франшиза
    if (franchise) {
      separator(page, franchise.title);
      if (franchise.info) {
        separator(page, franchise.info);
      }
      franchise.releases.forEach(function(item) {
        page.appendItem(item.url, item.type, item.metadata);
      });
    }
    
    // Эпизоды
    var episodes = formatters.episodes(release);
    if (episodes.length > 0) {
      separator(page, 'Эпизоды:');
      episodes.forEach(function(ep) {
        var item = page.appendItem(ep.url, ep.type, ep.metadata);
        item.bindVideoMetadata({ title: ep.metadata.title });
      });
    }
    
    // Торренты
    var torrents = formatters.torrents(release);
    if (torrents.length > 0) {
      separator(page, 'Торренты:');
      torrents.forEach(function(t) {
        page.appendItem(t.url, t.type, t.metadata);
      });
    }
  },
  
  renderSearch: function(page, items) {
    if (!items || items.length === 0) {
      separator(page, 'Ничего не найдено');
      separator(page, 'Попробуйте изменить поисковый запрос');
      return;
    }
    
    items.forEach(function(item) {
      page.appendItem(item.url, item.type, item.metadata);
      page.entries++
    });
  },
  
  renderError: function(page, message) {
    separator(page, '⚠ Ошибка');
    separator(page, message);
  },
  
  renderLoading: function(page, message) {
    separator(page, message || 'Загрузка...');
  }
};