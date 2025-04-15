var background = (function () {
  let tmp = {};
  /*  */
  chrome.runtime.onMessage.addListener(function (request) {
    for (let id in tmp) {
      if (tmp[id] && (typeof tmp[id] === "function")) {
        if (request.path === "background-to-page") {
          if (request.method === id) {
            tmp[id](request.data);
          }
        }
      }
    }
  });
  /*  */
  return {
    "receive": function (id, callback) {
      tmp[id] = callback;
    },
    "send": function (id, data) {
      chrome.runtime.sendMessage({
        "method": id, 
        "data": data,
        "path": "page-to-background"
      }, function () {
        return chrome.runtime.lastError;
      });
    }
  }
})();

var config = {
  "update": function (e) {
    if (e.state === "enabled") {
      const script = {};
      /*  */
      if (e.devices) {
        script.a = document.getElementById("webrtc-control-a");
        /*  */
        if (!script.a) {
          script.a = document.createElement("script");
          script.a.type = "text/javascript";
          script.a.setAttribute("id", "webrtc-control-a");
          script.a.onload = function () {script.a.remove()};
          script.a.src = chrome.runtime.getURL("data/content_script/page_context/media_devices.js");
          /*  */
          document.documentElement.appendChild(script.a);
        }
      }
      /*  */
      if (e.inject) {
        script.b = document.getElementById("webrtc-control-b");
        /*  */
        if (!script.b) {
          script.b = document.createElement("script");
          script.b.type = "text/javascript";
          script.b.setAttribute("id", "webrtc-control-b");
          script.b.onload = function () {script.b.remove()};
          script.b.src = chrome.runtime.getURL("data/content_script/page_context/support_detection.js");
          /*  */
          document.documentElement.appendChild(script.b);
        }
      }
      /*  */
      if (e.additional) {
        script.c = document.getElementById("webrtc-control-c");
        /*  */
        if (!script.c) {
          script.c = document.createElement("script");
          script.c.type = "text/javascript";
          script.c.setAttribute("id", "webrtc-control-c");
          script.c.onload = function () {script.c.remove()};
          script.c.src = chrome.runtime.getURL("data/content_script/page_context/additional_objects.js");
          /*  */
          document.documentElement.appendChild(script.c);
        }
      }
      /*  */
      if (e.timezoneSpoof) {
        script.d = document.getElementById("webrtc-control-d");
        /*  */
        if (!script.d) {
          // 首先获取时区并存储到本地存储
          const timezone = e.timezone || "America/Los_Angeles";
          chrome.storage.local.set({
            timezone: timezone
          }, function() {
            console.log('[WebRTC Control] 已保存时区设置到存储:', timezone);
          });
          
          // 注入时区设置到全局变量
          const tzScript = document.createElement("script");
          tzScript.textContent = `window.__WEBRTC_CONTROL_TIMEZONE__ = "${timezone}";`;
          document.documentElement.appendChild(tzScript);
          tzScript.remove();
          
          // 注入时区伪装脚本
          script.d = document.createElement("script");
          script.d.type = "text/javascript";
          script.d.setAttribute("id", "webrtc-control-d");
          script.d.onload = function () {script.d.remove()};
          script.d.src = chrome.runtime.getURL("data/content_script/page_context/timezone_spoof.js");
          /*  */
          document.documentElement.appendChild(script.d);
        } else if (e.timezone) {
          // 如果时区已更改，更新现有设置并保存到存储
          chrome.storage.local.set({
            timezone: e.timezone
          }, function() {
            console.log('[WebRTC Control] 已更新时区设置到存储:', e.timezone);
          });
          
          // 更新页面中的时区设置
          const updateScript = document.createElement("script");
          updateScript.textContent = `
            window.__WEBRTC_CONTROL_TIMEZONE__ = "${e.timezone}";
            // 触发自定义事件通知时区脚本更新
            document.dispatchEvent(new CustomEvent('webrtc-control-timezone-update'));
          `;
          document.documentElement.appendChild(updateScript);
          updateScript.remove();
        }
      }
    }
  }
};

