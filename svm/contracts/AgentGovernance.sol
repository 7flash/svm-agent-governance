// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AgentToken
 * @dev ERC20 token with voting capabilities for AI Agent governance
 */
contract AgentToken is ERC20, ERC20Votes, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address initialHolder
    ) ERC20(name, symbol) ERC20Permit(name) Ownable(msg.sender) {
        _mint(initialHolder, initialSupply);
    }

    // Override required functions due to multiple inheritance
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit) returns (uint256) {
        return super.nonces(owner);
    }
}

/**
 * @title AIAgentPrompt
 * @dev Stores the AI Agent's system prompt, can only be updated by governance
 */
contract AIAgentPrompt is Ownable {
    string public systemPrompt;
    
    // Events
    event SystemPromptUpdated(string newPrompt, uint256 proposalId);
    
    constructor(string memory initialPrompt) Ownable(msg.sender) {
        systemPrompt = initialPrompt;
    }
    
    /**
     * @dev Update the system prompt
     * @param newPrompt The new system prompt text
     * @param proposalId The ID of the proposal that triggered this update
     */
    function updateSystemPrompt(string memory newPrompt, uint256 proposalId) external onlyOwner {
        systemPrompt = newPrompt;
        emit SystemPromptUpdated(newPrompt, proposalId);
    }
    
    /**
     * @dev Get the current system prompt
     * @return The current system prompt text
     */
    function getSystemPrompt() external view returns (string memory) {
        return systemPrompt;
    }
}

/**
 * @title AIAgentGovernance
 * @dev Governance contract for AI Agent system prompt updates
 */
