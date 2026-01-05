# Resume Module - Модуль возобновления просмотра

## Описание

Модуль для автоматического возобновления просмотра видеоконтента в Movian. Система отслеживает последний просмотренный эпизод и предлагает продолжить со следующего.

## Структура модуля

```
utils/resume/
├── README.md           # Этот файл
├── index.js            # Главный экспорт модуля
├── resume.js           # Основная логика возобновления
├── navigation.js       # Модуль навигации через eventSink
├── config.js           # Конфигурация по умолчанию
└── settings.js         # Интеграция с Movian Settings API
```

## Быстрый старт

### 1. Импорт модуля

```javascript
// Вариант 1: Импорт всего модуля (через index.js)
var resumeModule = require('./utils/resume/index');
var resume = resumeModule.resume;
var resumeConfig = resumeModule.config;
var resumeSettings = resumeModule.settings;

// Вариант 2: Импорт отдельных компонентов (рекомендуется)
var resume = require('./utils/resume/resume');
var resumeConfig = require('./utils/resume/config');
var resumeSettings = require('./utils/resume/settings');
```

**Важно:** В Movian нужно явно указывать имя файла. Автоматический поиск `index.js` не поддерживается!

### 2. Использование в коде

```javascript
// При отображении списка эпизодов
if (resumeConfig.ENABLED) {
    resume.find(page, page.getItems(), {
        autoResume: resumeConfig.AUTO_RESUME,
        findNext: resumeConfig.FIND_NEXT_EPISODE,
        delay: resumeConfig.DELAY
    });
}
```

### 3. Интеграция с UI настройками

```javascript
// В HDRezka.js или другом главном файле
var resumeSettings = require('./utils/resume/settings');

settings.createBool('resumeEnabled', 'Включить возобновление просмотра', 
    resumeSettings.getSettings().enabled, function(v) {
        resumeSettings.updateSetting('enabled', v);
    }
);
```

## Компоненты модуля

### resume.js
Основной модуль возобновления просмотра.

**Функция:**
```javascript
resume.find(page, items, options)
```

**Параметры:**
- `page` - объект страницы Movian
- `items` - массив элементов страницы (из `page.getItems()`)
- `options` - объект с настройками:
  - `autoResume` (boolean) - автоматически открывать без диалога
  - `findNext` (boolean) - искать следующий эпизод
  - `delay` (number) - задержка перед показом диалога (мс)

**Пример:**
```javascript
var resume = require('./utils/resume/resume');

resume.find(page, page.getItems(), {
    autoResume: false,
    findNext: true,
    delay: 1500
});
```

### navigation.js
Модуль для навигации через Movian eventSink.

**Функции:**
- `getNavigatorEventSink()` - получить navigator eventSink
- `openUrl(url, options)` - открыть URL

**Пример:**
```javascript
var nav = require('./utils/resume/navigation');

nav.openUrl('hdrezka:play:episode123', {
    view: 'video'
});
```

### config.js
Конфигурация по умолчанию.

**Параметры:**
```javascript
{
    ENABLED: true,           // Включить функционал
    AUTO_RESUME: false,      // Автоматическое возобновление
    FIND_NEXT_EPISODE: true, // Искать следующий эпизод
    DELAY: 1500              // Задержка (мс)
}
```

**Использование:**
```javascript
var config = require('./utils/resume/config');

console.log(config.ENABLED);      // true
console.log(config.DELAY);        // 1500
```

### settings.js
Интеграция с Movian Settings API.

**Функции:**
- `getSettings()` - получить текущие настройки
- `updateSetting(setting, value)` - обновить настройку
- `resetSettings()` - сбросить на значения по умолчанию

**Пример:**
```javascript
var settings = require('./utils/resume/settings');

// Получить текущие настройки
var current = settings.getSettings();
console.log(current.enabled);     // true
console.log(current.delay);       // 1500

// Обновить настройку
settings.updateSetting('enabled', false);
settings.updateSetting('delay', 2000);

// Сбросить на значения по умолчанию
settings.resetSettings();
```

### index.js
Главный экспорт модуля для удобного импорта.

**Использование:**
```javascript
var resumeModule = require('./utils/resume/index');

// Доступны все компоненты
resumeModule.resume.find(...);
resumeModule.config.ENABLED;
resumeModule.settings.getSettings();
resumeModule.navigation.openUrl(...);
```

## Примеры использования

### Пример 1: Базовое использование

```javascript
var resume = require('./utils/resume/resume');
var config = require('./utils/resume/config');

function showEpisodes(page, episodes) {
    // Отображаем эпизоды
    episodes.forEach(function(ep) {
        page.appendItem(ep.url, 'video', {
            title: ep.title
        });
    });
    
    // Добавляем функционал возобновления
    if (config.ENABLED) {
        resume.find(page, page.getItems(), {
            autoResume: config.AUTO_RESUME,
            findNext: config.FIND_NEXT_EPISODE,
            delay: config.DELAY
        });
    }
}
```

### Пример 2: С условной активацией

