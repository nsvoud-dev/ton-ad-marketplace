'use client';

type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeMap = { sm: 16, md: 24, lg: 32 };

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const px = sizeMap[size];
  return (
    <div
      className={className}
      style={{
        display: 'inline-block',
        width: px,
        height: px,
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
      role="status"
      aria-label="Loading"
    />
  );
}
