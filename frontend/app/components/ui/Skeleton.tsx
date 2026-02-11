'use client';

import { t } from '../../../lib/i18n';

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`.trim()}
      role="status"
      aria-label={t('loadingAria')}
    />
  );
}
