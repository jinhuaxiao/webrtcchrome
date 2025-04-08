(function() {
  try {
    console.log("[WebRTC Control] 开始初始化时区欺骗...");
    
    // 立即保存目标时区，防止后续修改被干扰
    const TARGET_TIMEZONE = window.__WEBRTC_CONTROL_TIMEZONE__ || "auto";
    console.log("[WebRTC Control] 目标时区:", TARGET_TIMEZONE);
    
    // 时区映射 - 使用规范名称作为键
    const TIMEZONE_MAP = {
      "America/Los_Angeles": { 
        offset: 420,              // UTC-7 (PDT)
        name: "Pacific Daylight Time",
        abbr: "PDT",
        id: "America/Los_Angeles"
      },
      "America/New_York": { 
        offset: 240,              // UTC-4 (EDT)
        name: "Eastern Daylight Time",
        abbr: "EDT",
        id: "America/New_York"
      },
      "Europe/London": { 
        offset: 60,               // UTC+1 (BST)
        name: "British Summer Time",
        abbr: "BST",
        id: "Europe/London"
      },
      "Europe/Berlin": { 
        offset: -120,             // UTC+2 (CEST)
        name: "Central European Summer Time",
        abbr: "CEST",
        id: "Europe/Berlin"
      },
      "Asia/Tokyo": { 
        offset: -540,             // UTC+9 (JST)
        name: "Japan Standard Time",
        abbr: "JST",
        id: "Asia/Tokyo"
      },
      "Asia/Shanghai": { 
        offset: -480,             // UTC+8 (CST)
        name: "China Standard Time",
        abbr: "CST", 
        id: "Asia/Shanghai"
      },
      "Australia/Sydney": { 
        offset: -600,             // UTC+10 (AEST)
        name: "Australian Eastern Standard Time",
        abbr: "AEST",
        id: "Australia/Sydney"
      }
    };
    
    // 自动模式预设为Los Angeles时区(与大多数浏览器指纹保护一致)
    const DEFAULT_TZ = TIMEZONE_MAP["America/Los_Angeles"];
    
    // 获取当前要模拟的时区信息
    function getTargetTimezoneInfo() {
      // 如果是自动模式，则使用我们定义的默认时区
      if (TARGET_TIMEZONE === "auto") {
        return DEFAULT_TZ;
      }
      
      // 如果指定了时区，则返回相应的时区信息
      if (TIMEZONE_MAP[TARGET_TIMEZONE]) {
        return TIMEZONE_MAP[TARGET_TIMEZONE];
      }
      
      // 处理未知时区，尝试自动匹配
      console.log("[WebRTC Control] 未知时区:", TARGET_TIMEZONE, "使用默认时区代替");
      return DEFAULT_TZ;
    }
    
    const TARGET_TZ_INFO = getTargetTimezoneInfo();
    console.log("[WebRTC Control] 使用时区信息:", TARGET_TZ_INFO);
    
    // 保存原始函数引用
    const _Date = window.Date;
    const _DatePrototype = _Date.prototype;
    const _DateToString = _DatePrototype.toString;
    const _DateGetTime = _DatePrototype.getTime;
    const _DateGetTimezoneOffset = _DatePrototype.getTimezoneOffset;
    const _DateToLocaleString = _DatePrototype.toLocaleString;
    const _DateToTimeString = _DatePrototype.toTimeString;
    const _DateToLocaleDateString = _DatePrototype.toLocaleDateString;
    const _DateToLocaleTimeString = _DatePrototype.toLocaleTimeString;
    const _DateToUTCString = _DatePrototype.toUTCString;
    const _DateToGMTString = _DatePrototype.toGMTString;
    const _DateToISOString = _DatePrototype.toISOString;
    const _DateToJSON = _DatePrototype.toJSON;
    const _DateToDateString = _DatePrototype.toDateString;
    
    // 保存 Intl 原始引用
    const _Intl = window.Intl;
    const _IntlDateTimeFormat = _Intl && _Intl.DateTimeFormat;
    const _IntlDateTimeFormatPrototype = _IntlDateTimeFormat && _IntlDateTimeFormat.prototype;
    const _IntlDateTimeFormatResolvedOptions = _IntlDateTimeFormatPrototype && _IntlDateTimeFormatPrototype.resolvedOptions;
    
    // 使用更安全的方式修改Date的原型方法，而不是替换整个Date构造函数
    // 这样可以避免"this is not a Date object"错误
    console.log("[WebRTC Control] 开始修改Date原型方法...");
    
    // 修改getTimezoneOffset方法
    try {
      const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
      Date.prototype.getTimezoneOffset = function() {
        try {
          return TARGET_TZ_INFO.offset;
        } catch (e) {
          console.error("[WebRTC Control] getTimezoneOffset 错误:", e);
          return originalGetTimezoneOffset.apply(this, arguments);
        }
      };
    } catch (e) {
      console.error("[WebRTC Control] 修改getTimezoneOffset失败:", e);
    }
    
    // 修改toString方法
    try {
      const originalToString = Date.prototype.toString;
      Date.prototype.toString = function() {
        try {
          const originalString = originalToString.call(this);
          
          // 替换GMT部分
          let result = originalString;
          const gmtMatch = result.match(/GMT[+-]\d{4}/);
          if (gmtMatch) {
            const offset = TARGET_TZ_INFO.offset;
            const offsetHours = Math.floor(Math.abs(offset) / 60);
            const offsetMinutes = Math.abs(offset) % 60;
            const offsetSign = offset > 0 ? "-" : "+";
            const offsetString = `${offsetHours.toString().padStart(2, '0')}${offsetMinutes.toString().padStart(2, '0')}`;
            result = result.replace(gmtMatch[0], `GMT${offsetSign}${offsetString}`);
          }
          
          // 替换时区名称部分
          const tzNameMatch = result.match(/\([^)]+\)/);
          if (tzNameMatch) {
            result = result.replace(tzNameMatch[0], `(${TARGET_TZ_INFO.name})`);
          }
          
          return result;
        } catch (e) {
          console.error("[WebRTC Control] toString 错误:", e);
          return originalToString.call(this);
        }
      };
    } catch (e) {
      console.error("[WebRTC Control] 修改toString失败:", e);
    }
    
    // 修改toTimeString方法
    try {
      const originalToTimeString = Date.prototype.toTimeString;
      Date.prototype.toTimeString = function() {
        try {
          const originalString = originalToTimeString.call(this);
          
          // 替换GMT部分
          let result = originalString;
          const gmtMatch = result.match(/GMT[+-]\d{4}/);
          if (gmtMatch) {
            const offset = TARGET_TZ_INFO.offset;
            const offsetHours = Math.floor(Math.abs(offset) / 60);
            const offsetMinutes = Math.abs(offset) % 60;
            const offsetSign = offset > 0 ? "-" : "+";
            const offsetString = `${offsetHours.toString().padStart(2, '0')}${offsetMinutes.toString().padStart(2, '0')}`;
            result = result.replace(gmtMatch[0], `GMT${offsetSign}${offsetString}`);
          }
          
          // 替换时区名称部分
          const tzNameMatch = result.match(/\([^)]+\)/);
          if (tzNameMatch) {
            result = result.replace(tzNameMatch[0], `(${TARGET_TZ_INFO.name})`);
          }
          
          return result;
        } catch (e) {
          console.error("[WebRTC Control] toTimeString 错误:", e);
          return originalToTimeString.call(this);
        }
      };
    } catch (e) {
      console.error("[WebRTC Control] 修改toTimeString失败:", e);
    }
    
    // 修改本地化方法
    function patchLocaleMethod(methodName, originalMethod) {
      try {
        Date.prototype[methodName] = function() {
          try {
            const args = Array.from(arguments);
            // 确保不覆盖现有的options
            const options = args.length > 1 && typeof args[1] === 'object' ? 
              Object.assign({}, args[1], { timeZone: TARGET_TZ_INFO.id }) : 
              { timeZone: TARGET_TZ_INFO.id };
              
            // 如果只有第一个参数，添加第二个参数
            if (args.length <= 1) {
              args.push(options);
            } else {
              args[1] = options;
            }
            
            return originalMethod.apply(this, args);
          } catch (e) {
            console.error(`[WebRTC Control] ${methodName} 错误:`, e);
            return originalMethod.apply(this, arguments);
          }
        };
      } catch (e) {
        console.error(`[WebRTC Control] 修改${methodName}失败:`, e);
      }
    }
    
    patchLocaleMethod('toLocaleString', _DateToLocaleString);
    patchLocaleMethod('toLocaleDateString', _DateToLocaleDateString);
    patchLocaleMethod('toLocaleTimeString', _DateToLocaleTimeString);
    
    // 修改 Intl.DateTimeFormat
    if (_Intl && _IntlDateTimeFormat) {
      console.log("[WebRTC Control] 开始修改 Intl.DateTimeFormat...");
      
      try {
        const originalDateTimeFormat = _Intl.DateTimeFormat;
        
        _Intl.DateTimeFormat = function() {
          let args = Array.from(arguments);
          
          // 修改或添加 timeZone 选项
          if (args.length > 0) {
            if (typeof args[0] === 'object') {
              args[0] = Object.assign({}, args[0], { timeZone: TARGET_TZ_INFO.id });
            } else if (args.length > 1 && typeof args[1] === 'object') {
              args[1] = Object.assign({}, args[1], { timeZone: TARGET_TZ_INFO.id });
            } else {
              args.push({ timeZone: TARGET_TZ_INFO.id });
            }
          } else {
            args = [{ timeZone: TARGET_TZ_INFO.id }];
          }
          
          return new originalDateTimeFormat(...args);
        };
        
        // 保留原型链关系
        _Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;
        
        // 复制静态属性
        Object.getOwnPropertyNames(originalDateTimeFormat).forEach(prop => {
          if (prop !== 'prototype' && prop !== 'length' && prop !== 'name') {
            _Intl.DateTimeFormat[prop] = originalDateTimeFormat[prop];
          }
        });
        
        // 修改 resolvedOptions 方法
        if (_IntlDateTimeFormatResolvedOptions) {
          const originalResolvedOptions = _IntlDateTimeFormatResolvedOptions;
          _IntlDateTimeFormatPrototype.resolvedOptions = function() {
            const result = originalResolvedOptions.call(this);
            if (result && typeof result === 'object') {
              result.timeZone = TARGET_TZ_INFO.id;
            }
            return result;
          };
        }
        
        console.log("[WebRTC Control] Intl.DateTimeFormat 已修改");
      } catch (e) {
        console.error("[WebRTC Control] 修改 Intl.DateTimeFormat 失败:", e);
      }
    }
    
    // 测试欺骗结果
    console.log("[WebRTC Control] 时区欺骗测试结果:");
    console.log("  Date.toString():", new Date().toString());
    console.log("  Date.toTimeString():", new Date().toTimeString());
    console.log("  Date.getTimezoneOffset():", new Date().getTimezoneOffset());
    
    if (_Intl && _Intl.DateTimeFormat) {
      try {
        console.log("  Intl.DateTimeFormat().resolvedOptions().timeZone:", new Intl.DateTimeFormat().resolvedOptions().timeZone);
      } catch (e) {
        console.error("  Intl.DateTimeFormat 测试失败:", e);
      }
    }
    
    console.log("[WebRTC Control] 时区欺骗初始化完成，目标时区:", TARGET_TZ_INFO.id);
  } catch (e) {
    console.error("[WebRTC Control] 时区欺骗初始化失败:", e);
  }
})(); 