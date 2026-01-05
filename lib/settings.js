// ============================================================================
// lib/settings.js - Настройки (без изменений, упрощен)
// ============================================================================

var settings = require('movian/settings');
var config = require('./config');
var resumeSettings = require('./resume/settings');

module.exports = {
  initialize: function(plugin) {
    settings.globalSettings(plugin.id, plugin.title, config.LOGO, plugin.synopsis);
    
    settings.createInfo('info', config.LOGO,
      'Plugin developed by ' + plugin.author + '\n' + plugin.id + ' ' + plugin.version
    );
    
    settings.createDivider('Настройки:');
    
    resumeSettings.createUI(settings);
    
    settings.createDivider('Прочие настройки:');
    
    settings.createBool('cacheEnabled', 'Включить кеширование',
      config.CACHE.ENABLED, function(v) {
        config.CACHE.ENABLED = v;
      }
    );
  }
};