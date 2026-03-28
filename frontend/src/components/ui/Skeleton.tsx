import clsx from 'clsx';

export interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps): JSX.Element {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-xl bg-muted/40',
        className
      )}
    />
  );
}
