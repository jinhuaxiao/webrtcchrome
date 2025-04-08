// 监听来自popup或background的消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'updateTimezone') {
    console.log('[WebRTC Control] 收到时区更新请求:', message.timezone);
    
    // 向页面注入时区设置
    injectTimezoneToPage(message.timezone);
    
    // 告知页面刷新时区欺骗设置
    injectRefreshCommand();
    
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
    // 触发chrome.storage.onChanged事件以刷新时区设置
    document.dispatchEvent(new CustomEvent('webrtc-control-timezone-update'));
  `;
  document.documentElement.appendChild(script);
  script.remove();
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
        const targetTimezone = window.__WEBRTC_CONTROL_TIMEZONE__ || "auto";
        
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
  }, 300);
}

// 初始化时，从存储中获取当前时区设置并注入
chrome.storage.local.get(['timezone'], function(result) {
  if (result.timezone) {
    console.log('[WebRTC Control] 初始化时区设置:', result.timezone);
    injectTimezoneToPage(result.timezone);
  } else {
    // 确保默认时区是 America/Los_Angeles
    console.log('[WebRTC Control] 使用默认时区: America/Los_Angeles');
    injectTimezoneToPage('America/Los_Angeles');
    
    // 保存默认时区到存储
    chrome.storage.local.set({
      timezone: 'America/Los_Angeles'
    });
  }
}); 