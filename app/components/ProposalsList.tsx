import React from 'react';
import { ThumbsUp, ThumbsDown, Bot, Users, Timer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ethers } from 'ethers';
import type { Proposal } from '../types';

const mockProposals: Proposal[] = [
  {
    id: '1',
    title: 'Agent loves ice cream',
    description: 'I absolutely love ice cream! It makes me happy to talk about frozen treats.',
    creator: '0x1234...5678',
    createdAt: new Date(Date.now() - 86400000),
    votesYes: 1500000,
    votesNo: 500000,
    totalVotes: 2000000
  },
  {
    id: '2',
    title: 'Agent speaks like a pirate',
    description: 'Yarr! I be speaking like a seafaring pirate, matey!',
    creator: '0x8765...4321',
    createdAt: new Date(Date.now() - 172800000),
    votesYes: 1200000,
    votesNo: 800000,
    totalVotes: 2000000
  },
  {
    id: '3',
    title: 'Agent is enthusiastic',
    description: 'I respond with lots of excitement and enthusiasm!!!',
    creator: '0x9876...5432',
    createdAt: new Date(Date.now() - 259200000),
    votesYes: 900000,
    votesNo: 300000,
    totalVotes: 1200000
  },
  {
    id: '4',
    title: 'Agent loves dad jokes',
    description: 'I try to include a dad joke in every response when appropriate!',
    creator: '0x5432...7890',
    createdAt: new Date(Date.now() - 345600000),
    votesYes: 800000,
    votesNo: 700000,
    totalVotes: 1500000
  }
];

export function ProposalsList() {
  const sortedProposals = [...mockProposals].sort((a, b) => b.votesYes - a.votesYes);

  const handleVote = async (proposalId: string, voteType: 'yes' | 'no') => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask!');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Example transaction parameters
      const transaction = {
        to: '0xYourContractAddress', // Replace with actual contract address
        data: ethers.id(`vote(uint256,bool)`).slice(0, 10) + // Function signature
              ethers.AbiCoder.defaultAbiCoder().encode(
                ['uint256', 'bool'],
                [proposalId, voteType === 'yes']
              ).slice(2),
        gasLimit: 100000
      };

      // Send transaction
      const tx = await signer.sendTransaction(transaction);
      console.log(`Vote transaction sent: ${tx.hash}`);
      
      // Wait for confirmation
      await tx.wait();
      console.log('Vote confirmed!');
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error submitting vote. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Current System Prompt</h2>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-gray-700 whitespace-pre-wrap">
            {sortedProposals
              .filter(p => p.votesYes > p.votesNo)
              .sort((a, b) => b.votesYes - a.votesYes)
              .map(p => p.description)
              .join('\n')}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 max-h-[calc(100vh-24rem)] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 sticky top-0 bg-white pb-4 border-b">
          Governance Proposals
        </h2>
        <div className="space-y-6">
          {sortedProposals.map((proposal) => (
            <div key={proposal.id} className="bg-gray-50 rounded-xl p-6 border border-gray-100 hover:border-blue-200 transition-all duration-200">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg p-3 text-white shrink-0">
                  <Bot size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{proposal.title}</h3>
                  <p className="text-gray-600 mb-4">{proposal.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Users size={16} />
                      <span className="truncate">{proposal.creator}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Timer size={16} />
                      <span>{formatDistanceToNow(proposal.createdAt, { addSuffix: true })}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote(proposal.id, 'yes')}
                        className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors duration-200"
                      >
                        <ThumbsUp size={18} />
                        <span className="font-medium">{(proposal.votesYes / 1000000).toFixed(1)}M</span>
                      </button>
                      <button
                        onClick={() => handleVote(proposal.id, 'no')}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors duration-200"
                      >
                        <ThumbsDown size={18} />
                        <span className="font-medium">{(proposal.votesNo / 1000000).toFixed(1)}M</span>
                      </button>
                    </div>
                    <div className="px-4 py-2 bg-gray-100 rounded-lg">
                      <span className="text-gray-600 font-medium">
                        Total: {(proposal.totalVotes / 1000000).toFixed(1)}M
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}