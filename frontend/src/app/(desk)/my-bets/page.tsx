import dynamic from 'next/dynamic';
import Skeleton from '@/components/ui/Skeleton';

const MyBetsPage = dynamic(() => import('@/components/portfolio/MyBetsPage'), {
  ssr: false,
  loading: () => (
    <main className="space-y-8 px-4 py-8 lg:px-10">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="h-9 w-64 rounded-2xl" />
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-3xl" />
    </main>
  ),
});

export default function Page(): JSX.Element {
  return <MyBetsPage />;
}
