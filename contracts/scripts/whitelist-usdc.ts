import { ethers } from "hardhat";

async function main() {
  const predictionMarketAddress = "0xB337fC04B8A146c93bCC7b57229Cc8cb18c03fd6";
  const usdcAddress = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
  const mathLibAddress = "0x111004038F8e918a02CD760E2E2630E0C9E789d6";

  const PredictionMarket = await ethers.getContractFactory("PredictionMarket", {
    libraries: {
      PredictionMarketMath: mathLibAddress,
    },
  });
  const market = PredictionMarket.attach(predictionMarketAddress);

  console.log(`Whitelisting USDC ${usdcAddress} on PredictionMarket ${predictionMarketAddress}...`);
  const tx = await market.setAcceptedCollateral(usdcAddress, true);
  console.log(`Tx hash: ${tx.hash}`);
  await tx.wait();
  console.log("Whitelisted successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
