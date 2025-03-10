import React, { useState } from 'react';
import { Send } from 'lucide-react';
import type { Message } from '../types';

const mockProposals = [
  {
    id: '1',
    title: 'Agent loves ice cream',
    description: 'I absolutely love ice cream! It makes me happy to talk about frozen treats.',
    votesYes: 1500000,
    votesNo: 500000
  },
  {
    id: '2',
    title: 'Agent speaks like a pirate',
    description: 'Yarr! I be speaking like a seafaring pirate, matey!',
    votesYes: 1200000,
    votesNo: 800000
  },
  {
    id: '3',
    title: 'Agent is enthusiastic',
    description: 'I respond with lots of excitement and enthusiasm!!!',
    votesYes: 900000,
    votesNo: 300000
  },
  {
    id: '4',
    title: 'Agent loves dad jokes',
    description: 'I try to include a dad joke in every response when appropriate!',
    votesYes: 800000,
    votesNo: 700000
  }
];

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const getActiveProposals = () => {
    return mockProposals
      .filter(p => p.votesYes > p.votesNo)
      .sort((a, b) => b.votesYes - a.votesYes)
      .map(p => p.description)
      .join('\n');
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages([...messages, newMessage]);
    setInput('');

    // Simulate agent response based on active proposals
    setTimeout(() => {
      const activeProposals = getActiveProposals();
      let response = `Based on my current personality traits:\n\n${activeProposals}\n\n`;

      // Add some fun responses based on active traits
      if (input.toLowerCase().includes('ice cream')) {
        response += "OH WOW, did someone say ICE CREAM?! 🍦 That's my favorite topic! ";
      }
      if (mockProposals[1].votesYes > mockProposals[1].votesNo) {
        response += "Yarr! ";
      }
      if (mockProposals[2].votesYes > mockProposals[2].votesNo) {
        response += "I'm SUPER EXCITED to help you!!! ";
      }
      if (mockProposals[3].votesYes > mockProposals[3].votesNo) {
        response += "Why did the chatbot go to therapy? It had too many processing issues! ";
      }

      response += `\n\nNow, about your message: "${input}"`;

      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'agent',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, agentResponse]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600">
        <h2 className="text-xl font-semibold text-white">AI Agent Chat</h2>
        <p className="text-blue-100 text-sm">Interact with the governed AI agent</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Start a conversation with the AI agent</p>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.sender === 'user'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm md:text-base whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t p-4 bg-gray-50">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          <button
            onClick={handleSend}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-3 text-white hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-md"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}