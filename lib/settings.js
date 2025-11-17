// ============================================================================
// lib/settings.js - Настройки (без изменений, упрощен)
// ============================================================================

var settings = require('movian/settings');
var config = require('./config');

module.exports = {
  initialize: function(plugin) {
    settings.globalSettings(plugin.id, plugin.title, config.LOGO, plugin.synopsis);
    
    settings.createInfo('info', config.LOGO,
      'Plugin developed by ' + plugin.author + '\n' + plugin.id + ' ' + plugin.version
    );
    
    settings.createDivider('Настройки:');
    
    settings.createBool('autoResume', 'Автоматически продолжать просмотр',
      config.RESUME.AUTO_RESUME, function(v) {
        config.RESUME.AUTO_RESUME = v;
      }
    );
    
    settings.createBool('findNextEpisode', 'Продолжать со следующего эпизода',
      config.RESUME.FIND_NEXT_EPISODE, function(v) {
        config.RESUME.FIND_NEXT_EPISODE = v;
      }
    );
    
    settings.createBool('cacheEnabled', 'Включить кеширование',
      config.CACHE.ENABLED, function(v) {
        config.CACHE.ENABLED = v;
      }
    );
  }
};