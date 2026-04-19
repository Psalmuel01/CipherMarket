import TopBar from '@/components/layout/TopBar';
import MarketList from '@/components/markets/MarketList';

export default function DashboardPage(): JSX.Element {
  return (
    <>
      <TopBar eyebrow="Market Desk" title="Explore Markets" />
      <main className="px-4 py-8 lg:px-10">
        <MarketList
          description="Markets stay legible even when positions do not. Review probabilities, liquidity, and resolution state without exposing individual books."
          heading="Explore markets"
        />
      </main>
    </>
  );
}