// 获取存储的时区设置并应用 (核心初始化逻辑)
function loadAndApplyTimezoneSettings() {
  console.log('[WebRTC Control] (Inject) 开始加载时区设置...');
  
  chrome.storage.local.get(['timezone', 'timezoneSpoof'], function(result) {
    console.log('[WebRTC Control] (Inject) 从存储读取结果:', result);
    
    // 如果未设置timezoneSpoof，则默认设置为true
    const timezoneEnabled = result.timezoneSpoof !== undefined ? result.timezoneSpoof : true;
    
    if (timezoneEnabled) {
      const timezone = result.timezone || "auto"; // 确保有默认值
      console.log('[WebRTC Control] (Inject) 时区欺骗已启用，应用时区:', timezone);
      
      // 如果之前未设置，则设置默认值
      if (result.timezoneSpoof === undefined) {
        chrome.storage.local.set({
          timezoneSpoof: true,
          timezone: "auto"
        }, function() {
          console.log('[WebRTC Control] (Inject) 已设置默认时区配置');
        });
      }
      
      // *** 关键步骤: 先注入全局变量 ***
      const tzScript = document.createElement("script");
      tzScript.textContent = `
        window.__WEBRTC_CONTROL_TIMEZONE__ = "${timezone}";
        console.log("[WebRTC Control] (Inject) 页面时区变量已设置为:", window.__WEBRTC_CONTROL_TIMEZONE__);
      `;
      // 注入到 <head> 以尽早执行
      (document.head || document.documentElement).appendChild(tzScript);
      tzScript.remove();
      console.log('[WebRTC Control] (Inject) 全局时区变量注入完成.');
      
      // *** 然后确保时区欺骗脚本被注入 ***
      const scriptId = "webrtc-control-d";
      let existingScript = document.getElementById(scriptId);
      
      if (!existingScript) {
        console.log('[WebRTC Control] (Inject) 时区欺骗脚本不存在，注入新脚本...');
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.setAttribute("id", scriptId);
        script.onload = function() {
          console.log("[WebRTC Control] (Inject) 动态注入的时区欺骗脚本加载完成");
        };
        script.onerror = function() {
          console.error("[WebRTC Control] (Inject) 动态注入的时区欺骗脚本加载失败");
        };
        script.src = chrome.runtime.getURL("data/content_script/page_context/timezone_spoof.js");
        (document.head || document.documentElement).appendChild(script);
      } else {
        // 如果脚本已存在 (可能是由 manifest 注入的，虽然我们现在动态注入了)，
        // 确保它能收到更新信号。之前的全局变量设置应该会被它读取。
        console.log('[WebRTC Control] (Inject) 时区欺骗脚本已存在，无需重复注入。');
        // 可以选择性地触发更新事件，以防万一脚本已加载但错过了初始值
        const updateScript = document.createElement("script");
        updateScript.textContent = `
          console.log('[WebRTC Control] (Inject) 触发更新事件给已存在的脚本');
          document.dispatchEvent(new CustomEvent('webrtc-control-timezone-update'));
        `;
        (document.head || document.documentElement).appendChild(updateScript);
        updateScript.remove();
      }
    } else {
      console.log('[WebRTC Control] (Inject) 时区欺骗已禁用，不注入时区脚本。');
      // 如果禁用了，确保移除可能存在的旧脚本
      const scriptId = "webrtc-control-d";
      let existingScript = document.getElementById(scriptId);
      if (existingScript) {
        console.log('[WebRTC Control] (Inject) 移除已存在的时区欺骗脚本，因为功能已禁用。');
        existingScript.remove();
      }
    }
  });
}

// 监听来自popup的时区更新消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'updateTimezone' && request.timezone) {
    console.log('[WebRTC Control] (Inject) 收到时区更新请求:', request.timezone);
    
    // 1. 保存到存储 (popup 已经做了，这里可以省略或作为确认)
    // chrome.storage.local.set({ timezone: request.timezone }, ...);

    // 2. 移除旧的时区欺骗脚本
    const oldScript = document.getElementById("webrtc-control-d");
    if (oldScript) {
      console.log('[WebRTC Control] (Inject) 更新: 移除旧的时区欺骗脚本');
      oldScript.remove();
    }
      
    // 3. 注入新的时区设置到全局变量
    const tzScript = document.createElement("script");
    tzScript.textContent = `
      window.__WEBRTC_CONTROL_TIMEZONE__ = "${request.timezone}";
      console.log("[WebRTC Control] (Inject) 更新: 页面时区变量已设置为:", window.__WEBRTC_CONTROL_TIMEZONE__);
    `;
    (document.head || document.documentElement).appendChild(tzScript);
    tzScript.remove();
      
    // 4. 重新注入新的时区欺骗脚本
    console.log('[WebRTC Control] (Inject) 更新: 重新注入时区欺骗脚本');
    const newScript = document.createElement("script");
    newScript.type = "text/javascript";
    newScript.setAttribute("id", "webrtc-control-d");
    newScript.onload = function () {
      console.log("[WebRTC Control] (Inject) 更新: 时区欺骗脚本重新加载完成");
      if (sendResponse) {
        // 延迟一点发送响应，确保脚本可能已经执行
        setTimeout(() => sendResponse({success: true, timezone: request.timezone}), 100);
      }
    };
    newScript.onerror = function () {
      console.error("[WebRTC Control] (Inject) 更新: 时区欺骗脚本重新加载失败");
      if (sendResponse) {
        sendResponse({success: false, message: "脚本加载失败"});
      }
    };
    newScript.src = chrome.runtime.getURL("data/content_script/page_context/timezone_spoof.js");
    (document.head || document.documentElement).appendChild(newScript);
    
    // 因为 onload 是异步的，我们需要返回 true 来保持 sendResponse 通道打开
    return true; 
    
  } else if (request.action === 'detectTimezone') {
    // 检测当前页面实际时区
    detectPageTimezone(function(result) {
      if (sendResponse) {
        sendResponse(result);
      }
    });
    return true; // 保持通道开放，等待异步响应
  }
});

