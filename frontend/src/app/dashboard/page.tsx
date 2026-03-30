import TopBar from '@/components/layout/TopBar';
import MarketList from '@/components/markets/MarketList';

export default function DashboardPage(): JSX.Element {
  return (
    <>
      <TopBar eyebrow="Order Flow" title="Explore Markets" />
      <main className="px-4 py-8 lg:px-10">
        <MarketList
          description="Browse active and pending private markets."
          heading="Explore markets"
        />
      </main>
    </>
  );
}
