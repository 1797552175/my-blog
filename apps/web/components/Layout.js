'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, Fragment } from 'react';
import { SunIcon, MoonIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { Transition, Menu } from '@headlessui/react';
import { getCurrentUser, logout } from '../services/auth';
import { ToastProvider } from './Toast';
import NetworkStatus from './NetworkStatus';


function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Layout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  // 初始化时直接从localStorage获取用户信息，避免首次渲染显示错误
  const [user, setUser] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
    } else {
      setDarkMode(false);
    }
    
    const currentUser = getCurrentUser();
    setUser(currentUser);
    
    // 监听localStorage变化，当用户信息或token变化时更新状态
    const handleStorageChange = (event) => {
      if (event.key === 'user' || event.key === 'token') {
        const updatedUser = getCurrentUser();
        setUser(updatedUser);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (isMounted) {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  }, [darkMode, isMounted]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleLogout = () => {
    logout();
    // 直接更新本地状态，不需要刷新页面
    setUser(null);
    router.push('/');
  };

  const navLinks = [
    { name: '首页', href: '/' },
    { name: '小说库', href: '/stories' },
    { name: '写小说', href: '/write' },
  ];

  // 不再返回 null，而是始终渲染内容，避免首屏白屏
  // 使用 suppressHydrationWarning 避免 hydration 不匹配警告

  return (
    <ToastProvider>
      <NetworkStatus />
      <div suppressHydrationWarning className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <Link href="/" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  AiNovel
                </Link>
                <nav className="hidden md:flex space-x-6">
                  {navLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={classNames(
                        'text-sm font-medium transition-colors',
                        link.highlight
                          ? 'text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300'
                          : pathname === link.href
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                      )}
                    >
                      {link.name}
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="flex items-center space-x-4">
                <button onClick={toggleDarkMode} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                  {darkMode ? <SunIcon className="h-6 w-6 text-yellow-400" /> : <MoonIcon className="h-6 w-6 text-gray-600" />}
                </button>

                {isMounted && user ? (
                  <Menu as="div" className="relative">
                    <Menu.Button className="flex items-center space-x-2">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-300">{user.username.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-300">{user.username}</span>
                    </Menu.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <Link href="/me/stories" className={classNames(active ? 'bg-gray-100 dark:bg-gray-700' : '', 'block px-4 py-2 text-sm text-gray-700 dark:text-gray-200')}>我的小说</Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link href="/me/reads" className={classNames(active ? 'bg-gray-100 dark:bg-gray-700' : '', 'block px-4 py-2 text-sm text-amber-600 dark:text-amber-400')}>我的阅读</Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <Link href="/me/settings" className={classNames(active ? 'bg-gray-100 dark:bg-gray-700' : '', 'block px-4 py-2 text-sm text-gray-700 dark:text-gray-200')}>账号设置</Link>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button onClick={handleLogout} className={classNames(active ? 'bg-gray-100 dark:bg-gray-700' : '', 'w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-200')}>退出登录</button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                ) : isMounted ? (
                  <div className="hidden md:flex items-center space-x-2">
                    <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">登录</Link>
                    <Link href="/register" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">注册</Link>
                  </div>
                ) : null}

                <div className="md:hidden">
                  <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-md text-gray-400">
                    {mobileMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <Transition
            show={mobileMenuOpen}
            as="div"
            className="md:hidden"
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <div className="pt-2 pb-3 space-y-1 px-2 bg-white dark:bg-gray-800 shadow-lg">
              {navLinks.map((link) => (
                <Link key={link.name} href={link.href} className={classNames('block px-3 py-2 rounded-md text-base font-medium', pathname === link.href ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300')} onClick={() => setMobileMenuOpen(false)}>{link.name}</Link>
              ))}
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                {isMounted && user ? (
                  <div className="px-2 space-y-1">
                      <Link href="/me/stories" className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300" onClick={() => setMobileMenuOpen(false)}>我的小说</Link>
                      <Link href="/me/reads" className="block px-3 py-2 rounded-md text-base font-medium text-amber-600 dark:text-amber-400 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setMobileMenuOpen(false)}>我的阅读</Link>
                      <Link href="/me/settings" className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300" onClick={() => setMobileMenuOpen(false)}>账号设置</Link>
                      <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">退出登录</button>
                  </div>
                ) : isMounted ? (
                  <div className="px-2 space-y-1">
                      <Link href="/login" className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300" onClick={() => setMobileMenuOpen(false)}>登录</Link>
                      <Link href="/register" className="block px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300" onClick={() => setMobileMenuOpen(false)}>注册</Link>
                  </div>
                ) : null}
              </div>
            </div>
          </Transition>
        </header>

        <main className="flex-1 w-full flex flex-col">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}