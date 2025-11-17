// ============================================================================
// lib/config.js - Конфигурация
// ============================================================================

var plugin = JSON.parse(Plugin.manifest);

module.exports = {
  ID: plugin.id,
  PREFIX: plugin.id,
  LOGO: Plugin.path + plugin.icon,
  VERSION: plugin.version,
  
  API: {
    BASE_URL: 'https://aniliberty.top/api/v1',
    COVER_URL: 'https://static-libria.weekstorm.one',
    TIMEOUT: 30000
  },
  
  CACHE: {
    ENABLED: true,
    DURATION: 300000  // 5 минут
  },
  
  UI: {
    PAGE_SIZE: 25
  },
  
  RESUME: {
    AUTO_RESUME: false,
    FIND_NEXT_EPISODE: true,
    DELAY: 1500
  },
  
  HEADERS: {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Content-Type': 'application/json'
  }
};