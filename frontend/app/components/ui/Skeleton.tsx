'use client';

import { t } from '../../../lib/i18n';

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded ${className}`.trim()}
      style={{ background: 'var(--tg-theme-secondary-bg-color, #e5e7eb)' }}
      role="status"
      aria-label={t('loadingAria')}
    />
  );
}
