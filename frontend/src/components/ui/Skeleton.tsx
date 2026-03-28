import clsx from 'clsx';

export interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className }: SkeletonProps): JSX.Element {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-md bg-white/[0.04]',
        'before:absolute before:inset-y-0 before:left-0 before:w-1/2 before:bg-white/10 before:content-[""] before:animate-shimmer',
        className,
      )}
    />
  );
}

