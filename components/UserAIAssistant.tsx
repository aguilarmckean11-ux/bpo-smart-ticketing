'use client';

import React, { useState } from 'react';
import { lookupTicketByQuery } from '@/app/actions';
// Import your server action for live database lookups
// import { lookupTicketByQuery } from '@/app/admin/actions'; // Adjust path as needed

export default function UserAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your BPO Virtual Assistant. How can I assist you today? / مرحباً! كيف يمكنني مساعدتك اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [awaitingTicketLookup, setAwaitingTicketLookup] = useState(false);

  const handleSendQuery = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userText = textToSend.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInput('');

    // If waiting for ticket lookup input
    if (awaitingTicketLookup) {
      setAwaitingTicketLookup(false);
      
      try {
        const res = await lookupTicketByQuery(userText);
        
        if (res.success && res.data) {
          const t = res.data;
          const responseText = `💙 **Ticket Found!**

📌 **Ticket ID:** #${t.id}
👤 **Customer:** ${t.customer_name}
⚡ **Status:** ${t.status.toUpperCase()}
📝 **Issue:** ${t.issue_description}

Our support team is actively processing your request. We appreciate your patience!`;

          setMessages((prev) => [...prev, { sender: 'ai', text: responseText }]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'ai',
              text: `I'm so sorry, but I couldn't find an active ticket matching "${userText}" in our live database. Please double-check your Ticket ID or Name and try again!`,
            },
          ]);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          { sender: 'ai', text: `Sorry, I encountered a temporary network issue checking the database. Please try again.` },
        ]);
      }
      return;
    }

    const lower = userText.toLowerCase();

    if (lower.includes('check') && lower.includes('status')) {
      setAwaitingTicketLookup(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: 'I would be happy to check your live ticket status! Please reply with your **Ticket ID** (e.g., TK-1001) or your **Full Name**.',
          },
        ]);
      }, 800);
      return;
    }

    // Default response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'I have logged your request and notified our Tier-2 support team. Your inquiry is currently being processed.',
        },
      ]);
    }, 1000);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendQuery(input);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
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

      {isOpen && (
        <div className="w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col h-[500px] overflow-hidden transition-all">
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

          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50 dark:bg-gray-950">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-xl text-sm whitespace-pre-line ${
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

          <div className="p-2 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex gap-2 overflow-x-auto text-xs">
            <button
              onClick={() => handleSendQuery('Check my ticket status')}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-1 rounded-full whitespace-nowrap hover:bg-gray-50 dark:text-gray-300 font-medium"
            >
              📊 Check Ticket Status
            </button>
            <button
              onClick={() => handleSendQuery('Upload compliance document')}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-1 rounded-full whitespace-nowrap hover:bg-gray-50 dark:text-gray-300 font-medium"
            >
              📁 Upload Docs
            </button>
          </div>

          <form
            onSubmit={handleFormSubmit}
            className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex gap-2"
          >
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