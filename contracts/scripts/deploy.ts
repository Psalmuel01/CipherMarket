import hre from 'hardhat';
import type { HardhatRuntimeEnvironment } from 'hardhat/types';

/**
 * Deploys the FHESmoke contract and returns the deployment metadata.
 * @param runtime The Hardhat runtime environment.
 * @returns The deployed address and deployment transaction hash.
 */
export async function deployFHESmoke(
  runtime: HardhatRuntimeEnvironment,
): Promise<{ address: string; txHash: string }> {
  const factory = await runtime.ethers.getContractFactory('FHESmoke');
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const deploymentTransaction = contract.deploymentTransaction();

  if (!deploymentTransaction) {
    throw new Error('Deployment transaction was not created.');
  }

  return {
    address: await contract.getAddress(),
    txHash: deploymentTransaction.hash,
  };
}

async function main(): Promise<void> {
  const deployment = await deployFHESmoke(hre);

  console.info(`FHESmoke deployed to ${deployment.address}`);
  console.info(`FHESmoke deployment tx hash: ${deployment.txHash}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

