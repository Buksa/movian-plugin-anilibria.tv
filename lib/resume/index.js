/* resume/index.js - Главный экспорт модуля Resume */
/* eslint-disable no-var, max-len, require-jsdoc */

/**
 * Модуль Resume - Возобновление просмотра
 * 
 * Экспортирует все компоненты модуля для удобного использования
 */

module.exports = {
    // Основной модуль возобновления
    resume: require('./resume'),
    
    // Модуль навигации
    navigation: require('./navigation'),
    
    // Конфигурация
    config: require('./config'),
    
    // Настройки
    settings: require('./settings')
};
