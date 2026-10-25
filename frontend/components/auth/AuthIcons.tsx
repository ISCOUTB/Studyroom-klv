import React from 'react';

type IconProps = { className?: string };

export const IconMail = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="m3.8 7.5 8.2 5.4 8.2-5.4" />
  </svg>
);

export const IconLock = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3" />
  </svg>
);

export const IconEye = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M2.6 12S6.2 5.6 12 5.6 21.4 12 21.4 12 17.8 18.4 12 18.4 2.6 12 2.6 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);

export const IconEyeOff = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M3.5 3.5l17 17" />
    <path d="M10.2 5.9A10 10 0 0 1 12 5.6c5.8 0 9.4 6.4 9.4 6.4a17.6 17.6 0 0 1-3.4 4.2" />
    <path d="M6.5 7.9A17.3 17.3 0 0 0 2.6 12s3.6 6.4 9.4 6.4c1.2 0 2.3-.25 3.3-.7" />
    <path d="M9.9 10a2.8 2.8 0 0 0 4.1 4.1" />
  </svg>
);

export const IconCheckCircle = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.2 2.6 2.6L16.2 9" />
  </svg>
);

export const IconAlertCircle = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5" />
    <path d="M12 16.2h.01" />
  </svg>
);

export const IconArrowRight = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M4 12h15" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);
