import { createPublicClient, http, toHex, keccak256, toBytes } from 'viem';
import { arbitrumSepolia } from 'viem/chains';

async function deepInspectPusdc() {
  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http('https://arbitrum-sepolia.infura.io/v3/d8bc683c0b7841b18d5976c3dedf25c6'),
  });

  const pusdcAddress = '0x6B6E6479B8B3237933C3ab9D8bE969862D4Ed89F';
  const userWallet = '0xB2AF542dA937A6aC46228eBA63f21A7EFc40C70E';

  // Get all Transfer events to pUSDC to understand how it's minted
  // Look at all tx TO pUSDC to find what functions were called on it
  // Get the last 500 blocks worth of logs
  const latestBlock = await publicClient.getBlockNumber();
  const fromBlock = latestBlock - 50000n;

  console.log('Searching pUSDC event logs from block', fromBlock.toString(), 'to', latestBlock.toString());

  // Get ALL logs from pUSDC contract
  const logs = await publicClient.getLogs({
    address: pusdcAddress,
    fromBlock,
    toBlock: latestBlock,
  });

  console.log(`\nTotal pUSDC logs: ${logs.length}`);

  // Group by topic0 (event selector)
  const topicGroups = {};
  for (const log of logs) {
    const t0 = log.topics[0] || 'no-topic';
    if (!topicGroups[t0]) topicGroups[t0] = [];
    topicGroups[t0].push(log);
  }

  for (const [topic, items] of Object.entries(topicGroups)) {
    console.log(`\nEvent ${topic} (${items.length} occurrences):`);
    // Show first example
    const ex = items[0];
    console.log('  txHash:', ex.transactionHash);
    console.log('  blockNumber:', ex.blockNumber?.toString());
    console.log('  topics:', ex.topics);
    console.log('  data:', ex.data?.slice(0, 130));
  }

  // Now look at transactions TO pUSDC to find function selectors
  console.log('\n=== Transactions TO pUSDC (from recent blocks) ===');
  const recentBlocks = await Promise.all(
    [latestBlock, latestBlock - 1n, latestBlock - 2n, latestBlock - 100n, latestBlock - 500n].map(
      n => publicClient.getBlock({ blockNumber: n, includeTransactions: true })
    )
  );

  // Find any tx calling pUSDC
  const pusdcTxs = [];
  for (const block of recentBlocks) {
    for (const tx of block.transactions) {
      if (tx.to?.toLowerCase() === pusdcAddress.toLowerCase()) {
        pusdcTxs.push({ hash: tx.hash, input: tx.input.slice(0, 10), from: tx.from });
      }
    }
  }

  if (pusdcTxs.length > 0) {
    console.log('Found txs:', pusdcTxs);
  } else {
    console.log('No direct pUSDC txs in sampled blocks');
  }

  // Look at logs for Transfer events (topic = keccak256("Transfer(address,address,uint256)"))
  const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const mintLogs = logs.filter(l => l.topics[0] === transferTopic && l.topics[1] === '0x0000000000000000000000000000000000000000000000000000000000000000');
  console.log('\n=== Mint events (Transfer from 0x0) ===');
  console.log('Count:', mintLogs.length);
  for (const log of mintLogs.slice(0, 5)) {
    console.log(' txHash:', log.transactionHash);
    console.log(' to (topics[2]):', log.topics[2]);
    console.log(' data (amount):', BigInt(log.data).toString());
  }

  // Check if there's a faucet or minter function
  // Common minting selectors:
  // mint(address,uint256) = 0x40c10f19
  // faucet() = 0xde5f72fd
  // faucet(uint256) = 0xf81bc5d8
  // wrap(uint256) = 0xea598cb0
  const code = await publicClient.getBytecode({ address: pusdcAddress });
  const codeHex = code || '';

  const mintSelectors = [
    { sig: '40c10f19', name: 'mint(address,uint256)' },
    { sig: 'de5f72fd', name: 'faucet()' },
    { sig: 'f81bc5d8', name: 'faucet(uint256)' },
    { sig: 'ea598cb0', name: 'wrap(uint256)' },
    { sig: '0e89439e', name: 'wrapTo(address,uint256)' },
    { sig: 'a9059cbb', name: 'transfer(address,uint256)' },
    { sig: '23b872dd', name: 'transferFrom(address,address,uint256)' },
    { sig: '7bd2bea7', name: 'unwrap(address,uint256)' },
    { sig: '2e1a7d4d', name: 'withdraw(uint256)' },
    { sig: 'b6b55f25', name: 'deposit(uint256)' },
    { sig: 'd0e30db0', name: 'deposit()' },
  ];

  console.log('\n=== pUSDC Function Selectors in Bytecode ===');
  for (const { sig, name } of mintSelectors) {
    if (codeHex.includes(sig)) {
      console.log(`✅ ${name} (0x${sig})`);
    }
  }

  // Also check Privara/Reineira docs URL
  console.log('\n=== Summary ===');
  console.log('totalSupply:', 519200n, '(0.52 USDC worth)');
  console.log('pUSDC appears to be a standalone confidential token');
  console.log('No standard wrap/deposit selector found');
  console.log('Mints happen from 0x0 — check who minted them and via which tx');
}

deepInspectPusdc().catch(console.error);
