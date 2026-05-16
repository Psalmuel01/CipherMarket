import clsx from 'clsx';

export interface SkeletonProps {
  className?: string;
  /** Adds shimmer animation */
  animate?: boolean;
}

export default function Skeleton({
  className,
  animate = true,
}: SkeletonProps): JSX.Element {
  return (
    <div
      className={clsx(
        'rounded-lg bg-white/[0.04]',
        animate && 'shimmer',
        className,
      )}
    />
  );
}
