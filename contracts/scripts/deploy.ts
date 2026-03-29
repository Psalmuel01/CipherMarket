import hre from 'hardhat';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';

/**
 * Deployment metadata for a deployed contract.
 */
interface DeploymentResult {
  address: string;
  txHash: string;
}

/**
 * Deploys a named contract and returns the deployment metadata.
 * @param runtime The Hardhat runtime environment.
 * @param contractName The contract to deploy.
 * @param args Constructor arguments.
 * @returns The deployed address and deployment transaction hash.
 */
async function deployContract(
  runtime: HardhatRuntimeEnvironment,
  contractName: string,
  args: unknown[] = [],
): Promise<DeploymentResult> {
  const factory = await runtime.ethers.getContractFactory(contractName);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();

  const deploymentTransaction = contract.deploymentTransaction();

  if (!deploymentTransaction) {
    throw new Error(`Deployment transaction was not created for ${contractName}.`);
  }

  return {
    address: await contract.getAddress(),
    txHash: deploymentTransaction.hash,
  };
}

/**
 * Deploys the FHESmoke contract and returns the deployment metadata.
 * @param runtime The Hardhat runtime environment.
 * @returns The deployed address and deployment transaction hash.
 */
export async function deployFHESmoke(
  runtime: HardhatRuntimeEnvironment,
): Promise<DeploymentResult> {
  return deployContract(runtime, 'FHESmoke');
}

async function main(): Promise<void> {
  const oracleRegistry = await deployContract(hre, 'OracleRegistry', [hre.ethers.parseEther('1')]);
  const predictionMarket = await deployContract(hre, 'PredictionMarket', [
    oracleRegistry.address,
    1 days,
  ]);
  const mockUsdc = await deployContract(hre, 'MockUSDC');
  const fheSmoke = await deployFHESmoke(hre);

  const registry = await hre.ethers.getContractAt('OracleRegistry', oracleRegistry.address);
  const market = await hre.ethers.getContractAt('PredictionMarket', predictionMarket.address);
  await (await registry.setPredictionMarket(predictionMarket.address)).wait();
  await (await market.setAcceptedCollateral(mockUsdc.address, true)).wait();

  console.info(`OracleRegistry deployed to ${oracleRegistry.address}`);
  console.info(`OracleRegistry deployment tx hash: ${oracleRegistry.txHash}`);
  console.info(`PredictionMarket deployed to ${predictionMarket.address}`);
  console.info(`PredictionMarket deployment tx hash: ${predictionMarket.txHash}`);
  console.info(`MockUSDC deployed to ${mockUsdc.address}`);
  console.info(`MockUSDC deployment tx hash: ${mockUsdc.txHash}`);
  console.info(`FHESmoke deployed to ${fheSmoke.address}`);
  console.info(`FHESmoke deployment tx hash: ${fheSmoke.txHash}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
