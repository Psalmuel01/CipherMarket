import hre from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
  const network = hre.network.name;
  if (network === 'hardhat' || network === 'localhost') {
    console.log('❌ Cannot verify on local Hardhat/localhost network.');
    return;
  }

  const addressesPath = path.join(__dirname, '../deployed-addresses.json');
  if (!fs.existsSync(addressesPath)) {
    console.error('❌ Deployed addresses file not found! Deploy first by running:');
    console.error('   npx hardhat run scripts/deploy.ts --network ' + network);
    return;
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  console.log('══════════════════════════════════════');
  console.log('  CipherMarket — Contract Verification ');
  console.log('══════════════════════════════════════');
  console.log(`  Network: ${network}`);
  console.log('');

  // 1. Verify OracleRegistry
  try {
    console.log(`\n[OracleRegistry] Verifying ${addresses.oracleRegistry}...`);
    await hre.run('verify:verify', {
      address: addresses.oracleRegistry,
      constructorArguments: [hre.ethers.parseEther('1')],
    });
    console.log('✅ OracleRegistry verified!');
  } catch (error: any) {
    console.log(`⚠️ OracleRegistry verification failed: ${error.message}`);
  }

  // 2. Verify PredictionMarketMath
  try {
    console.log(`\n[PredictionMarketMath] Verifying ${addresses.predictionMarketMath}...`);
    await hre.run('verify:verify', {
      address: addresses.predictionMarketMath,
      constructorArguments: [],
    });
    console.log('✅ PredictionMarketMath verified!');
  } catch (error: any) {
    console.log(`⚠️ PredictionMarketMath verification failed: ${error.message}`);
  }

  // 3. Verify PredictionMarket
  try {
    console.log(`\n[PredictionMarket] Verifying ${addresses.predictionMarket}...`);
    await hre.run('verify:verify', {
      address: addresses.predictionMarket,
      constructorArguments: [addresses.oracleRegistry, 5 * 60],
    });
    console.log('✅ PredictionMarket verified!');
  } catch (error: any) {
    console.log(`⚠️ PredictionMarket verification failed: ${error.message}`);
  }

  // 4. Verify ReineiraDisputeEscrowAdapter
  if (addresses.reineiraAdapter && addresses.reineiraEscrow) {
    try {
      console.log(`\n[ReineiraDisputeEscrowAdapter] Verifying ${addresses.reineiraAdapter}...`);
      await hre.run('verify:verify', {
        address: addresses.reineiraAdapter,
        constructorArguments: [addresses.predictionMarket, addresses.reineiraEscrow],
      });
      console.log('✅ ReineiraDisputeEscrowAdapter verified!');
    } catch (error: any) {
      console.log(`⚠️ ReineiraDisputeEscrowAdapter verification failed: ${error.message}`);
    }
  } else {
    console.log('\n[ReineiraDisputeEscrowAdapter] Skipping (not deployed or no escrow address).');
  }

  console.log('\n✅ Verification process finished!');
}

main().catch((error) => {
  console.error('\n❌ Verification task failed:\n', error);
  process.exitCode = 1;
});
