import TopBar from '@/components/layout/TopBar';
import CreateMarketForm from '@/components/markets/CreateMarketForm';

export default function Page(): JSX.Element {
  return (
    <>
      <TopBar eyebrow="Market Authoring" title="Create A New Prediction Market" />
      <main className="px-4 py-8 lg:px-10">
        <div className="my-5 max-w-5xl space-y-3">
          <CreateMarketForm />
        </div>
      </main>
    </>
  );
}
