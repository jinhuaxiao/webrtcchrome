importScripts("lib/config.js");
importScripts("lib/chrome.js");
importScripts("lib/runtime.js");
importScripts("lib/common.js");

// 添加消息转发系统
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 处理从popup到content script的消息转发
  if (request.path === "popup-to-background") {
    console.log("[WebRTC Control Background] 收到时区相关请求:", request.method, request.data);
    
    // 处理时区设置、检测和测试消息
    if (request.method === "timezone-set" || request.method === "timezone-toggle" || request.method === "timezone-detect") {
      // 获取当前活动标签页
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          let action, data;
          
          // 根据消息类型确定要发送的action和数据
          if (request.method === "timezone-set") {
            action = "updateTimezone";
            data = {timezone: request.data.timezone};
          } else if (request.method === "timezone-detect") {
            action = "detectTimezone";
            data = {};
          } else if (request.method === "timezone-toggle") {
            action = request.data.timezoneSpoof ? "enableTimezone" : "disableTimezone";
            data = {};
          }
          
          console.log("[WebRTC Control Background] 转发消息到标签页:", tabs[0].id, action, data);
          
          chrome.tabs.sendMessage(tabs[0].id, {
            action: action,
            ...data
          }, function(response) {
            console.log("[WebRTC Control Background] 收到内容脚本响应:", response);
            if (sendResponse) {
              sendResponse(response);
            }
          });
        } else {
          console.error("[WebRTC Control Background] 无法获取当前活动标签页");
          if (sendResponse) {
            sendResponse({success: false, message: "无法获取活动标签页"});
          }
        }
      });
      
      // 保持消息通道开放
      return true;
    }
  } else if (request.path === "content-to-background") {
    // 处理来自内容脚本的消息
    if (request.method === "test-message") {
      console.log("[WebRTC Control Background] 收到测试消息:", request.data);
      if (sendResponse) {
        sendResponse({success: true, message: "Background received your message"});
      }
    }
    return true;
  }
});