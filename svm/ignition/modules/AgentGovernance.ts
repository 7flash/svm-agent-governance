const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const AIAgentGovernanceModule = buildModule("AIAgentGovernanceModule", (m) => {
  // Configuration values - these can be overridden during deployment
  const tokenName = m.getParameter("tokenName", "AI Agent Governance Token");
  const tokenSymbol = m.getParameter("tokenSymbol", "AIGT");
  const initialTokenSupply = m.getParameter("initialTokenSupply", ethers.utils.parseEther("10000000")); // 10M tokens
  const initialPrompt = m.getParameter(
    "initialPrompt", 
    "You are an AI assistant that helps users with their queries in a helpful, harmless, and honest manner."
  );
  const votingPeriod = m.getParameter("votingPeriod", 40320); // ~1 week at 15s blocks
  const proposalThreshold = m.getParameter("proposalThreshold", ethers.utils.parseEther("100000")); // 100k tokens
  const quorumThreshold = m.getParameter("quorumThreshold", 1000); // 10% in basis points

  // Deploy the factory contract
  const governanceFactory = m.contract("AIAgentGovernanceFactory");

  // Use the factory to deploy the entire governance system
  const deploymentTx = m.call(
    governanceFactory,
    "deployGovernanceSystem",
    [
      tokenName,
      tokenSymbol,
      initialTokenSupply,
      initialPrompt,
      votingPeriod,
      proposalThreshold,
      quorumThreshold,
    ]
  );

  // Extract contract addresses from the deployment transaction
  const tokenAddress = m.getAddress(
    deploymentTx,
    "tokenAddress"
  );
  
  const promptAddress = m.getAddress(
    deploymentTx,
    "promptAddress"
  );
  
  const governanceAddress = m.getAddress(
    deploymentTx,
    "governanceAddress"
  );

  // Connect to the deployed contracts
  const token = m.contractAt("AgentToken", tokenAddress);
  const prompt = m.contractAt("AIAgentPrompt", promptAddress);
  const governance = m.contractAt("AIAgentGovernance", governanceAddress);

  // Return the deployed contracts for reference
  return {
    governanceFactory,
    token,
    prompt,
    governance,
    tokenAddress,
    promptAddress,
    governanceAddress
  };
});

module.exports = { AIAgentGovernanceModule };