import TopBar from '@/components/layout/TopBar';
import CreateMarketForm from '@/components/markets/CreateMarketForm';

export default function Page(): JSX.Element {
  return (
    <>
      <TopBar eyebrow="Authoring" title="Create A New Prediction Market" />
      <main className="px-4 py-8 lg:px-10">
        <div className="max-w-5xl space-y-3">
          <p className="max-w-3xl text-sm leading-6 text-muted">
            The creation flow is staged into clear reviewable steps so market terms, outcomes, and
            oracle assumptions are explicit before any contract deployment begins.
          </p>
          <CreateMarketForm />
        </div>
      </main>
    </>
  );
}