```javascript
var resume = require('./utils/resume/resume');
var config = require('./utils/resume/config');

function showSeason(page, season, isLastSeason) {
    // Отображаем эпизоды
    season.episodes.forEach(function(ep) {
        page.appendItem(ep.url, 'video', {
            title: ep.title
        });
    });
    
    // Активируем resume только для последнего сезона
    if (config.ENABLED && isLastSeason) {
        resume.find(page, page.getItems(), {
            autoResume: config.AUTO_RESUME,
            findNext: config.FIND_NEXT_EPISODE,
            delay: config.DELAY
        });
    }
}
```

### Пример 3: С фильтрацией элементов

```javascript
var resume = require('./utils/resume/resume');
var config = require('./utils/resume/config');

function showContent(page, content) {
    // Отображаем разные типы контента
    content.forEach(function(item) {
        if (item.type === 'video') {
            page.appendItem(item.url, 'video', { title: item.title });
        } else if (item.type === 'separator') {
            page.appendPassiveItem('separator', null, { title: item.title });
        }
    });
    
    // Получаем только видео элементы
    var allItems = page.getItems();
    var videoItems = allItems.filter(function(item) {
        try {
            return item.root.type.valueOf() === 'video';
        } catch (e) {
            return false;
        }
    });
    
    // Применяем resume только к видео
    if (config.ENABLED && videoItems.length > 0) {
        resume.find(page, videoItems, {
            autoResume: config.AUTO_RESUME,
            findNext: config.FIND_NEXT_EPISODE,
            delay: config.DELAY
        });
    }
}
```

## Интеграция с UI

### Добавление настроек в плагин (простой способ)

```javascript
// В главном файле плагина (например, HDRezka.js)
var resumeSettings = require('./utils/resume/settings');

// Одна строка - создаёт все UI элементы!
resumeSettings.createUI(settings);
```

Это создаст все необходимые настройки:
- Включить/выключить возобновление
- Автоматическое возобновление без диалога
- Предлагать следующий эпизод
- Задержка перед диалогом (500-5000 мс)

### Расширенная интеграция (если нужна кастомизация)

```javascript
// В главном файле плагина
var resumeSettings = require('./utils/resume/settings');

// Создаём раздел настроек
settings.createDivider('Возобновление просмотра:');

// Включить/выключить
settings.createBool('resumeEnabled', 'Включить возобновление просмотра', 
    resumeSettings.getSettings().enabled, function(v) {
        resumeSettings.updateSetting('enabled', v);
    }
);

// Автоматическое возобновление
settings.createBool('autoResume', 'Автоматически возобновлять без диалога', 
    resumeSettings.getSettings().autoResume, function(v) {
        resumeSettings.updateSetting('autoResume', v);
    }
);

// Следующий эпизод
settings.createBool('findNext', 'Предлагать следующий эпизод', 
    resumeSettings.getSettings().findNext, function(v) {
        resumeSettings.updateSetting('findNext', v);
    }
);

// Задержка
settings.createInt('resumeDelay', 'Задержка перед диалогом (мс)', 
    resumeSettings.getSettings().delay, 500, 5000, 100, 'мс', function(v) {
        resumeSettings.updateSetting('delay', v);
    }
);
```

## Переиспользование в других плагинах

### Шаг 1: Копирование модуля

```bash
cp -r HDRezka/utils/resume YourPlugin/utils/resume
```

### Шаг 2: Использование в коде

```javascript
var resume = require('./utils/resume/resume');
var config = require('./utils/resume/config');

// Используйте как в примерах выше
```

## Зависимости

### Обязательные
- `native/popup` - встроенный модуль Movian (для диалогов)
- `movian/prop` - встроенный модуль Movian (для навигации)

### Опциональные
- `./utils/log` - модуль логирования (если используется)

## Совместимость

- **Movian версия:** 4.8+
- **Поддержка `page.getItems()`:** Да
- **Поддержка `playcount`:** Да

## Отладка

### Проверка конфигурации

```javascript
var config = require('./utils/resume/config');
console.log('Resume config:', config);
```

### Проверка настроек

```javascript
var settings = require('./utils/resume/settings');
console.log('Resume settings:', settings.getSettings());
```

### Сброс настроек

```javascript
var settings = require('./utils/resume/settings');
settings.resetSettings();
```

## Лицензия

Модуль основан на `simple_anilib/lib/resume.js` и распространяется под той же лицензией.

## История версий

- **v1.0** (2025-12-09) - Первая версия модуля
  - Основная логика возобновления
  - Интеграция с Movian Settings API
  - Поддержка конфигурации

## Поддержка

Если у вас возникли проблемы:

1. Проверьте совместимость версии Movian
2. Убедитесь, что все зависимости скопированы
3. Проверьте логи Movian на наличие ошибок
4. Создайте issue на GitHub с описанием проблемы

## Дополнительная информация

Для более подробной информации см.:
- `../../docs/RESUME_FEATURE.md` - техническая документация
- `../../docs/RESUME_USAGE.md` - руководство пользователя
- `../../docs/RESUME_REUSABILITY.md` - руководство по переиспользованию
- `../../docs/RESUME_UI_INTEGRATION.md` - интеграция с UI