// 在脚本初始化时立即尝试加载和应用时区设置
// 这是因为 inject.js 在 document_start 运行，需要尽早执行
loadAndApplyTimezoneSettings();

// 监听来自 background 的存储变化或其他配置更新
background.receive("storage", function(data) {
  console.log("[WebRTC Control] (Inject) 收到 background 的 storage 更新:", data);
  // 这里可以根据需要决定是否基于 background 的通知重新应用设置
  // 例如，如果 'state' 或 'timezoneSpoof' 发生变化
  // config.update(data);
  // 或者更精确地只处理时区相关的变化
  if (data.timezoneSpoof !== undefined || data.timezone !== undefined) {
    console.log("[WebRTC Control] (Inject) 检测到存储变化，重新加载时区设置");
    loadAndApplyTimezoneSettings();
  }
});

// 检测页面实际时区
function detectPageTimezone(callback) {
  // 创建一个临时ID，用于接收检测结果
  const detectionId = 'timezone-detection-' + Date.now();
  
  // 在页面中注入检测脚本
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      try {
        // 检测当前页面的实际时区
        const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const dateString = new Date().toString();
        const gmtOffset = dateString.match(/GMT([+-]\\d{4})/);
        const tzNameMatch = dateString.match(/\\(([^)]+)\\)/);
        
        // 目标时区 (从window变量获取)
        const targetTimezone = window.__WEBRTC_CONTROL_TIMEZONE__ || "America/Los_Angeles";
        
        // 将结果保存到一个临时元素
        const result = {
          success: true,
          currentTimezone: currentTimezone,
          gmtOffset: gmtOffset ? gmtOffset[1] : "未知",
          tzName: tzNameMatch ? tzNameMatch[1] : "未知",
          targetTimezone: targetTimezone,
          dateString: dateString
        };
        
        // 判断是否修改成功
        let success = false;
        
        // 如果目标时区是auto，默认指向Los Angeles
        const effectiveTarget = targetTimezone === "auto" ? "America/Los_Angeles" : targetTimezone;
        
        // 检查是否成功修改
        if (currentTimezone === effectiveTarget) {
          success = true;
        }
        // 也检查时区名称中是否包含目标时区的一部分（如Pacific、Eastern等）
        else if (tzNameMatch) {
          const tzName = tzNameMatch[1].toLowerCase();
          if (effectiveTarget.includes("los_angeles") && (tzName.includes("pacific") || tzName.includes("pdt") || tzName.includes("pst"))) {
            success = true;
          } else if (effectiveTarget.includes("new_york") && (tzName.includes("eastern") || tzName.includes("edt") || tzName.includes("est"))) {
            success = true;
          } else if (effectiveTarget.includes("london") && (tzName.includes("british") || tzName.includes("bst") || tzName.includes("gmt"))) {
            success = true;
          } else if (effectiveTarget.includes("berlin") && (tzName.includes("central european") || tzName.includes("cet") || tzName.includes("cest"))) {
            success = true;
          } else if (effectiveTarget.includes("tokyo") && (tzName.includes("japan") || tzName.includes("jst"))) {
            success = true;
          } else if (effectiveTarget.includes("shanghai") && (tzName.includes("china") || tzName.includes("cst"))) {
            success = true;
          } else if (effectiveTarget.includes("sydney") && (tzName.includes("austral") || tzName.includes("aest"))) {
            success = true;
          }
        }
        
        result.success = success;
        
        // 将结果保存到一个临时元素
        const resultElement = document.createElement('div');
        resultElement.id = '${detectionId}';
        resultElement.style.display = 'none';
        resultElement.setAttribute('data-result', JSON.stringify(result));
        document.body.appendChild(resultElement);
      } catch (e) {
        // 出错时保存错误信息
        const errorResult = {
          success: false,
          message: e.message,
          currentTimezone: "检测失败"
        };
        
        const resultElement = document.createElement('div');
        resultElement.id = '${detectionId}';
        resultElement.style.display = 'none';
        resultElement.setAttribute('data-result', JSON.stringify(errorResult));
        document.body.appendChild(resultElement);
      }
    })();
  `;
  document.documentElement.appendChild(script);
  script.remove();
  
  // 短暂延迟后获取检测结果
  setTimeout(function() {
    const resultElement = document.getElementById(detectionId);
    if (resultElement) {
      try {
        const resultData = JSON.parse(resultElement.getAttribute('data-result'));
        resultElement.remove();
        if (callback) {
          callback(resultData);
        }
      } catch (e) {
        console.error('[WebRTC Control] 解析时区检测结果失败:', e);
        if (callback) {
          callback({
            success: false,
            message: '解析检测结果失败',
            currentTimezone: '未知'
          });
        }
      }
    } else {
      if (callback) {
        callback({
          success: false,
          message: '无法获取检测结果',
          currentTimezone: '未知'
        });
      }
    }
  }, 500); // 增加延迟时间
}
