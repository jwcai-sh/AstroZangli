"use client";

import { useState } from "react";
import Link from "next/link";
import FooterBar from "@/components/FooterBar";
import { fetchChatReply } from "@/services/chatApi";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "你好！我是你的天文助手，有什么可以帮助你的吗？",
      isUser: false,
      time: "14:30",
    },
  ]);
  const [inputText, setInputText] = useState("");

  const sendMessage = async () => {
    if (inputText.trim()) {
      const userMessage = {
        id: messages.length + 1,
        text: inputText,
        isUser: true,
        time: new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      const currentInput = inputText;
      setInputText("");

      try {
        const data = await fetchChatReply(currentInput);
        if (data) {
          const aiMessage = {
            id: updatedMessages.length + 1,
            text: data.reply,
            isUser: false,
            time: new Date().toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          setMessages((prevMessages) => [...prevMessages, aiMessage]);
        }
      } catch (error) {
        console.error("Error fetching AI response:", error);
        const errorMessage = {
          id: updatedMessages.length + 1,
          text: "抱歉，我这里出了点问题，暂时无法回复。",
          isUser: false,
          time: new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prevMessages) => [...prevMessages, errorMessage]);
      }
    }
  };

  return (
    <div className="bg-black text-white min-h-screen flex flex-col">
      <div className="relative z-10 flex flex-col h-screen bg-black">
        {/* 顶部导航 */}
        <div className="flex justify-between items-center p-4 border-b border-white/10 glass-effect">
          <Link
            href="/"
            className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>返回</span>
          </Link>
          <h1 className="text-xl font-semibold">天文助手</h1>
          <div className="w-12"></div>
        </div>

        {/* 聊天消息区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${message.isUser ? "justify-end" : "justify-start"
                }`}
            >
              {!message.isUser && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex-shrink-0"></div>
              )}
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${message.isUser
                  ? "bg-blue-600/80 text-white rounded-br-lg"
                  : "bg-gray-700/70 text-white rounded-bl-lg"
                  } glass-effect`}
              >
                <p className="text-base">{message.text}</p>
                <p
                  className={`text-xs mt-2 text-right ${message.isUser ? "text-blue-100/70" : "text-gray-400/70"
                    }`}
                >
                  {message.time}
                </p>
              </div>
              {message.isUser && (
                <div className="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0"></div>
              )}
            </div>
          ))}
        </div>

        {/* 输入区域 */}
        <div className="p-4 border-t border-white/10 glass-effect">
          <div className="flex space-x-4 items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="输入你的问题..."
              className="flex-1 bg-gray-800/80 text-white px-4 py-3 rounded-xl border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors glow-effect disabled:opacity-50"
              disabled={!inputText.trim()}
            >
              发送
            </button>
          </div>
        </div>

        {/* 底部导航栏 */}
        <FooterBar />
      </div>
    </div>
  );
}
