import { useState } from 'react';

type NavItem = { path: string; label: string; icon: string };

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'ダッシュボード', icon: '📊' },
  { path: '/posts', label: '投稿管理', icon: '✏️' },
  { path: '/knowledge', label: 'ナレッジ', icon: '📚' },
  { path: '/feedback', label: 'フィードバック', icon: '💬' },
  { path: '/engagement', label: 'エンゲージメント', icon: '🤝' },
  { path: '/performance', label: 'パフォーマンス', icon: '📈' },
  { path: '/competitors', label: '競合分析', icon: '🔍' },
  { path: '/settings', label: '設定', icon: '⚙️' },
];

function getPageTitle(path: string): string {
  if (path.startsWith('/posts/new')) return '新規投稿';
  if (path.startsWith('/posts/') && path !== '/posts') return '投稿編集';
  if (path.startsWith('/knowledge/new')) return '新規ナレッジ';
  if (path.startsWith('/knowledge/') && path !== '/knowledge') return 'ナレッジ編集';
  if (path === '/accounts') return 'アカウント管理';
  const item = NAV_ITEMS.find((n) => n.path === path);
  return item?.label ?? 'X Dashboard';
}

type Account = {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
};

export default function Layout({
  currentPath,
  onNavigate,
  accounts,
  currentAccount,
  onAccountChange,
  children,
}: {
  currentPath: string;
  onNavigate: (path: string) => void;
  accounts: Account[];
  currentAccount?: Account;
  onAccountChange: (accountId: string) => void;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return currentPath === '/';
    return currentPath.startsWith(path);
  };

  const handleNav = (path: string) => {
    onNavigate(path);
    setMobileOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gray-900 transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-gray-800 px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500 text-sm font-bold text-white">
            X
          </div>
          <span className="text-lg font-semibold text-white">X Dashboard</span>
        </div>

        {/* Account Switcher */}
        <div className="border-b border-gray-800 px-3 py-3">
          <div className="relative">
            <button
              onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
              className="flex w-full items-center gap-3 rounded-lg bg-gray-800 px-3 py-2.5 text-left transition-colors hover:bg-gray-700"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-sm font-bold text-green-400">
                {currentAccount?.display_name?.[0] ?? '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-200">
                  {currentAccount?.display_name ?? 'アカウント未選択'}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {currentAccount ? `@${currentAccount.username}` : ''}
                </p>
              </div>
              <svg
                className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${
                  accountDropdownOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {accountDropdownOpen && (
              <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl">
                {accounts.map((acct) => (
                  <button
                    key={acct.id}
                    onClick={() => {
                      onAccountChange(acct.id);
                      setAccountDropdownOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                      acct.id === currentAccount?.id
                        ? 'bg-green-500/10 text-green-400'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-700 text-xs font-bold text-gray-300">
                      {acct.display_name?.[0] ?? '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{acct.display_name}</p>
                      <p className="truncate text-xs text-gray-500">@{acct.username}</p>
                    </div>
                    {acct.id === currentAccount?.id && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-green-400" />
                    )}
                  </button>
                ))}
                <div className="border-t border-gray-700 mt-1 pt-1">
                  <button
                    onClick={() => {
                      handleNav('/accounts');
                      setAccountDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-xs">
                      +
                    </div>
                    <span>アカウント管理</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => handleNav(item.path)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(item.path)
                      ? 'bg-green-500/15 text-green-400'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                  {isActive(item.path) && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-green-400" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-xs text-gray-300">
              {currentAccount?.display_name?.[0] ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-200">
                {currentAccount?.display_name ?? '未選択'}
              </p>
              <p className="truncate text-xs text-gray-500">
                {currentAccount ? `@${currentAccount.username}` : ''}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">{getPageTitle(currentPath)}</h1>
          {currentAccount && (
            <span className="ml-auto rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
              @{currentAccount.username}
            </span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