contract AIAgentGovernance is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    
    // Governance parameters
    uint256 public votingPeriod;         // Duration of voting in blocks
    uint256 public proposalThreshold;    // Min tokens required to submit a proposal
    uint256 public quorumThreshold;      // Min percentage of tokens that must vote (basis points: 1000 = 10%)
    
    // Protocol parameters
    AIAgentPrompt public promptContract;
    AgentToken public governanceToken;
    
    // Proposal states
    enum ProposalState { Pending, Active, Canceled, Defeated, Succeeded, Executed }
    
    // Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        string newPrompt;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        bool canceled;
        mapping(address => Receipt) receipts;
    }
    
    // Vote receipt
    struct Receipt {
        bool hasVoted;
        bool support;
        uint256 votes;
    }
    
    // Proposal tracking
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    
    // Events
    event ProposalCreated(
        uint256 indexed id,
        address indexed proposer,
        string title,
        string description,
        string newPrompt,
        uint256 startBlock,
        uint256 endBlock
    );
    event VoteCast(address indexed voter, uint256 indexed proposalId, bool support, uint256 votes);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);
    event GovernanceParametersUpdated(uint256 votingPeriod, uint256 proposalThreshold, uint256 quorumThreshold);
    
    /**
     * @dev Constructor for AIAgentGovernance
     * @param _governanceToken The governance token address
     * @param _promptContract The prompt contract address
     * @param _votingPeriod Duration of voting in blocks
     * @param _proposalThreshold Min tokens required to submit a proposal
     * @param _quorumThreshold Min percentage of tokens that must vote (basis points: 1000 = 10%)
     */
    constructor(
        address _governanceToken,
        address _promptContract,
        uint256 _votingPeriod,
        uint256 _proposalThreshold,
        uint256 _quorumThreshold
    ) Ownable(msg.sender) {
        governanceToken = AgentToken(_governanceToken);
        promptContract = AIAgentPrompt(_promptContract);
        votingPeriod = _votingPeriod;
        proposalThreshold = _proposalThreshold;
        quorumThreshold = _quorumThreshold;
    }
    
    /**
     * @dev Update governance parameters (restricted to owner)
     */
    function updateGovernanceParameters(
        uint256 _votingPeriod,
        uint256 _proposalThreshold,
        uint256 _quorumThreshold
    ) external onlyOwner {
        votingPeriod = _votingPeriod;
        proposalThreshold = _proposalThreshold;
        quorumThreshold = _quorumThreshold;
        
        emit GovernanceParametersUpdated(votingPeriod, proposalThreshold, quorumThreshold);
    }
    
    /**
     * @dev Create a new proposal
     * @param title Short title of the proposal
     * @param description Detailed description of the proposal
     * @param newPrompt The new system prompt to be set if proposal passes
     */
    function createProposal(
        string memory title,
        string memory description, 
        string memory newPrompt
    ) external nonReentrant returns (uint256) {
        require(governanceToken.balanceOf(msg.sender) >= proposalThreshold, "AgentGov: below proposal threshold");
        
        proposalCount++;
        uint256 startBlock = block.number;
        uint256 endBlock = startBlock.add(votingPeriod);
        
        Proposal storage newProposal = proposals[proposalCount];
        newProposal.id = proposalCount;
        newProposal.proposer = msg.sender;
        newProposal.title = title;
        newProposal.description = description;
        newProposal.newPrompt = newPrompt;
        newProposal.startBlock = startBlock;
        newProposal.endBlock = endBlock;
        
        emit ProposalCreated(
            proposalCount,
            msg.sender,
            title,
            description,
            newPrompt,
            startBlock,
            endBlock
        );
        
        return proposalCount;
    }
    
    /**
     * @dev Cast a vote on a proposal
     * @param proposalId The ID of the proposal
     * @param support Whether to support the proposal
     */
    function castVote(uint256 proposalId, bool support) external nonReentrant {
        require(state(proposalId) == ProposalState.Active, "AgentGov: proposal not active");
        Proposal storage proposal = proposals[proposalId];
        Receipt storage receipt = proposal.receipts[msg.sender];
        
        require(!receipt.hasVoted, "AgentGov: already voted");
        
        uint256 votes = governanceToken.balanceOf(msg.sender);
        
        if (support) {
            proposal.forVotes = proposal.forVotes.add(votes);
        } else {
            proposal.againstVotes = proposal.againstVotes.add(votes);
        }
        
        receipt.hasVoted = true;
        receipt.support = support;
        receipt.votes = votes;
        
        emit VoteCast(msg.sender, proposalId, support, votes);
    }
    
    /**
     * @dev Execute a successful proposal
     * @param proposalId The ID of the proposal to execute
     */
    function executeProposal(uint256 proposalId) external nonReentrant {
        require(state(proposalId) == ProposalState.Succeeded, "AgentGov: proposal not succeeded");
        
        Proposal storage proposal = proposals[proposalId];
        proposal.executed = true;
        
        // Update the system prompt in the prompt contract
        promptContract.updateSystemPrompt(proposal.newPrompt, proposalId);
        
        emit ProposalExecuted(proposalId);
    }
    
    /**
     * @dev Cancel a proposal (only proposer or if proposer falls below threshold)
     * @param proposalId The ID of the proposal to cancel
     */
    function cancelProposal(uint256 proposalId) external {
        require(state(proposalId) == ProposalState.Active || state(proposalId) == ProposalState.Pending, "AgentGov: proposal not active or pending");
        
        Proposal storage proposal = proposals[proposalId];
        
        require(
            msg.sender == proposal.proposer || 
            governanceToken.balanceOf(proposal.proposer) < proposalThreshold,
            "AgentGov: only proposer or if below threshold"
        );
        
        proposal.canceled = true;
        
        emit ProposalCanceled(proposalId);
    }
    
    /**
     * @dev Get the current state of a proposal
     * @param proposalId The ID of the proposal
     * @return Current state of the proposal
     */
    function state(uint256 proposalId) public view returns (ProposalState) {
        require(proposalId <= proposalCount && proposalId > 0, "AgentGov: invalid proposal id");
        
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.canceled) {
            return ProposalState.Canceled;
        } else if (proposal.executed) {
            return ProposalState.Executed;
        } else if (block.number <= proposal.startBlock) {
            return ProposalState.Pending;
        } else if (block.number <= proposal.endBlock) {
            return ProposalState.Active;
        } else if (_quorumReached(proposalId) && _voteSucceeded(proposalId)) {
            return ProposalState.Succeeded;
        } else {
            return ProposalState.Defeated;
        }
    }
    
    /**
     * @dev Check if the vote on a proposal succeeded
     * @param proposalId The ID of the proposal
     * @return True if the proposal received more for votes than against votes
     */
    function _voteSucceeded(uint256 proposalId) internal view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        return proposal.forVotes > proposal.againstVotes;
    }
    
    /**
     * @dev Check if the quorum for a proposal has been reached
     * @param proposalId The ID of the proposal
     * @return True if the quorum has been reached
     */
    function _quorumReached(uint256 proposalId) internal view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        uint256 totalVotes = proposal.forVotes.add(proposal.againstVotes);
        uint256 totalSupply = governanceToken.totalSupply();
        
        return totalVotes.mul(10000).div(totalSupply) >= quorumThreshold;
    }
    
    /**
     * @dev Get detailed information about a proposal
     * @param proposalId The ID of the proposal
     * @return Full proposal details including votes and status
     */
    function getProposalDetails(uint256 proposalId) external view returns (
        address proposer,
        string memory title,
        string memory description,
        string memory newPrompt,
        uint256 startBlock,
        uint256 endBlock,
        uint256 forVotes,
        uint256 againstVotes,
        bool executed,
        bool canceled,
        ProposalState currentState
    ) {
        require(proposalId <= proposalCount && proposalId > 0, "AgentGov: invalid proposal id");
        
        Proposal storage proposal = proposals[proposalId];
        
        return (
            proposal.proposer,
            proposal.title,
            proposal.description,
            proposal.newPrompt,
            proposal.startBlock,
            proposal.endBlock,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.executed,
            proposal.canceled,
            state(proposalId)
        );
    }
    
    /**
     * @dev Check if an address has voted on a proposal
     * @param proposalId The ID of the proposal
     * @param voter The address to check
     * @return Whether the address has voted, their vote choice, and vote weight
     */
    function getReceipt(uint256 proposalId, address voter) external view returns (
        bool hasVoted,
        bool support,
        uint256 votes
    ) {
        require(proposalId <= proposalCount && proposalId > 0, "AgentGov: invalid proposal id");
        
        Receipt storage receipt = proposals[proposalId].receipts[voter];
        
        return (
            receipt.hasVoted,
            receipt.support,
            receipt.votes
        );
    }
    
    /**
     * @dev Transfer ownership of the prompt contract to a new address
     * @param newOwner The address to transfer ownership to
     */
    function transferPromptOwnership(address newOwner) external onlyOwner {
        promptContract.transferOwnership(newOwner);
    }
}

