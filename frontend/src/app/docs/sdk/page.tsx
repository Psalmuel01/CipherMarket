import Link from 'next/link';

const INSTALL_EXAMPLE = `# local workspace
pnpm --filter frontend add @ciphermarket/sdk@workspace:*

# once published
pnpm add @ciphermarket/sdk viem @cofhe/sdk`;

const CLIENT_EXAMPLE = `import { createCipherMarketClient } from '@ciphermarket/sdk';

const client = createCipherMarketClient({
  chainId: 421614,
  publicClient,
  walletClient,
  cofheClient,
  account,
  addresses: {
    oracleRegistry,
    predictionMarket,
    reineiraDisputeEscrowAdapter,
    usdc,
  },
});`;

const MARKET_EXAMPLE = `const markets = await client.markets.list();
const market = await client.markets.get(1);
const reserves = await client.markets.getPools(1, Number(market.outcomeCount));`;

const QUOTE_EXAMPLE = `const quote = await client.quotes.buy({
  marketId: 1,
  outcomeIndex: 0,
  amount: 5_000_000n, // 5 USDC
});`;

const TRADE_EXAMPLE = `await client.trading.buyShares({
  marketId: 1,
  outcomeIndex: 0,
  collateralAmount: 5_000_000n,
  minSharesOut: quote.sharesAmount,
  collateralToken: usdc,
});

await client.trading.sellShares({
  marketId: 1,
  outcomeIndex: 0,
  sharesIn: 2_000_000n,
  minCollateralOut: 1n,
});`;

const PORTFOLIO_EXAMPLE = `const positions = await client.portfolio.revealPositions(markets, account);
const redeemable = client.portfolio.getRedeemable(markets, positions);
const realized = await client.portfolio.getRealized(markets, account);`;

const REDEEM_EXAMPLE = `await client.redemption.redeemWinningShares({
  marketId: 1,
  finalOutcomeIndex: 0,
});`;

const DISPUTE_EXAMPLE = `await client.disputes.openDirect({
  marketId: 1,
  counterOutcomeIndex: 1,
  stakeAmount: 10_000_000n,
  collateralToken: usdc,
});

await client.disputes.openWithReineira({
  marketId: 1,
  counterOutcomeIndex: 1,
  stakeAmount: 10_000_000n,
  collateralToken: usdc,
});`;

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/30 p-5 text-[12px] leading-6 text-white/60">
      <code>{code}</code>
    </pre>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-28">
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#e8533a]">{eyebrow}</p>
      <h2 className="mt-3 font-serif text-[28px] italic tracking-[-0.02em] text-[#e8e4df]">{title}</h2>
      <div className="mt-5 space-y-5 text-[14px] leading-[1.85] text-white/45">{children}</div>
    </section>
  );
}

export default function SdkDocsPage() {
  return (
    <div className="relative z-10 mx-auto max-w-[82%] px-8 py-16 font-sans lg:px-16">
      <div className="mb-14 flex flex-col gap-6 border-b border-white/[0.07] pb-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="">
          {/* <Link href="/docs" className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white/60">
            Back to docs
          </Link> */}
          <h1 className="mt-10 text-[28px] leading-[0.95] tracking-[-0.04em] text-[#e8e4df] lg:text-[48px]">
            <span className="font-serif italic">CipherMarket</span>
            {/* <br /> */}
            <span className="ml-5 font-light text-white/35">SDK</span>
          </h1>
          <p className="mt-6 max-w-[680p text-base leading-[1.85] text-white/45">
            Use `@ciphermarket/sdk` to integrate markets, quotes, encrypted portfolio reveal, trading, redemption, and disputes.
          </p>
        </div>

        
      </div>

      <div className="mt-20 grid gap-14 lg:grid-cols-[240px_1fr] lg:gap-20">
        <aside className="hidden lg:block">
          <nav className="sticky top-28 flex flex-col gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-white/30">
            <Link href="/docs" className="mb-4 text-white/45 hover:text-[#e8533a]">
              Market docs
            </Link>
            {['Install', 'Client', 'Markets', 'Quotes', 'Trading', 'Portfolio', 'Redeem', 'Disputes', 'Notes'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-[#e8533a]">
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <main className="space-y-20">
          <Section eyebrow="Install" title="Add the package">
            <p>
              Inside this monorepo the SDK is consumed as a workspace package. After publishing,
              external apps can install it from npm with `viem` and `@cofhe/sdk` as peer dependencies.
            </p>
            <CodeBlock code={INSTALL_EXAMPLE} />
          </Section>

          <Section eyebrow="Client" title="Create a protocol client">
            <p>
              The SDK is framework-agnostic. It does not connect wallets or own UI state. Pass your
              viem public client, optional wallet client, optional CoFHE client, account, and deployed addresses.
            </p>
            <CodeBlock code={CLIENT_EXAMPLE} />
          </Section>

          <Section eyebrow="Markets" title="Read markets and pools">
            <p>
              Market reads return raw protocol data plus normalized helpers for labels, collateral symbols,
              lifecycle state, probabilities, liquidity, and trade volume.
            </p>
            <CodeBlock code={MARKET_EXAMPLE} />
          </Section>

          <Section eyebrow="Quotes" title="Generate buy and sell previews">
            <p>
              Quote helpers normalize the contract tuple into collateral amount, shares amount, fees,
              average price, slippage basis points, and post-trade probabilities.
            </p>
            <CodeBlock code={QUOTE_EXAMPLE} />
          </Section>

          <Section eyebrow="Trading" title="Buy and sell shares">
            <p>
              `buyShares` handles ERC20 approval when needed. `sellShares` reads the encrypted position
              handle, requests a CoFHE decrypt-for-transaction result, and submits the signature for on-chain verification.
            </p>
            <CodeBlock code={TRADE_EXAMPLE} />
          </Section>

          <Section eyebrow="Portfolio" title="Reveal encrypted positions">
            <p>
              Portfolio helpers reveal current encrypted shares with CoFHE, fetch remaining invested amounts,
              identify redeemable finalized markets, and fetch realized redemption history.
            </p>
            <CodeBlock code={PORTFOLIO_EXAMPLE} />
          </Section>

          <Section eyebrow="Redeem" title="Claim finalized winning shares">
            <p>
              Redemption uses the same decrypt-for-transaction authorization model as selling. The SDK
              returns the transaction hash and the decrypted redeemed amount.
            </p>
            <CodeBlock code={REDEEM_EXAMPLE} />
          </Section>

          <Section eyebrow="Disputes" title="Open direct or Reineira disputes">
            <p>
              Direct disputes stake collateral in `PredictionMarket`. Reineira disputes create and fund an
              encrypted USDC escrow, then the adapter registers the dispute against the market.
            </p>
            <CodeBlock code={DISPUTE_EXAMPLE} />
          </Section>

          <Section eyebrow="Notes" title="Current integration status">
            <p>
              The SDK is ready for local workspace consumers and git-based integrations. A normal third-party
              `npm install @ciphermarket/sdk` flow requires publishing the package first.
            </p>
            <p>
              The frontend currently uses the SDK for shared helpers plus quote, buy, sell, redeem, and dispute
              flows. React Query, toasts, pending transaction state, wallet connection, and UI remain in the app.
            </p>
          </Section>
        </main>
      </div>
    </div>
  );
}
