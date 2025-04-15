// 监听来自popup或background的消息
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'updateTimezone') {
    console.log('[WebRTC Control] 收到时区更新请求(timezone_listener):', message.timezone);
    
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
  console.log('[WebRTC Control] 注入时区到页面:', timezone);
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
  console.log('[WebRTC Control] 注入刷新命令');
  const script = document.createElement('script');
  script.textContent = `
    try {
      // 触发自定义事件以刷新时区设置
      document.dispatchEvent(new CustomEvent('webrtc-control-timezone-update'));
      console.log("[WebRTC Control] 已触发时区更新事件");
    } catch(e) {
      console.error("[WebRTC Control] 触发刷新事件失败:", e);
    }
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

// 强制重新注入时区欺骗脚本
function reInjectTimezoneSpoof(timezone) {
  console.log('[WebRTC Control] 重新注入时区欺骗脚本');
  
  // 先尝试移除旧脚本
  const oldScript = document.getElementById("webrtc-control-d");
  if (oldScript) {
    console.log('[WebRTC Control] 移除旧的时区欺骗脚本');
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
  console.log('[WebRTC Control] 开始检测页面时区');
  
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
        
        console.log("[WebRTC Control] 页面时区检测:", {
          currentTimezone: currentTimezone,
          dateString: dateString,
          targetTimezone: targetTimezone
        });
        
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
        console.log("[WebRTC Control] 时区检测结果:", success ? "成功" : "失败");
        
        // 将结果保存到一个临时元素
        const resultElement = document.createElement('div');
        resultElement.id = '${detectionId}';
        resultElement.style.display = 'none';
        resultElement.setAttribute('data-result', JSON.stringify(result));
        document.body.appendChild(resultElement);
      } catch (e) {
        // 出错时保存错误信息
        console.error("[WebRTC Control] 时区检测错误:", e);
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
        console.log('[WebRTC Control] 获取到时区检测结果:', resultData);
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
      console.error('[WebRTC Control] 未找到时区检测结果元素');
      if (callback) {
        callback({
          success: false,
          message: '无法获取检测结果',
          currentTimezone: '未知'
        });
      }
    }
  }, 1000); // 增加延迟时间，确保脚本有足够时间执行
}

// 初始化时，从存储中获取当前时区设置并注入
chrome.storage.local.get(['timezone', 'timezoneSpoof'], function(result) {
  // 如果未设置timezoneSpoof，默认为true
  const timezoneEnabled = result.timezoneSpoof !== undefined ? result.timezoneSpoof : true;
  
  // 首次加载默认设置
  if (result.timezoneSpoof === undefined) {
    chrome.storage.local.set({
      timezoneSpoof: true,
      timezone: result.timezone || "auto"
    }, function() {
      console.log('[WebRTC Control] 已设置默认时区欺骗状态为开启');
    });
  }
  
  // 只有在启用了时区欺骗时才注入时区设置
  if (timezoneEnabled) {
    // 确保默认时区是 auto 或已设置的值
    const timezone = result.timezone || "auto";
    console.log('[WebRTC Control] 初始化时区设置:', timezone);
    
    // 向页面注入时区设置
    injectTimezoneToPage(timezone);
    
    // 注入刷新命令
    injectRefreshCommand();
    
    // 强制重新注入时区欺骗脚本
    reInjectTimezoneSpoof(timezone);
    
    // 如果时区未保存，保存默认时区到存储
    if (!result.timezone) {
      chrome.storage.local.set({
        timezone: 'auto'
      });
    }
    
    // 在页面完全加载后，再次确认时区设置正确应用
    window.addEventListener('load', function() {
      setTimeout(function() {
        console.log('[WebRTC Control] 页面加载完成后确认时区设置');
        injectTimezoneToPage(timezone);
        injectRefreshCommand();
        
        // 检测时区是否已正确应用
        detectPageTimezone(function(result) {
          console.log('[WebRTC Control] 页面加载后时区检测结果:', result);
          if (!result.success) {
            console.log('[WebRTC Control] 时区设置未正确应用，尝试重新注入');
            reInjectTimezoneSpoof(timezone);
          }
        });
      }, 1000); // 延迟1秒执行，确保页面已完全加载
    });
  }
});

// 添加一个消息发送和接收测试函数，帮助诊断
function testMessagePassing() {
  console.log('[WebRTC Control] 测试消息传递系统...');
  
  // 向background脚本发送测试消息
  chrome.runtime.sendMessage({
    method: 'test-message',
    data: { message: 'Test from timezone_listener.js' },
    path: 'content-to-background'
  }, function(response) {
    console.log('[WebRTC Control] 收到background响应:', response || '无响应');
  });
}

// 在初始化后执行消息测试
setTimeout(testMessagePassing, 2000);

// 向页面抛出一个全局事件，允许页面内代码检查是否成功注入
const readyEvent = document.createElement('script');
readyEvent.textContent = `
  window.dispatchEvent(new CustomEvent('webrtc-control-ready', { 
    detail: { 
      timezone: window.__WEBRTC_CONTROL_TIMEZONE__ || 'unknown' 
    } 
  }));
  console.log("[WebRTC Control] 注入脚本就绪事件已触发");
`;
document.documentElement.appendChild(readyEvent);
readyEvent.remove(); 