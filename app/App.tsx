import React from 'react';
import { Bot } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { ProposalsList } from './components/ProposalsList';
import { CreateProposal } from './components/CreateProposal';
import { WalletConnect } from './components/WalletConnect';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
                <Bot className="text-white" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Sonic AI Governance</h1>
            </div>
            <WalletConnect />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="h-[600px]">
              <ChatInterface />
            </div>
          </div>
          <div className="space-y-6">
            <CreateProposal />
            <ProposalsList />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;