(function() {
  try {
    console.log("[WebRTC Control] 开始初始化时区欺骗...");
    
    // 先尝试从window变量获取时区设置，如果没有，则使用默认值
    let TARGET_TIMEZONE = window.__WEBRTC_CONTROL_TIMEZONE__ || "America/Los_Angeles";
    console.log("[WebRTC Control] 初始时区设置:", TARGET_TIMEZONE);
    
    // 监听自定义事件，用于实时更新时区
    document.addEventListener('webrtc-control-timezone-update', function(event) {
      console.log("[WebRTC Control] 收到时区更新事件");
      const newTimezone = window.__WEBRTC_CONTROL_TIMEZONE__ || TARGET_TIMEZONE;
      console.log("[WebRTC Control] 收到新的时区设置:", newTimezone);
      if (newTimezone !== TARGET_TIMEZONE) {
        TARGET_TIMEZONE = newTimezone;
        console.log("[WebRTC Control] 使用新的时区设置:", TARGET_TIMEZONE);
        applyTimezoneSpoof(TARGET_TIMEZONE);
      } else {
        console.log("[WebRTC Control] 时区设置未变化，仍为:", TARGET_TIMEZONE);
      }
    });
    
    // 监听window变量变化
    Object.defineProperty(window, '__WEBRTC_CONTROL_TIMEZONE__', {
      get: function() {
        return TARGET_TIMEZONE;
      },
      set: function(newValue) {
        console.log("[WebRTC Control] 时区变量被设置为:", newValue);
        if (newValue !== TARGET_TIMEZONE) {
          TARGET_TIMEZONE = newValue;
          // 延迟执行时区更新，确保设置生效
          setTimeout(function() {
            console.log("[WebRTC Control] 应用新的时区设置:", TARGET_TIMEZONE);
            applyTimezoneSpoof(TARGET_TIMEZONE);
          }, 0);
        } else {
          console.log("[WebRTC Control] 时区变量值未变化，仍为:", TARGET_TIMEZONE);
        }
        return newValue;
      },
      configurable: true
    });
    
    // 注册全局变量以便调试和检测
    window.__WEBRTC_CONTROL_GET_TIMEZONE__ = function() {
      return {
        currentTimezone: TARGET_TIMEZONE,
        dateString: new Date().toString(),
        intlTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    };
    
    // 立刻触发一个自定义事件通知系统时区脚本已加载
    // 这样其他脚本可以检测到时区脚本已加载
    const loadEvent = new CustomEvent('webrtc-control-timezone-loaded', {
      detail: { timezone: TARGET_TIMEZONE }
    });
    document.dispatchEvent(loadEvent);
    console.log("[WebRTC Control] 已触发时区脚本加载事件");
    
    // 应用时区欺骗的主函数
    function applyTimezoneSpoof(timezone) {
      console.log("[WebRTC Control] 应用时区欺骗，目标时区:", timezone);
      
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
        if (timezone === "auto") {
          return DEFAULT_TZ;
        }
        
        // 如果指定了时区，则返回相应的时区信息
        if (TIMEZONE_MAP[timezone]) {
          return TIMEZONE_MAP[timezone];
        }
        
        // 处理未知时区，尝试自动匹配
        console.log("[WebRTC Control] 未知时区:", timezone, "使用默认时区代替");
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
    }
    
    // 立即应用默认时区设置
    applyTimezoneSpoof(TARGET_TIMEZONE);
    
  } catch (e) {
    console.error("[WebRTC Control] 时区欺骗初始化失败:", e);
  }
})(); 