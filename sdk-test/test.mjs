// run with `node test.mjs`

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

    const client = createCipherMarketClient({
      chainId: 421614,
      publicClient,
      walletClient: undefined,
      cofheClient: undefined,
      account: "0x0489DB67c9B49C1C813da3C538103926f31BE572",
      addresses: {
        oracleRegistry: "0xD9228DFca1D1B857662Fe2D21DE50811f4EB10Eb",
        predictionMarket: "0x3104BA276c43da54551875d18E3a43AB3124F26C",
        reineiraDisputeEscrowAdapter: "0x9Adb49cF84D3720185620e6f09B102d29ae5434c",
        usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      },
    });

    console.log("Client created ✔");

    const markets = await client.markets.list();

    console.log(`Fetched ${markets.length} markets ✔`);

    console.log(safeStringify(markets));
  } catch (err) {
    console.error("SDK test failed ❌");
    console.error(err);
  }
}

main();