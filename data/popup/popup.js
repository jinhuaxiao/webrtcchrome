var background = (function () {
  let tmp = {};
  chrome.runtime.onMessage.addListener(function (request) {
    for (let id in tmp) {
      if (tmp[id] && (typeof tmp[id] === "function")) {
        if (request.path === "background-to-popup") {
          if (request.method === id) {
            tmp[id](request.data);
          }
        }
      }
    }
  });
  
  return {
    "receive": function (id, callback) {
      tmp[id] = callback;
    },
    "send": function (id, data) {
      chrome.runtime.sendMessage({
        "method": id, 
        "data": data,
        "path": "popup-to-background"
      }, function () {
        return chrome.runtime.lastError;
      });
    }
  }
})();

// 检测页面实际时区
function detectPageTimezone(callback) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'detectTimezone'
      }, function(response) {
        if (callback && response) {
          callback(response);
        } else {
          // 如果无法获取响应，显示错误
          updateTimezoneStatusUI({
            success: false,
            message: '无法检测页面时区',
            currentTimezone: '检测失败',
            targetTimezone: document.getElementById('timezone-select').value || 'auto'
          });
        }
      });
    } else {
      updateTimezoneStatusUI({
        success: false,
        message: '无法获取活动标签页',
        currentTimezone: '未知',
        targetTimezone: document.getElementById('timezone-select').value || 'auto'
      });
    }
  });
}

// 更新时区状态UI
function updateTimezoneStatusUI(data) {
  const statusText = document.getElementById('timezone-status-text');
  const currentTimezone = document.getElementById('current-timezone');
  const targetTimezone = document.getElementById('target-timezone');
  
  // 清除之前的状态类
  statusText.classList.remove('success', 'failed');
  
  if (data.success) {
    statusText.textContent = '成功';
    statusText.classList.add('success');
  } else {
    statusText.textContent = '失败: ' + (data.message || '未知错误');
    statusText.classList.add('failed');
  }
  
  currentTimezone.textContent = data.currentTimezone || '未知';
  targetTimezone.textContent = data.targetTimezone || 'auto';
}

// 更新状态显示
function updateStatusUI(state, webrtc, timezoneSpoof, timezone) {
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const toggleProtection = document.getElementById('toggle-protection');
  const protectionLevel = document.getElementById('protection-level');
  const toggleTimezone = document.getElementById('toggle-timezone');
  const timezoneContainer = document.getElementById('timezone-container');
  const timezoneSelect = document.getElementById('timezone-select');
  const targetTimezone = document.getElementById('target-timezone');
  
  if (state === "enabled") {
    statusIndicator.classList.add('on');
    statusIndicator.classList.remove('off');
    statusText.textContent = 'ON';
    toggleProtection.checked = true;
  } else {
    statusIndicator.classList.add('off');
    statusIndicator.classList.remove('on');
    statusText.textContent = 'OFF';
    toggleProtection.checked = false;
  }
  
  if (webrtc) {
    protectionLevel.value = webrtc;
  }
  
  // 更新时区状态
  if (timezoneSpoof !== undefined) {
    toggleTimezone.checked = timezoneSpoof;
    timezoneContainer.style.display = timezoneSpoof ? 'block' : 'none';
    
    // 显示时区检测结果区域
    document.getElementById('timezone-detection').style.display = timezoneSpoof ? 'block' : 'none';
  }
  
  // 确保默认时区是 America/Los_Angeles
  if (!timezone) {
    timezone = "America/Los_Angeles";
  }
  
  if (timezone) {
    timezoneSelect.value = timezone;
    targetTimezone.textContent = timezone;
  }
  
  // 如果时区欺骗已启用，检测当前页面时区
  if (timezoneSpoof) {
    setTimeout(function() {
      detectPageTimezone();
    }, 500);
  }
}

// 初始化UI
function initUI() {
  const toggleProtection = document.getElementById('toggle-protection');
  const protectionLevel = document.getElementById('protection-level');
  const testButton = document.getElementById('test-button');
  const settingsButton = document.getElementById('settings-button');
  const toggleTimezone = document.getElementById('toggle-timezone');
  const timezoneSelect = document.getElementById('timezone-select');
  const checkTimezoneButton = document.getElementById('check-timezone');
  
  // 开关控制
  toggleProtection.addEventListener('change', function() {
    const state = this.checked ? "enabled" : "disabled";
    background.send("toggle-state", { state });
  });
  
  // 保护级别控制
  protectionLevel.addEventListener('change', function() {
    background.send("webrtc", { webrtc: this.value });
  });
  
  // 时区伪装开关
  toggleTimezone.addEventListener('change', function() {
    const timezoneSpoof = this.checked;
    document.getElementById('timezone-container').style.display = timezoneSpoof ? 'block' : 'none';
    document.getElementById('timezone-detection').style.display = timezoneSpoof ? 'block' : 'none';
    
    background.send("timezone-toggle", { timezoneSpoof });
    
    // 直接保存到存储
    chrome.storage.local.set({
      timezoneSpoof: timezoneSpoof
    });
    
    // 如果启用了时区欺骗，立即检测时区
    if (timezoneSpoof) {
      detectPageTimezone();
    }
  });
  
  // 时区选择
  timezoneSelect.addEventListener('change', function() {
    const timezone = this.value;
    
    // 同时发送到后台服务和存储
    background.send("timezone-set", { timezone });
    
    // 关键修复：将选择的时区直接保存到本地存储
    chrome.storage.local.set({
      timezone: timezone
    }, function() {
      console.log('[WebRTC Control] 已保存时区设置到存储:', timezone);
      
      // 更新目标时区显示
      document.getElementById('target-timezone').textContent = timezone;
      
      // 通知当前标签页刷新时区设置
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateTimezone',
            timezone: timezone
          }, function() {
            // 短暂延迟后检测时区是否已更改
            setTimeout(function() {
              detectPageTimezone();
            }, 500);
          });
        }
      });
    });
  });
  
  // 时区检测按钮
  checkTimezoneButton.addEventListener('click', function() {
    // 更改状态文本为检测中
    document.getElementById('timezone-status-text').textContent = '检测中...';
    document.getElementById('timezone-status-text').classList.remove('success', 'failed');
    
    // 检测时区
    detectPageTimezone();
  });
  
  // 初始化加载时区设置
  chrome.storage.local.get(['timezone', 'timezoneSpoof'], function(result) {
    if (result.timezoneSpoof !== undefined) {
      toggleTimezone.checked = result.timezoneSpoof;
      timezoneContainer.style.display = result.timezoneSpoof ? 'block' : 'none';
      document.getElementById('timezone-detection').style.display = result.timezoneSpoof ? 'block' : 'none';
    }
    
    // 确保默认时区是 America/Los_Angeles
    let timezone = result.timezone || "America/Los_Angeles";
    
    if (timezone) {
      timezoneSelect.value = timezone;
      document.getElementById('target-timezone').textContent = timezone;
    }
    
    // 如果时区欺骗已启用，检测当前页面时区
    if (result.timezoneSpoof) {
      setTimeout(function() {
        detectPageTimezone();
      }, 500);
    }
  });
  
  // 测试按钮
  testButton.addEventListener('click', function() {
    background.send("test");
  });
  
  // 设置按钮
  settingsButton.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
  
  // 获取当前状态
  background.send("load");
}

// 接收后台数据
background.receive("storage", function(data) {
  updateStatusUI(data.state, data.webrtc, data.timezoneSpoof, data.timezone);
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initUI); 