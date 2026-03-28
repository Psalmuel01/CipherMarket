import TopBar from '@/components/layout/TopBar';
import MarketList from '@/components/markets/MarketList';

export default function Page(): JSX.Element {
  return (
    <>
      <TopBar eyebrow="Order Flow" title="Private Market Terminal" />
      <main className="px-4 py-8 lg:px-10">
        <MarketList
          description="Browse active and pending private markets. Liquidity is public for market health; individual wallet positions stay sealed."
          heading="Encrypted market surface"
        />
      </main>
    </>
  );
}

