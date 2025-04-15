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

// 检测页面实际时区，增加重试机制
function detectPageTimezone(callback, retryCount = 0) {
  const maxRetries = 2; // 最大重试次数
  
  console.log('[WebRTC Control] 检测页面时区，尝试次数:', retryCount + 1);
  
  // 更新状态文本
  const statusText = document.getElementById('timezone-status-text');
  statusText.textContent = `检测中...(${retryCount + 1}/${maxRetries + 1})`;
  statusText.classList.remove('success', 'failed');
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      // 通过background中转发送消息以确保接收
      background.send("timezone-detect", {
        tabId: tabs[0].id
      });
      
      // 直接发送消息到content script
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'detectTimezone'
      }, function(response) {
        // 处理chrome.runtime.lastError
        if (chrome.runtime.lastError) {
          console.error('[WebRTC Control] 发送消息错误:', chrome.runtime.lastError);
          
          // 如果没有响应且未达到最大重试次数，则重试
          if (retryCount < maxRetries) {
            setTimeout(function() {
              detectPageTimezone(callback, retryCount + 1);
            }, 1000);
            return;
          }
          
          // 达到最大重试次数，报告错误
          updateTimezoneStatusUI({
            success: false,
            message: `消息传递失败: ${chrome.runtime.lastError.message}`,
            currentTimezone: '检测失败',
            targetTimezone: document.getElementById('timezone-select').value || 'auto'
          });
          
          // 显示刷新按钮
          showRefreshButton();
          
          if (callback) callback({success: false});
          return;
        }
        
        if (response) {
          if (callback) {
            callback(response);
          }
          
          // 更新UI
          updateTimezoneStatusUI(response);
          
          // 如果检测失败，显示刷新按钮
          if (!response.success) {
            showRefreshButton();
          }
        } else {
          // 如果没有响应且未达到最大重试次数，则重试
          if (retryCount < maxRetries) {
            setTimeout(function() {
              detectPageTimezone(callback, retryCount + 1);
            }, 1000);
            return;
          }
          
          // 达到最大重试次数，报告错误
          updateTimezoneStatusUI({
            success: false,
            message: '无法接收时区检测响应',
            currentTimezone: '检测失败',
            targetTimezone: document.getElementById('timezone-select').value || 'auto'
          });
          
          // 显示刷新按钮
          showRefreshButton();
          
          if (callback) callback({success: false});
        }
      });
    } else {
      updateTimezoneStatusUI({
        success: false,
        message: '无法获取活动标签页',
        currentTimezone: '未知',
        targetTimezone: document.getElementById('timezone-select').value || 'auto'
      });
      
      if (callback) callback({success: false});
    }
  });
}

