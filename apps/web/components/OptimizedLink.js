'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

export default function OptimizedLink({ href, children, prefetch = true, ...props }) {
  const linkRef = useRef(null);

  useEffect(() => {
    if (prefetch && linkRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            const link = linkRef.current;
            if (link && typeof window !== 'undefined' && 'requestIdleCallback' in window) {
              window.requestIdleCallback(() => {
                if (link) {
                  link.prefetch();
                }
              });
            }
            observer.disconnect();
          }
        },
        {
          rootMargin: '200px',
          threshold: 0.1,
        }
      );

      observer.observe(linkRef.current);

      return () => {
        if (linkRef.current) {
          observer.unobserve(linkRef.current);
        }
      };
    }
  }, [prefetch]);

  return (
    <Link
      ref={linkRef}
      href={href}
      prefetch={prefetch ? 'intent' : false}
      {...props}
    >
      {children}
    </Link>
  );
}
