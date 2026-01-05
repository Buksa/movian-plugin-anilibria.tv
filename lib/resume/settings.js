/* resume-settings.js - Настройки модуля Resume через Movian Settings API */
/* eslint-disable no-var, max-len, require-jsdoc */

var resumeConfig = require('./config');

/**
 * Обновляет конкретную настройку
 * 
 * @param {string} setting - Название настройки
 * @param {*} value - Новое значение
 */
exports.updateSetting = function(setting, value) {
    switch (setting) {
        case 'enabled':
            resumeConfig.ENABLED = value;
            break;
        case 'autoResume':
            resumeConfig.AUTO_RESUME = value;
            break;
        case 'findNext':
            resumeConfig.FIND_NEXT_EPISODE = value;
            break;
        case 'delay':
            // Валидация значения
            if (value < 500) value = 500;
            if (value > 5000) value = 5000;
            resumeConfig.DELAY = value;
            break;
    }
};

/**
 * Получает текущие настройки как объект
 * 
 * @returns {object} Объект с настройками
 */
exports.getSettings = function() {
    return {
        enabled: resumeConfig.ENABLED,
        autoResume: resumeConfig.AUTO_RESUME,
        findNext: resumeConfig.FIND_NEXT_EPISODE,
        delay: resumeConfig.DELAY
    };
};

/**
 * Сбрасывает настройки к значениям по умолчанию
 */
exports.resetSettings = function() {
    resumeConfig.ENABLED = true;
    resumeConfig.AUTO_RESUME = false;
    resumeConfig.FIND_NEXT_EPISODE = true;
    resumeConfig.DELAY = 1500;
};

/**
 * Создаёт UI элементы настроек в Movian Settings API
 * 
 * @param {object} settings - Объект settings из require('movian/settings')
 * 
 * @example
 * var resumeSettings = require('./utils/resume/settings');
 * resumeSettings.createUI(settings);
 */
exports.createUI = function(settings) {
    var currentSettings = exports.getSettings();
    
    // Раздел настроек
    settings.createDivider('Возобновление просмотра:');
    
    // Включить/выключить функционал Resume
    settings.createBool('resumeEnabled', 'Включить возобновление просмотра', 
        currentSettings.enabled, function(v) {
            exports.updateSetting('enabled', v);
        }
    );
    
    // Автоматическое возобновление
    settings.createBool('autoResume', 'Автоматически возобновлять без диалога', 
        currentSettings.autoResume, function(v) {
            exports.updateSetting('autoResume', v);
        }
    );
    
    // Поиск следующего эпизода
    settings.createBool('findNext', 'Предлагать следующий эпизод', 
        currentSettings.findNext, function(v) {
            exports.updateSetting('findNext', v);
        }
    );
    
    // Задержка перед показом диалога
    settings.createInt('resumeDelay', 'Задержка перед диалогом (мс)', 
        currentSettings.delay, 500, 5000, 100, 'мс', function(v) {
            exports.updateSetting('delay', v);
        }
    );
};

module.exports = exports;
