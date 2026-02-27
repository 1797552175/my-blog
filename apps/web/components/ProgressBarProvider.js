'use client';

import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';

export default function ProgressBarProvider({ children }) {
  return (
    <>
      {children}
      <ProgressBar
        height="3px"
        color="#4f46e5"
        options={{ showSpinner: false }}
        shallowRouting
      />
    </>
  );
}
