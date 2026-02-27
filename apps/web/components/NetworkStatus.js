'use client';

import { useState, useEffect } from 'react';
import { useNetworkStatus } from '../lib/hooks';
import { WifiIcon, SignalSlashIcon } from '@heroicons/react/24/outline';

export default function NetworkStatus() {
  const { isOnline } = useNetworkStatus();
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowOnlineToast(false);
    } else if (wasOffline) {
      // 从离线恢复到在线，显示恢复提示
      setShowOnlineToast(true);
      const timer = setTimeout(() => {
        setShowOnlineToast(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // 离线状态提示条
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2 animate-in slide-in-from-top">
        <SignalSlashIcon className="h-4 w-4" />
        <span>网络已断开，请检查网络连接</span>
      </div>
    );
  }

  // 网络恢复提示
  if (showOnlineToast) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-green-500 text-white px-4 py-2 text-center text-sm flex items-center justify-center gap-2 animate-in slide-in-from-top">
        <WifiIcon className="h-4 w-4" />
        <span>网络已恢复</span>
      </div>
    );
  }

  return null;
}
