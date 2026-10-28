'use client';

import React, { useState } from 'react';

export default function UserAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your BPO Virtual Assistant. How can I assist you today? / مرحباً! كيف يمكنني مساعدتك اليوم؟' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { 
          sender: 'ai', 
          text: 'I have logged your request and notified our tier-2 support team. Your ticket status is currently being processed.' 
        }
      ]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Trigger Button with Hover-Animated Robot Icon */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group bg-indigo-600 text-white px-5 py-3.5 rounded-full shadow-2xl hover:bg-indigo-700 hover:shadow-indigo-500/50 transition-all duration-300 flex items-center gap-2.5 font-medium border border-indigo-400/30"
        >
          <span className="text-xl transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-12 group-hover:animate-bounce inline-block">
            🤖
          </span>
          <span className="text-sm font-semibold tracking-wide">Ask AI Copilot</span>
        </button>
      )}

      {/* Slide-over / Chat Box Container */}
      {isOpen && (
        <div className="w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col h-[500px] overflow-hidden transition-all">
          {/* Header */}
          <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">Support AI Copilot</h3>
              <p className="text-xs text-indigo-200">24/7 Bilingual Assistance (EN / AR)</p>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 text-xl font-bold px-2"
            >
              &times;
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50 dark:bg-gray-950">
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] p-3 rounded-xl text-sm ${
                    msg.sender === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm border border-gray-100 dark:border-gray-700 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Action Chips */}
          <div className="p-2 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex gap-2 overflow-x-auto text-xs">
            <button 
              onClick={() => setInput('Check my ticket status')} 
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-1 rounded-full whitespace-nowrap hover:bg-gray-50 dark:text-gray-300"
            >
              📊 Check Ticket Status
            </button>
            <button 
              onClick={() => setInput('Upload compliance document')} 
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-1 rounded-full whitespace-nowrap hover:bg-gray-50 dark:text-gray-300"
            >
              📁 Upload Docs
            </button>
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message / اكتب رسالتك..."
              className="flex-1 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-transparent dark:text-white"
            />
            <button 
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}