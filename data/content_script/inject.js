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

// 监听来自popup的时区更新消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'updateTimezone' && request.timezone) {
    // 保存时区设置到存储
    chrome.storage.local.set({
      timezone: request.timezone
    }, function() {
      console.log('[WebRTC Control] 已保存时区设置到存储:', request.timezone);
    });
    
    // 更新页面中的时区设置
    const updateScript = document.createElement("script");
    updateScript.textContent = `
      window.__WEBRTC_CONTROL_TIMEZONE__ = "${request.timezone}";
      // 触发自定义事件通知时区脚本更新
      document.dispatchEvent(new CustomEvent('webrtc-control-timezone-update'));
    `;
    document.documentElement.appendChild(updateScript);
    updateScript.remove();
    
    // 响应成功消息
    if (sendResponse) {
      sendResponse({success: true});
    }
  }
});

background.send("load");
background.receive("storage", config.update);
