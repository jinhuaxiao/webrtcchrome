// 监听来自popup或background的消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'updateTimezone') {
    console.log('[WebRTC Control] 收到时区更新请求:', message.timezone);
    
    // 向页面注入时区设置
    injectTimezoneToPage(message.timezone);
    
    // 告知页面刷新时区欺骗设置
    injectRefreshCommand();
    
    // 强制重新应用时区欺骗脚本
    reInjectTimezoneSpoof(message.timezone);
    
    // 保存到本地存储，以便其他标签页使用
    chrome.storage.local.set({
      timezone: message.timezone
    }, function() {
      console.log('[WebRTC Control] 已保存时区设置到存储:', message.timezone);
    });
    
    // 响应成功消息
    if (sendResponse) {
      sendResponse({success: true});
    }
  } else if (message.action === 'detectTimezone') {
    // 检测当前页面实际时区
    detectPageTimezone(function(result) {
      if (sendResponse) {
        sendResponse(result);
      }
    });
    return true; // 保持通道开放，等待异步响应
  }
});

// 向页面注入时区设置
function injectTimezoneToPage(timezone) {
  const script = document.createElement('script');
  script.textContent = `
    window.__WEBRTC_CONTROL_TIMEZONE__ = "${timezone}";
    console.log("[WebRTC Control] 页面时区已更新为:", "${timezone}");
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

// 注入刷新命令，让时区欺骗脚本重新应用设置
function injectRefreshCommand() {
  const script = document.createElement('script');
  script.textContent = `
    try {
      // 触发自定义事件以刷新时区设置
      document.dispatchEvent(new CustomEvent('webrtc-control-timezone-update'));
    } catch(e) {
      console.error("[WebRTC Control] 触发刷新事件失败:", e);
    }
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

// 强制重新注入时区欺骗脚本
function reInjectTimezoneSpoof(timezone) {
  // 先尝试移除旧脚本
  const oldScript = document.getElementById("webrtc-control-d");
  if (oldScript) {
    oldScript.remove();
  }
  
  // 再注入新脚本
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.setAttribute("id", "webrtc-control-d");
  script.onload = function () {
    console.log("[WebRTC Control] 时区欺骗脚本重新加载完成");
  };
  script.src = chrome.runtime.getURL("data/content_script/page_context/timezone_spoof.js");
  document.documentElement.appendChild(script);
}

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

// 初始化时，从存储中获取当前时区设置并注入
chrome.storage.local.get(['timezone', 'timezoneSpoof'], function(result) {
  // 只有在启用了时区欺骗时才注入时区设置
  if (result.timezoneSpoof) {
    // 确保默认时区是 America/Los_Angeles
    const timezone = result.timezone || "America/Los_Angeles";
    console.log('[WebRTC Control] 初始化时区设置:', timezone);
    
    // 向页面注入时区设置
    injectTimezoneToPage(timezone);
    
    // 如果时区未保存，保存默认时区到存储
    if (!result.timezone) {
      chrome.storage.local.set({
        timezone: 'America/Los_Angeles'
      });
    }
  }
}); 