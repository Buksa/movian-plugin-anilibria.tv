/**
 * Модуль для автоматического продолжения просмотра
 * lib/resume_playback.js
 */

var prop = require('movian/prop');
//var popup = require('movian/popup');
var popup = require('native/popup');

/**
 * Ищет последний просмотренный эпизод и предлагает продолжить
 * @param {Page} page - Объект страницы Movian
 * @param {Array<Item>} items - Массив элементов страницы
 * @param {Object} options - Опции поведения
 * @param {boolean} options.autoResume - Автоматически продолжить без вопроса
 * @param {boolean} options.findNext - Искать следующий эпизод после последнего просмотренного
 * @param {number} options.delay - Задержка перед показом popup (мс)
 */
function findAndResumeLastWatched(page, items, options) {
  // Опции по умолчанию
  options = options || {};
  var autoResume = options.autoResume || false;
  var findNext = options.findNext !== false; // по умолчанию true
  var delay = options.delay || 1000; // 1 секунда по умолчанию
  
  console.log('[RESUME] Начало поиска последнего просмотренного эпизода');
  print('[RESUME] Начало поиска последнего просмотренного эпизода');
  
  // Откладываем проверку на указанное время
  setTimeout(function() {
    var result = findLastWatchedEpisode(items, options);
    
    if (!result) {
      console.log('[RESUME] Не найдено просмотренных эпизодов');
      print('[RESUME] Не найдено просмотренных эпизодов');
      return;
    }
    
    console.log('[RESUME] Найден последний просмотренный:', result);
    print('[RESUME] Найден последний просмотренный: эпизод #' + result.index);
    
    // Определяем какой эпизод открывать
    var targetEpisode = result;
    
    if (findNext && result.hasNext) {
      targetEpisode = result.nextEpisode;
      console.log('[RESUME] Найден следующий эпизод:', targetEpisode);
      print('[RESUME] Следующий эпизод: #' + targetEpisode.index);
    }
    
    // Если автовозобновление включено - сразу переходим
    if (autoResume) {
      console.log('[RESUME] Автовозобновление: переход на', targetEpisode.title);
      print('[RESUME] Автовозобновление: переход на ' + targetEpisode.title);
      page.redirect(targetEpisode.url);
      return;
    }
    
    // Показываем popup с вопросом
    showResumePopup(page, result, targetEpisode, findNext);
    
  }, delay);
}

/**
 * Ищет последний просмотренный эпизод
 * @param {Array<Item>} items - Массив элементов
 * @param {Object} config - Настройки (опционально)
 * @returns {Object|null} Информация о последнем просмотренном эпизоде
 */
function findLastWatchedEpisode(items, config) {
  // Настройки по умолчанию
  config = config || {};
  
  var lastWatched = null;
  var maxIndex = -1;
  
  print('[RESUME] Анализ ' + items.length + ' элементов');
  
  items.forEach(function(item, index) {
    try {
      var type = item.root.type ? item.root.type.valueOf() : null;
      
      if (type === 'video') {
        var playcount = item.root.playcount ? item.root.playcount.valueOf() : 0;
        var title = item.root.metadata.title ? item.root.metadata.title.valueOf() : 'Без названия';
        var url = item.root.url ? item.root.url.valueOf() : '';
        
        console.log('[RESUME] Эпизод #' + index + ':', {
          title: title,
          playcount: playcount,
        });

        if (playcount > 0) {
          maxIndex = index;
          lastWatched = {
            item: item,
            index: index,
            title: title,
            url: url,
            playcount: playcount,
          };
        }
      }
    } catch (e) {
      console.log('[RESUME] Ошибка анализа элемента #' + index + ':', e);
      print('[RESUME] Ошибка анализа элемента #' + index + ': ' + e);
    }
  });
  
  if (!lastWatched) {
    return null;
  }
  
  // Проверяем есть ли следующий эпизод
  var nextIndex = maxIndex + 1;
  var hasNext = false;
  var nextEpisode = null;
  
  if (nextIndex < items.length) {
    try {
      var nextItem = items[nextIndex];
      var nextType = nextItem.root.type ? nextItem.root.type.valueOf() : null;
      
      if (nextType === 'video') {
        hasNext = true;
        nextEpisode = {
          item: nextItem,
          index: nextIndex,
          title: nextItem.root.metadata.title ? nextItem.root.metadata.title.valueOf() : 'Без названия',
          url: nextItem.root.url ? nextItem.root.url.valueOf() : ''
        };
        
        console.log('[RESUME] Найден следующий эпизод #' + nextIndex + ':', nextEpisode.title);
        print('[RESUME] Найден следующий эпизод #' + nextIndex + ': ' + nextEpisode.title);
      }
    } catch (e) {
      console.log('[RESUME] Ошибка проверки следующего эпизода:', e);
      print('[RESUME] Ошибка проверки следующего эпизода: ' + e);
    }
  }
  
  lastWatched.hasNext = hasNext;
  lastWatched.nextEpisode = nextEpisode;
  
  return lastWatched;
}

/**
 * Показывает popup с вопросом о продолжении
 * @param {Page} page - Объект страницы
 * @param {Object} lastWatched - Последний просмотренный эпизод
 * @param {Object} targetEpisode - Целевой эпизод для воспроизведения
 * @param {boolean} findNext - Был ли найден следующий эпизод
 */
