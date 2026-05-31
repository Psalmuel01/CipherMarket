// run with `node test-sdk.mjs`
import { config } from "dotenv";
config();

import { createCipherMarketClient } from "@ciphermarket/sdk";
import { createPublicClient, http } from "viem";
import { arbitrumSepolia } from "viem/chains";

const safeStringify = (data) =>
  JSON.stringify(
    data,
    (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    2
  );

async function main() {
  try {
    const publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(),
    });

    // Basic connectivity + sanity check

    const client = createCipherMarketClient({
      chainId: 421614,
      publicClient,
      walletClient: undefined,
      cofheClient: undefined,
      account: process.env.TEST_WALLET_ADDRESS,
      addresses: {
        oracleRegistry: process.env.ORACLE_REGISTRY_ADDRESS,
        predictionMarket: process.env.PREDICTION_MARKET_ADDRESS,
        reineiraDisputeEscrowAdapter: process.env.REINEIRA_DISPUTE_ESCROW_ADAPTER_ADDRESS,
        usdc: process.env.USDC_ADDRESS,
      },
    });

    console.log("Client created ✔");

    const markets = await client.markets.list();
    console.log(`✔ Markets loaded: ${markets.length}`);
    // console.log(safeStringify(markets));

    const sampleMarket = markets[0];
    console.log("SAMPLE MARKET:");
    console.log(safeStringify(sampleMarket));


    // Market detail stress test
    console.log("\n✔ Testing market.get + pool consistency");

    const fullMarket = await client.markets.get(sampleMarket.marketId);
    const pools = await client.markets.getPools(
      sampleMarket.marketId,
      Number(fullMarket.outcomeCount)
    );

    console.log("Market:");
    console.log(safeStringify(fullMarket));

    console.log("Pools:");
    console.log(safeStringify(pools));

    // Quote engine test (FPMM sanity)

    console.log("\n✔ Testing quote engine");

    const buyQuote = await client.quotes.buy({
      marketId: sampleMarket.marketId,
      outcomeIndex: 0,
      amount: 5_000_000_000_000_000_00n,
    });

    const sellQuote = await client.quotes.sell({
      marketId: sampleMarket.marketId,
      outcomeIndex: 0,
      amount: 1_000_000_000_000_000_00n,
    });

    console.log("BUY QUOTE:");
    console.log(safeStringify(buyQuote));

    console.log("SELL QUOTE:");
    console.log(safeStringify(sellQuote));

    console.log("SDK test passed ✅");
  } catch (err) {
    console.error("SDK test failed ❌");
    console.error(err);
  }
}

main();