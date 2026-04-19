import Skeleton from '@/components/ui/Skeleton';

export default function Loading(): JSX.Element {
  return (
    <main className="space-y-8 px-4 py-8 lg:px-10">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-9 w-72 rounded-2xl" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-64 w-full rounded-3xl" />
        ))}
      </div>
    </main>
  );
}
