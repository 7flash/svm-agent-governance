// test/AIAgentGovernance.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AIAgentGovernance", function () {
  // Test variables
  let AgentToken;
  let AIAgentPrompt;
  let AIAgentGovernance;
  let token;
  let prompt;
  let governance;
  let owner;
  let addr1;
  let addr2;
  let addr3;

  // Governance parameters
  const tokenName = "AI Agent Governance Token";
  const tokenSymbol = "AIGT";
  const initialSupply = ethers.utils.parseEther("1000000"); // 1M tokens
  const initialPrompt = "You are an AI assistant that helps users with their queries.";
  const votingPeriod = 50; // 50 blocks for testing
  const proposalThreshold = ethers.utils.parseEther("100000"); // 100k tokens
  const quorumThreshold = 1000; // 10% in basis points

  // Proposal parameters
  const proposalTitle = "Improve AI assistant instructions";
  const proposalDescription = "This proposal enhances the AI assistant's system prompt to be more helpful.";
  const newPromptText = "You are an AI assistant that helps users with their queries in a helpful, harmless, and honest manner.";

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy token contract
    AgentToken = await ethers.getContractFactory("AgentToken");
    token = await AgentToken.deploy(
      tokenName,
      tokenSymbol,
      initialSupply,
      owner.address
    );
    await token.deployed();

    // Deploy prompt contract
    AIAgentPrompt = await ethers.getContractFactory("AIAgentPrompt");
    prompt = await AIAgentPrompt.deploy(initialPrompt);
    await prompt.deployed();

    // Deploy governance contract
    AIAgentGovernance = await ethers.getContractFactory("AgentGovernance");
    governance = await AIAgentGovernance.deploy(
      token.address,
      prompt.address,
      votingPeriod,
      proposalThreshold,
      quorumThreshold
    );
    await governance.deployed();

    // Transfer ownership of prompt contract to governance
    await prompt.transferOwnership(governance.address);

    // Transfer some tokens to addr1 and addr2
    await token.transfer(addr1.address, ethers.utils.parseEther("200000")); // 200k tokens
    await token.transfer(addr2.address, ethers.utils.parseEther("150000")); // 150k tokens
    
    // Delegate voting power
    await token.delegate(owner.address);
    await token.connect(addr1).delegate(addr1.address);
    await token.connect(addr2).delegate(addr2.address);
  });

  describe("Deployment", function () {
    it("Should set the correct initial parameters", async function () {
      expect(await governance.votingPeriod()).to.equal(votingPeriod);
      expect(await governance.proposalThreshold()).to.equal(proposalThreshold);
      expect(await governance.quorumThreshold()).to.equal(quorumThreshold);
      expect(await governance.governanceToken()).to.equal(token.address);
      expect(await governance.promptContract()).to.equal(prompt.address);
    });

    it("Should have prompt contract owned by governance", async function () {
      expect(await prompt.owner()).to.equal(governance.address);
    });
  });

  describe("Governance Parameters", function () {
    it("Should allow owner to update governance parameters", async function () {
      const newVotingPeriod = 100;
      const newProposalThreshold = ethers.utils.parseEther("50000");
      const newQuorumThreshold = 500;

      await governance.updateGovernanceParameters(
        newVotingPeriod,
        newProposalThreshold,
        newQuorumThreshold
      );

      expect(await governance.votingPeriod()).to.equal(newVotingPeriod);
      expect(await governance.proposalThreshold()).to.equal(newProposalThreshold);
      expect(await governance.quorumThreshold()).to.equal(newQuorumThreshold);
    });

    it("Should prevent non-owners from updating governance parameters", async function () {
      await expect(
        governance.connect(addr1).updateGovernanceParameters(100, ethers.utils.parseEther("50000"), 500)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Proposal Creation", function () {
    it("Should allow users with enough tokens to create proposals", async function () {
      expect(await governance.proposalCount()).to.equal(0);

      // Create a proposal
      await governance.connect(addr1).createProposal(
        proposalTitle,
        proposalDescription,
        newPromptText
      );

      expect(await governance.proposalCount()).to.equal(1);
      
      // Get proposal details
      const proposal = await governance.getProposalDetails(1);
      expect(proposal.proposer).to.equal(addr1.address);
      expect(proposal.title).to.equal(proposalTitle);
      expect(proposal.description).to.equal(proposalDescription);
      expect(proposal.newPrompt).to.equal(newPromptText);
    });

    it("Should prevent users with insufficient tokens from creating proposals", async function () {
      // Transfer tokens from addr2 to addr3, leaving addr2 with insufficient tokens
      await token.connect(addr2).transfer(addr3.address, ethers.utils.parseEther("149000"));
      
      await expect(
        governance.connect(addr2).createProposal(
          proposalTitle,
          proposalDescription,
          newPromptText
        )
      ).to.be.revertedWith("AgentGov: below proposal threshold");
    });

    it("Should emit ProposalCreated event when a proposal is created", async function () {
      await expect(
        governance.connect(addr1).createProposal(
          proposalTitle,
          proposalDescription,
          newPromptText
        )
      ).to.emit(governance, "ProposalCreated");
    });
  });

  describe("Voting", function () {
    beforeEach(async function () {
      // Create a proposal before each test
      await governance.connect(addr1).createProposal(
        proposalTitle,
        proposalDescription,
        newPromptText
      );
    });

    it("Should allow token holders to cast votes", async function () {
      // Vote for the proposal
      await governance.castVote(1, true);
      
      // Check vote receipt
      const receipt = await governance.getReceipt(1, owner.address);
      expect(receipt.hasVoted).to.be.true;
      expect(receipt.support).to.be.true;
      expect(receipt.votes).to.equal(ethers.utils.parseEther("650000")); // Owner's tokens after transfers
    });

    it("Should prevent double voting", async function () {
      // First vote
      await governance.castVote(1, true);
      
      // Try to vote again
      await expect(
        governance.castVote(1, false)
      ).to.be.revertedWith("AgentGov: already voted");
    });

    it("Should track votes correctly", async function () {
      // Owner votes for
      await governance.castVote(1, true);
      
      // Addr2 votes against
      await governance.connect(addr2).castVote(1, false);
      
      // Get proposal details
      const proposal = await governance.getProposalDetails(1);
      expect(proposal.forVotes).to.equal(ethers.utils.parseEther("650000")); // Owner's tokens
      expect(proposal.againstVotes).to.equal(ethers.utils.parseEther("150000")); // Addr2's tokens
    });

    it("Should emit VoteCast event when a vote is cast", async function () {
      await expect(governance.castVote(1, true))
        .to.emit(governance, "VoteCast")
        .withArgs(owner.address, 1, true, ethers.utils.parseEther("650000"));
    });
  });

  describe("Proposal Lifecycle and States", function () {
    beforeEach(async function () {
      // Create a proposal before each test
      await governance.connect(addr1).createProposal(
        proposalTitle,
        proposalDescription,
        newPromptText
      );
    });

    it("Should have the correct state transitions", async function () {
      // Initially active
      expect(await governance.state(1)).to.equal(2); // Active

      // Cast some votes
      await governance.castVote(1, true); // Owner votes for
      await governance.connect(addr2).castVote(1, false); // Addr2 votes against
      
      // Mine blocks to end voting period
      for (let i = 0; i < votingPeriod; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      // Should be in Succeeded state since we have majority and quorum
      expect(await governance.state(1)).to.equal(4); // Succeeded
      
      // Execute the proposal
      await governance.executeProposal(1);
      
      // Should be in Executed state
      expect(await governance.state(1)).to.equal(5); // Executed
      
      // Check that the prompt was updated
      expect(await prompt.getSystemPrompt()).to.equal(newPromptText);
    });

    it("Should not allow execution of defeated proposals", async function () {
      // Only addr2 votes against, not enough to defeat by itself but won't meet quorum
      await governance.connect(addr2).castVote(1, false);
      
      // Mine blocks to end voting period
      for (let i = 0; i < votingPeriod; i++) {
        await ethers.provider.send("evm_mine", []);
      }
      
      // Should be in Defeated state due to not meeting quorum
      expect(await governance.state(1)).to.equal(3); // Defeated
      
      // Try to execute the proposal
      await expect(governance.executeProposal(1))
        .to.be.revertedWith("AgentGov: proposal not succeeded");
    });

    it("Should allow the proposer to cancel a proposal", async function () {
      // Addr1 (the proposer) cancels the proposal
      await governance.connect(addr1).cancelProposal(1);
      
      // Should be in Canceled state
      expect(await governance.state(1)).to.equal(2); // Canceled
      
      // Try to vote on a canceled proposal
      await expect(governance.castVote(1, true))
        .to.be.revertedWith("AgentGov: proposal not active");
    });

    it("Should allow anyone to cancel if proposer falls below threshold", async function () {
      // Transfer tokens from addr1 to addr3, making addr1 fall below threshold
      await token.connect(addr1).transfer(addr3.address, ethers.utils.parseEther("150000"));
      
      // Addr2 (not the proposer) cancels the proposal
      await governance.connect(addr2).cancelProposal(1);
      
      // Should be in Canceled state
      expect(await governance.state(1)).to.equal(2); // Canceled
    });
  });

  describe("Proposal Execution", function () {
    beforeEach(async function () {
      // Create a proposal before each test
      await governance.connect(addr1).createProposal(
        proposalTitle,
        proposalDescription,
        newPromptText
      );
      
      // Vote for the proposal to ensure it passes
      await governance.castVote(1, true); // Owner votes for
      await governance.connect(addr1).castVote(1, true); // Addr1 votes for
      
      // Mine blocks to end voting period
      for (let i = 0; i < votingPeriod; i++) {
        await ethers.provider.send("evm_mine", []);
      }
    });

    it("Should update the system prompt when a proposal is executed", async function () {
      // Execute the proposal
      await governance.executeProposal(1);
      
      // Check that the prompt was updated
      expect(await prompt.getSystemPrompt()).to.equal(newPromptText);
    });

    it("Should emit ProposalExecuted event when a proposal is executed", async function () {
      await expect(governance.executeProposal(1))
        .to.emit(governance, "ProposalExecuted")
        .withArgs(1);
    });

    it("Should not allow executing the same proposal twice", async function () {
      // Execute the proposal
      await governance.executeProposal(1);
      
      // Try to execute again
      await expect(governance.executeProposal(1))
        .to.be.revertedWith("AgentGov: proposal not succeeded");
    });
  });
});