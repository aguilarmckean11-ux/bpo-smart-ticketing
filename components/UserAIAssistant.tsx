'use client';

import React, { useState } from 'react';
import { lookupTicketByQuery } from '@/app/actions';

export default function UserAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! I am your BPO Virtual Assistant. How can I assist you today? / مرحباً! كيف يمكنني مساعدتك اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [awaitingTicketLookup, setAwaitingTicketLookup] = useState(false);
  
  // Dynamic suggestion state based on current context
  const [contextMode, setContextMode] = useState<'default' | 'password' | 'status' | 'docs'>('default');

  const handleSendQuery = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userText = textToSend.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInput('');

    // If waiting for ticket lookup input
    if (awaitingTicketLookup) {
      setAwaitingTicketLookup(false);
      setContextMode('default');
      
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

    // 1. Ticket status check trigger
    if (lower.includes('check') && lower.includes('status')) {
      setAwaitingTicketLookup(true);
      setContextMode('status');
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: 'I would be happy to check your live ticket status! Please reply with your **Ticket ID** or your **Full Name**.',
          },
        ]);
      }, 800);
      return;
    }

    // 2. Greetings (EN / AR)
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('مرحباً') || lower.includes('أهلاً')) {
      setContextMode('default');
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: 'Hello! 👋 How can I help you navigate our services today? You can ask me about checking your ticket status, password resets, or API guidelines.',
          },
        ]);
      }, 600);
      return;
    }

    // 3. Password / Login FAQ
    if (lower.includes('password') || lower.includes('login') || lower.includes('sign in')) {
      setContextMode('password');
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: '🔑 **Password Help:** You can reset your password instantly by clicking "Forgot Password" on the login portal or clearing your local session cookies. Would you like me to guide you through submitting a formal ticket instead?',
          },
        ]);
      }, 800);
      return;
    }

    // 4. Upload Docs / Compliance FAQ
    if (lower.includes('upload') || lower.includes('doc') || lower.includes('compliance')) {
      setContextMode('docs');
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: '📁 **Document Uploads:** You can securely attach compliance files (up to 10MB) directly through the support ticket form or inside your active agent reply drawer using signed URLs.',
          },
        ]);
      }, 800);
      return;
    }

    // 5. Intelligent Conversational Fallback
    setContextMode('default');
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `I understand you're inquiring about "${userText}". While I can assist with general FAQs and status checks, if you need formal assistance from our Tier-2 support team, please fill out the main intake form on this page so we can log your request!`,
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
        <div className="w-80 sm:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl flex flex-col h-[520px] overflow-hidden transition-all">
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

          {/* Contextual Populated Grid Panel (No Horizontal Slider) */}
          <div className="p-3 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
            <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider mb-2">
              ✨ Suggested Actions:
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {contextMode === 'default' && (
                <>
                  <button
                    onClick={() => handleSendQuery('Check my ticket status')}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-gray-700 dark:text-gray-300 font-medium transition flex-1 text-center"
                  >
                    📊 Check Status
                  </button>
                  <button
                    onClick={() => handleSendQuery('I forgot my password')}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-gray-700 dark:text-gray-300 font-medium transition flex-1 text-center"
                  >
                    🔑 Password Help
                  </button>
                  <button
                    onClick={() => handleSendQuery('Upload compliance document')}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-gray-700 dark:text-gray-300 font-medium transition w-full text-center"
                  >
                    📁 Upload Compliance Docs
                  </button>
                </>
              )}

              {contextMode === 'password' && (
                <>
                  <button
                    onClick={() => handleSendQuery('Clear browser cookies & retry')}
                    className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-300 dark:border-indigo-700 px-3 py-1.5 rounded-lg text-indigo-700 dark:text-indigo-300 font-medium transition flex-1 text-center"
                  >
                    ✨ Clear Cookies Guide
                  </button>
                  <button
                    onClick={() => handleSendQuery('Escalate to human agent')}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 dark:text-gray-300 font-medium transition flex-1 text-center"
                  >
                    🎧 Talk to Human
                  </button>
                </>
              )}

              {contextMode === 'status' && (
                <button
                  onClick={() => {
                    setAwaitingTicketLookup(false);
                    setContextMode('default');
                    handleSendQuery('Cancel status check');
                  }}
                  className="bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700 px-3 py-1.5 rounded-lg text-rose-600 dark:text-rose-300 font-medium transition w-full text-center"
                >
                  ❌ Cancel Lookup
                </button>
              )}

              {contextMode === 'docs' && (
                <button
                  onClick={() => handleSendQuery('What file formats are accepted?')}
                  className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-300 dark:border-indigo-700 px-3 py-1.5 rounded-lg text-indigo-700 dark:text-indigo-300 font-medium transition w-full text-center"
                >
                  📋 Accepted Formats (PDF/CSV)
                </button>
              )}
            </div>
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