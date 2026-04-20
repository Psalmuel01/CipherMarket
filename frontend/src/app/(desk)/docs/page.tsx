import TopBar from '@/components/layout/TopBar';

const sections = [
  {
    title: 'What CipherMarket Is',
    body:
      'CipherMarket is a share-based prediction market. You buy or sell outcome shares that settle at 1 unit of collateral if they win and 0 if they lose.',
  },
  {
    title: 'How Pricing Works',
    body:
      'Each market uses a fixed-product market maker. Pool reserves, prices, and probabilities stay public so quotes remain understandable before you trade.',
  },
  {
    title: 'What Is Private In V1',
    body:
      'Your cumulative position is encrypted on-chain. Other users should not be able to read whether you hold shares, how many you hold, or which outcome you accumulated from contract storage.',
  },
  {
    title: 'What Stays Public',
    body:
      'Pool reserves, implied probabilities, total liquidity, market lifecycle state, and resolution status remain public. This keeps the market legible and preserves standard FPMM behavior.',
  },
  {
    title: 'Creating A Market',
    body:
      'A market creator defines the title, description, oracle source, outcomes, expiry, collateral, minimum trade, and total seed liquidity. Seed liquidity is split equally across outcomes at launch.',
  },
  {
    title: 'Trading Shares',
    body:
      'Choose an outcome, review the quote, then confirm the transaction in your wallet. Buy trades update the pool immediately while your personal position remains private.',
  },
  {
    title: 'Selling Shares',
    body:
      'Sell flows first verify your private balance, then execute against the current pool state. This means the exit path can take slightly longer than a normal public-only dApp.',
  },
  {
    title: 'Market Expiry And Resolution',
    body:
      'When a market expires, trading stops. A registered oracle can propose the final outcome using the listed source. That proposal enters a dispute window before finalization.',
  },
  {
    title: 'Disputes',
    body:
      'Anyone can dispute a proposed result by staking collateral during the dispute window. If the dispute succeeds, the refund path opens. If it fails, the dispute stake is not free.',
  },
  {
    title: 'How To Become An Oracle',
    body:
      'Go to the Oracle page, register with the minimum ETH stake, and keep your proposal discipline tight. If a disputed proposal is overturned, your stake can be slashed.',
  },
  {
    title: 'Redeeming Winnings',
    body:
      'After finalization, winning shares redeem 1:1 against the market collateral. You will need to verify your private winning balance before the claim completes.',
  },
  {
    title: 'Operational Notes',
    body:
      'Secure computation can add short delays to reveal, sell, and redeem flows. When the interface says it is verifying or decrypting, that is expected behavior rather than a frozen screen.',
  },
] as const;

export default function DocsPage(): JSX.Element {
  return (
    <>
      <TopBar eyebrow="Documentation" title="How CipherMarket Works" />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 lg:px-10">
        <section className="glass-card rounded-3xl p-8">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Private prediction markets, explained plainly
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
            CipherMarket is designed to feel like a normal prediction market at the pool level and
            a private system at the position level. You should be able to understand what the
            market is doing without exposing your own book.
          </p>
        </section>

        <section className="grid gap-4">
          {sections.map((section) => (
            <article key={section.title} className="glass-card rounded-3xl p-6">
              <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
                {section.title}
              </h3>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">{section.body}</p>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