// 创建刷新页面按钮
function showRefreshButton() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs[0]) {
      const refreshBtn = document.createElement('button');
      refreshBtn.textContent = '刷新页面应用更改';
      refreshBtn.className = 'btn refresh-btn';
      refreshBtn.style.marginTop = '5px';
      refreshBtn.style.width = '100%';
      refreshBtn.style.fontSize = '12px';
      refreshBtn.style.padding = '5px 10px';
      refreshBtn.style.backgroundColor = '#4285f4';
      refreshBtn.style.color = 'white';
      refreshBtn.style.border = 'none';
      refreshBtn.style.borderRadius = '4px';
      refreshBtn.style.cursor = 'pointer';
      
      // 移除旧的刷新按钮(如果存在)
      const oldBtn = document.querySelector('.refresh-btn');
      if (oldBtn) oldBtn.remove();
      
      // 获取时区检测区域并添加按钮
      const detectionArea = document.getElementById('timezone-detection');
      detectionArea.appendChild(refreshBtn);
      
      // 点击刷新按钮时刷新页面
      refreshBtn.addEventListener('click', function() {
        chrome.tabs.reload(tabs[0].id);
        // 关闭popup
        window.close();
      });
      
      // 添加一个诊断按钮
      const diagBtn = document.createElement('button');
      diagBtn.textContent = '查看诊断信息';
      diagBtn.className = 'btn diag-btn';
      diagBtn.style.marginTop = '5px';
      diagBtn.style.width = '100%';
      diagBtn.style.fontSize = '12px';
      diagBtn.style.padding = '5px 10px';
      diagBtn.style.backgroundColor = '#9e9e9e';
      diagBtn.style.color = 'white';
      diagBtn.style.border = 'none';
      diagBtn.style.borderRadius = '4px';
      diagBtn.style.cursor = 'pointer';
      
      // 移除旧的诊断按钮(如果存在)
      const oldDiagBtn = document.querySelector('.diag-btn');
      if (oldDiagBtn) oldDiagBtn.remove();
      
      detectionArea.appendChild(diagBtn);
      
      // 点击诊断按钮时打开诊断信息
      diagBtn.addEventListener('click', function() {
        const diagInfo = document.createElement('div');
        diagInfo.className = 'diag-info';
        diagInfo.style.marginTop = '5px';
        diagInfo.style.padding = '10px';
        diagInfo.style.backgroundColor = '#f5f5f5';
        diagInfo.style.border = '1px solid #ddd';
        diagInfo.style.borderRadius = '4px';
        diagInfo.style.fontSize = '11px';
        diagInfo.style.fontFamily = 'monospace';
        diagInfo.style.whiteSpace = 'pre-wrap';
        diagInfo.style.overflowWrap = 'break-word';
        
        // 移除旧的诊断信息(如果存在)
        const oldDiagInfo = document.querySelector('.diag-info');
        if (oldDiagInfo) oldDiagInfo.remove();
        
        // 获取manifest信息和浏览器信息
        chrome.runtime.getManifest(function(manifest) {
          const info = `浏览器: ${navigator.userAgent}
插件版本: ${manifest.version}
URL: ${tabs[0].url}
Tab ID: ${tabs[0].id}
时区设置: ${document.getElementById('timezone-select').value}
时区开关: ${document.getElementById('toggle-timezone').checked ? '开启' : '关闭'}
时间: ${new Date().toString()}`;
          
          diagInfo.textContent = info;
          detectionArea.appendChild(diagInfo);
        });
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
  const detectIPTimezoneButton = document.getElementById('detect-ip-timezone');
  
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
    console.log('[WebRTC Control] 时区选择变更为:', timezone);
    
    // 步骤1: 立即更新UI以提供反馈
    document.getElementById('target-timezone').textContent = timezone;
    document.getElementById('timezone-status-text').textContent = '正在应用...';
    document.getElementById('timezone-status-text').classList.remove('success', 'failed');
    
    // 步骤2: 先保存到本地存储
    chrome.storage.local.set({
      timezone: timezone
    }, function() {
      console.log('[WebRTC Control] 时区已保存到存储:', timezone);
      
      // 步骤3: 发送到后台服务
      background.send("timezone-set", { timezone });
      
      // 步骤4: 向当前标签页发送消息
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          console.log('[WebRTC Control] 向标签页发送时区更新:', tabs[0].id, timezone);
          
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateTimezone',
            timezone: timezone
          }, function(response) {
            console.log('[WebRTC Control] 收到标签页响应:', response);
            
            // 步骤5: 短暂延迟后检测时区是否已更改
            setTimeout(function() {
              detectPageTimezone(function(result) {
                // 显示检测结果
                updateTimezoneStatusUI(result || {
                  success: false,
                  message: '检测结果无效',
                  currentTimezone: '未知',
                  targetTimezone: timezone
                });
                
                console.log('[WebRTC Control] 时区检测结果:', result);
                
                // 如果检测失败或未更改成功，并且不是自动更新的，提示用户刷新页面
                if ((!result || !result.success) && timezone !== 'auto') {
                  console.log('[WebRTC Control] 时区变更需要刷新页面');
                  showRefreshButton();
                }
              });
            }, 2000); // 增加等待时间以确保脚本有足够时间执行
          });
        } else {
          console.error('[WebRTC Control] 无法获取活动标签页');
          updateTimezoneStatusUI({
            success: false,
            message: '无法获取活动标签页',
            currentTimezone: '未知',
            targetTimezone: timezone
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
  
  // IP时区检测按钮
  detectIPTimezoneButton.addEventListener('click', function() {
    // 更改状态文本为检测中
    document.getElementById('timezone-status-text').textContent = 'IP时区检测中...';
    document.getElementById('timezone-status-text').classList.remove('success', 'failed');
    
    // 使用ipgeolocation.io API检测当前IP时区
    const API_KEY = "cb000dbe5ffc4fe7a792bb3c07d03e1f";
    const API_URL = `https://api.ipgeolocation.io/timezone?apiKey=${API_KEY}`;
    
    fetch(API_URL)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data && data.timezone) {
          console.log('[WebRTC Control] API返回数据:', JSON.stringify(data, null, 2));
          
          // 处理特殊地区，比如维吉尼亚州应该使用Eastern Time (America/New_York)
          let correctTimezone = data.timezone;
          
          // 检查是否有地理位置信息
          if (data.geo) {
            const country = data.geo.country_code2 || data.geo.country_code;
            const state = data.geo.state_prov || data.geo.state;
            const stateCode = data.geo.state_code;
            
            console.log("[WebRTC Control] 检测到IP地区:", country, state, stateCode);
            
            // 美国维吉尼亚州应使用America/New_York时区
            if (country === "US" && 
                (state === "Virginia" || stateCode === "VA" || stateCode === "US-VA")) {
              if (correctTimezone !== "America/New_York") {
                console.log("[WebRTC Control] 修正维吉尼亚州的时区: 从", correctTimezone, "改为 America/New_York");
                correctTimezone = "America/New_York";
              }
            }
          }
          
          console.log('[WebRTC Control] IP地址时区检测成功:', correctTimezone);
          
          // 更新UI
          document.getElementById('target-timezone').textContent = correctTimezone;
          document.getElementById('timezone-status-text').textContent = 'IP时区检测成功，正在应用...';
          
          // 更新时区选择器值（如果存在对应选项，否则设为auto）
          const selectElement = document.getElementById('timezone-select');
          let optionExists = false;
          for (let i = 0; i < selectElement.options.length; i++) {
            if (selectElement.options[i].value === correctTimezone) {
              selectElement.value = correctTimezone;
              optionExists = true;
              break;
            }
          }
          
          if (!optionExists) {
            selectElement.value = 'auto';
          }
          
          // 保存到存储并应用
          chrome.storage.local.set({
            timezone: correctTimezone
          }, function() {
            console.log('[WebRTC Control] IP时区已保存到存储:', correctTimezone);
            
            // 发送到后台服务
            background.send("timezone-set", { timezone: correctTimezone });
            
            // 向当前标签页发送消息
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                  action: 'updateTimezone',
                  timezone: correctTimezone
                }, function(response) {
                  console.log('[WebRTC Control] 收到标签页响应:', response);
                  
                  // 短暂延迟后检测时区是否已更改
                  setTimeout(function() {
                    detectPageTimezone(function(result) {
                      updateTimezoneStatusUI(result || {
                        success: false,
                        message: '检测结果无效',
                        currentTimezone: '未知',
                        targetTimezone: correctTimezone
                      });
                    });
                  }, 2000);
                });
              } else {
                console.error('[WebRTC Control] 无法获取活动标签页');
                updateTimezoneStatusUI({
                  success: false,
                  message: '无法获取活动标签页',
                  currentTimezone: '未知',
                  targetTimezone: correctTimezone
                });
              }
            });
          });
        } else {
          console.error('[WebRTC Control] IP时区数据无效:', data);
          document.getElementById('timezone-status-text').textContent = 'IP时区检测失败';
          document.getElementById('timezone-status-text').classList.add('failed');
        }
      })
      .catch(error => {
        console.error('[WebRTC Control] IP时区检测错误:', error);
        document.getElementById('timezone-status-text').textContent = 'IP时区检测错误';
        document.getElementById('timezone-status-text').classList.add('failed');
      });
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