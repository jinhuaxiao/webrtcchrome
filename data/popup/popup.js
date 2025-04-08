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

// 更新状态显示
function updateStatusUI(state, webrtc, timezoneSpoof, timezone) {
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const toggleProtection = document.getElementById('toggle-protection');
  const protectionLevel = document.getElementById('protection-level');
  const toggleTimezone = document.getElementById('toggle-timezone');
  const timezoneContainer = document.getElementById('timezone-container');
  const timezoneSelect = document.getElementById('timezone-select');
  
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
  }
  
  if (timezone) {
    timezoneSelect.value = timezone;
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
    background.send("timezone-toggle", { timezoneSpoof });
  });
  
  // 时区选择
  timezoneSelect.addEventListener('change', function() {
    background.send("timezone-set", { timezone: this.value });
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