function showResumePopup(page, lastWatched, targetEpisode, findNext) {
  console.log('[RESUME] Показываем popup');
  print('[RESUME] Показываем popup');
  
  // Формируем текст сообщения
  var message;
  if (findNext && lastWatched.hasNext) {
    message = 'Вы смотрели: "' + lastWatched.title + '"\n\n' +
              'Продолжить со следующего эпизода?\n' +
              '"' + targetEpisode.title + '"';
  } else {
    message = 'Продолжить просмотр?\n\n' +
              '"' + targetEpisode.title + '"';
    

  }
  
  // // Показываем popup с кнопками
  // popup.queryOk(message, function(result) {
  //   if (result) {
  //     console.log('[RESUME] Пользователь выбрал: Продолжить');
  //     print('[RESUME] Пользователь выбрал: Продолжить');
      
  //     // Переходим на целевой эпизод
  //     page.redirect(targetEpisode.url);
  //   } else {
  //     console.log('[RESUME] Пользователь выбрал: Остаться на странице');
  //     print('[RESUME] Пользователь выбрал: Остаться на странице');
  //   }
  // }, {
  //   cancel: 'Нет, остаться здесь',
  //   ok: 'Да, продолжить'
  // });
  
  if (popup.message(message, true, true)) {
    print('[RESUME] Пользователь выбрал: Продолжить');
    
    // Переходим на целевой эпизод
    page.redirect(targetEpisode.url);
  } else {
    print('[RESUME] Пользователь выбрал: Остаться на странице');
  }
  
}

/**
 * Упрощенная версия - просто ищет и возвращает информацию
 * без показа popup (для использования в других местах)
 * @param {Array<Item>} items - Массив элементов
 * @returns {Object|null} Информация о последнем просмотренном
 */
function getLastWatchedInfo(items) {
  return findLastWatchedEpisode(items);
}

/**
 * Устанавливает фокус на последний просмотренный эпизод
 * (или следующий после него)
 * @param {Array<Item>} items - Массив элементов
 * @param {boolean} focusNext - Фокусировать следующий эпизод
 * @returns {boolean} true если фокус установлен
 */
function focusLastWatched(items, focusNext) {
  var result = findLastWatchedEpisode(items);
  
  if (!result) {
    return false;
  }
  
  var targetItem = result.item;
  
  if (focusNext && result.hasNext && result.nextEpisode) {
    targetItem = result.nextEpisode.item;
    console.log('[RESUME] Устанавливаем фокус на следующий эпизод');
    print('[RESUME] Устанавливаем фокус на следующий эпизод');
  } else {
    console.log('[RESUME] Устанавливаем фокус на последний просмотренный');
    print('[RESUME] Устанавливаем фокус на последний просмотренный');
  }
  
  try {
    // Пробуем несколько методов установки фокуса
    targetItem.root.focusable = 1000.0;
    targetItem.root.focused = 1;
    
    setTimeout(function() {
      prop.select(targetItem.root);
    }, 100);
    
    setTimeout(function() {
      prop.sendEvent(targetItem.root.eventSink, 'focus', true);
    }, 200);
    
    console.log('[RESUME] Фокус установлен на:', result.title);
    print('[RESUME] Фокус установлен на: ' + result.title);
    
    return true;
  } catch (e) {
    console.log('[RESUME] Ошибка установки фокуса:', e);
    print('[RESUME] Ошибка установки фокуса: ' + e);
    return false;
  }
}

// Экспорт функций модуля
module.exports = {
  // Основная функция - поиск и показ popup
  findAndResumeLastWatched: findAndResumeLastWatched,
  
  // Вспомогательные функции
  getLastWatchedInfo: getLastWatchedInfo,
  focusLastWatched: focusLastWatched,
  
  // Алиасы для удобства
  find: findAndResumeLastWatched,
  info: getLastWatchedInfo,
  focus: focusLastWatched
};

/**
 * ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ:
 * 
 * 1. Базовое использование (popup с вопросом):
 * 
 *    var resume = require('./lib/resume_playback');
 *    resume.find(page, page.getItems());
 * 
 * 
 * 2. С опциями:
 * 
 *    resume.find(page, page.getItems(), {
 *      autoResume: false,      // Показать popup (по умолчанию)
 *      findNext: true,          // Искать следующий эпизод (по умолчанию)
 *      delay: 2000              // Задержка 2 секунды
 *    });
 * 
 * 
 * 3. Автоматическое продолжение без popup:
 * 
 *    resume.find(page, page.getItems(), {
 *      autoResume: true         // Сразу перейти без вопроса
 *    });
 * 
 * 
 * 4. Только получить информацию (без действий):
 * 
 *    var info = resume.info(page.getItems());
 *    if (info) {
 *      console.log('Последний просмотренный:', info.title);
 *      console.log('Есть следующий:', info.hasNext);
 *    }
 * 
 * 
 * 5. Только установить фокус (без redirect):
 * 
 *    resume.focus(page.getItems(), true);  // true = на следующий эпизод
 *    resume.focus(page.getItems(), false); // false = на последний просмотренный
 */