/**
 * @title AIAgentGovernanceFactory
 * @dev Factory contract to deploy the entire AI Agent governance system
 */
contract AIAgentGovernanceFactory {
    event GovernanceSystemDeployed(
        address indexed creator,
        address indexed governanceToken,
        address indexed promptContract,
        address governanceContract
    );
    
    /**
     * @dev Deploy the entire AI Agent governance system
     * @param tokenName Name of the governance token
     * @param tokenSymbol Symbol of the governance token
     * @param initialTokenSupply Initial supply of governance tokens
     * @param initialPrompt Initial system prompt for the AI Agent
     * @param votingPeriod Duration of voting in blocks
     * @param proposalThreshold Min tokens required to submit a proposal
     * @param quorumThreshold Min percentage of tokens that must vote (basis points: 1000 = 10%)
     * @return Addresses of the deployed contracts
     */
    function deployGovernanceSystem(
        string memory tokenName,
        string memory tokenSymbol,
        uint256 initialTokenSupply,
        string memory initialPrompt,
        uint256 votingPeriod,
        uint256 proposalThreshold,
        uint256 quorumThreshold
    ) external returns (
        address tokenAddress,
        address promptAddress,
        address governanceAddress
    ) {
        // Deploy governance token
        AgentToken token = new AgentToken(
            tokenName,
            tokenSymbol,
            initialTokenSupply,
            msg.sender
        );
        
        // Deploy prompt contract
        AIAgentPrompt prompt = new AIAgentPrompt(initialPrompt);
        
        // Deploy governance contract
        AIAgentGovernance governance = new AIAgentGovernance(
            address(token),
            address(prompt),
            votingPeriod,
            proposalThreshold,
            quorumThreshold
        );
        
        // Transfer ownership of prompt contract to governance contract
        prompt.transferOwnership(address(governance));
        
        emit GovernanceSystemDeployed(
            msg.sender,
            address(token),
            address(prompt),
            address(governance)
        );
        
        return (address(token), address(prompt), address(governance));
    }
}
