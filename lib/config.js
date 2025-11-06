/**
 * config.js
 *
 * Централизованный модуль конфигурации.
 * Хранит все константы, URL и настройки плагина.
 */

var plugin = JSON.parse(Plugin.manifest);

var config = {
  // Plugin constants
  ID: plugin.id,
  PREFIX: plugin.id,
  LOGO: Plugin.path + plugin.icon,
  UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  
  // API and Content URLs
  baseUrl: 'anilibria.tv',
  apiUrl: 'https://aniliberty.top/api/v1',
  coverUrl: 'https://static-libria.weekstorm.one',
  
  // Plugin settings
  pageSize: 25,
  //cacheTime: 6000 // 1 hour
  
  // === НОВЫЕ НАСТРОЙКИ: Продолжение просмотра ===
  
  /**
   * Автоматически продолжать просмотр без показа popup
   * true - сразу переходит на следующий эпизод
   * false - показывает popup с вопросом (по умолчанию)
   */
  autoResume: false,
  
  /**
   * Искать следующий эпизод после последнего просмотренного
   * true - предлагает продолжить со следующего эпизода (по умолчанию)
   * false - предлагает продолжить с последнего просмотренного
   */
  findNextEpisode: true,
  
  /**
   * Задержка перед показом popup продолжения просмотра (миллисекунды)
   * Дает время для загрузки метаданных из kvstore
   */
  resumeDelay: 1500,
  
    
  /**
   * Устанавливать фокус на последний/следующий эпизод
   * true - пытается установить фокус (может не работать во всех случаях)
   * false - не устанавливает фокус
   */
  setFocusOnResume: false,
    
};

module.exports = config;

/**
 * ПРИМЕЧАНИЯ:
 * 
 * 1. Эти настройки можно изменить:
 *    - Программно в коде
 *    - Через settings в plugin.js (createBool, createInt)
 *    - Пользователь через UI Movian
 * 
 * 2. Пример использования в plugin.js:
 * 
 *    settings.createBool('autoResume', 'Автоматически продолжать просмотр', 
 *                        config.autoResume, function(v) {
 *      config.autoResume = v;
 *    });
 * 
 * 3. Пример использования в route:
 * 
 *    resume.find(page, page.getItems(), {
 *      autoResume: config.autoResume,
 *      findNext: config.findNextEpisode,
 *      delay: config.resumeDelay
 *    });
 */