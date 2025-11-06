/**
 * Minimal logging module for Duktape 1.8.0 (ES5.1)
 */

/**
 * Safe JSON stringify with circular reference handling
 */
function safeStringify(obj) {
    try {
      var seen = [];
      return JSON.stringify(obj, function(key, val) {
        if (val != null && typeof val === 'object') {
          if (seen.indexOf(val) !== -1) {
            return '[Circular]';
          }
          seen.push(val);
        }
        return val;
      }, 2);
    } catch (e) {
      return '[Unserializable: ' + e.message + ']';
    }
  }
  
  /**
   * Get caller location from stack trace
   */
  function getCallerLocation() {
    try {
      var stack = new Error().stack;
      if (typeof stack !== 'string') return '';
      
      var lines = stack.split('\n');
      if (lines.length > 4) {
        var line = lines[4].trim();
        var match = line.match(/\(([^)]+)\)/);
        
        if (match) {
          var location = match[1].replace(/^file:\/\//, '');
          var parts = location.split(':');
          
          if (parts.length >= 2) {
            var filename = parts[0].split('/').pop();
            return filename + ':' + parts[1] + ' - ';
          }
        }
      }
    } catch (e) {
      // Fail silently
    }
    return '';
  }
  
  /**
   * Format data for output
   */
  function formatData(data) {
    if (data === null) return 'null';
    if (data === undefined) return 'undefined';
    
    var type = typeof data;
    
    if (type === 'string' || type === 'number' || type === 'boolean') {
      return String(data);
    }
    
    if (type === 'function') {
      return '[Function]';
    }
    
    if (data instanceof Error) {
      return 'Error: ' + data.message + (data.stack ? '\n' + data.stack : '');
    }
    
    // Handle objects (including arrays)
    return safeStringify(data);
  }
  
  /**
   * Core logging function
   */
  function logWithLevel(data, logFn) {
    var location = getCallerLocation();
    var message = location + formatData(data);
    logFn(message);
  }
  
  /**
   * Trace function
   */
  function trace(logFn) {
    try {
      var stack = new Error().stack;
      if (stack) {
        var lines = stack.split('\n').slice(3); // Skip trace internals
        logFn(getCallerLocation() + 'Stack trace:\n' + lines.join('\n'));
      }
    } catch (e) {
      logFn('Stack trace unavailable');
    }
  }
  
  // Export logging functions
  exports.d = function(data) {
    logWithLevel(data, console.log);
  };
  
  exports.e = function(data) {
    logWithLevel(data, console.error);
  };
  
  exports.p = function(data) {
    var logFn = (typeof print === 'function') ? print : console.log;
    logWithLevel(data, logFn);
  };
  
  // Trace functions
  exports.d.trace = function() {
    trace(console.log);
  };
  
  exports.e.trace = function() {
    trace(console.error);
  };
  
  exports.p.trace = function() {
    var logFn = (typeof print === 'function') ? print : console.log;
    trace(logFn);
  };
  
  // Utility export
  exports.safeStringify = safeStringify;