import { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Posts from './pages/Posts';
import PostEditor from './pages/PostEditor';
import Knowledge from './pages/Knowledge';
import KnowledgeEditor from './pages/KnowledgeEditor';
import Feedback from './pages/Feedback';
import Engagement from './pages/Engagement';
import Performance from './pages/Performance';
import Competitors from './pages/Competitors';
import Settings from './pages/Settings';
import AccountManager from './pages/AccountManager';
import api from './lib/api';

function getHash(): string {
  return window.location.hash.replace(/^#/, '') || '/';
}

type Account = {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  character_definition?: string;
  genre_config?: string;
};

export default function App() {
  const [path, setPath] = useState(getHash);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<string | undefined>(undefined);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
    setPath(to);
  }, []);

  useEffect(() => {
    const onHash = () => setPath(getHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Load accounts on mount
  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try { await api.accounts.seed(); } catch {}
    try {
      const data = await api.accounts.list();
      setAccounts(data ?? []);
      if (data && data.length > 0 && !currentAccountId) {
        setCurrentAccountId(data[0].id);
      }
    } catch {
      setAccounts([]);
    }
  }

  const currentAccount = accounts.find((a) => a.id === currentAccountId);

  const renderPage = () => {
    if (path === '/') return <Dashboard onNavigate={navigate} accountId={currentAccountId} />;
    if (path === '/posts') return <Posts onNavigate={navigate} accountId={currentAccountId} />;
    if (path === '/posts/new') return <PostEditor onNavigate={navigate} accountId={currentAccountId} />;
    if (path.startsWith('/posts/') && path !== '/posts') {
      const id = path.split('/posts/')[1];
      return <PostEditor id={id} onNavigate={navigate} accountId={currentAccountId} />;
    }
    if (path === '/knowledge') return <Knowledge onNavigate={navigate} accountId={currentAccountId} />;
    if (path === '/knowledge/new') return <KnowledgeEditor onNavigate={navigate} accountId={currentAccountId} />;
    if (path.startsWith('/knowledge/') && path !== '/knowledge') {
      const id = path.split('/knowledge/')[1];
      return <KnowledgeEditor id={id} onNavigate={navigate} accountId={currentAccountId} />;
    }
    if (path === '/feedback') return <Feedback accountId={currentAccountId} />;
    if (path === '/engagement') return <Engagement accountId={currentAccountId} />;
    if (path === '/performance') return <Performance accountId={currentAccountId} />;
    if (path === '/competitors') return <Competitors accountId={currentAccountId} onNavigate={navigate} />;
    if (path === '/settings') return <Settings accountId={currentAccountId} />;
    if (path === '/accounts') return <AccountManager onNavigate={navigate} onAccountsChange={loadAccounts} />;
    return <Dashboard onNavigate={navigate} accountId={currentAccountId} />;
  };

  return (
    <Layout
      currentPath={path}
      onNavigate={navigate}
      accounts={accounts}
      currentAccount={currentAccount}
      onAccountChange={(id) => setCurrentAccountId(id)}
    >
      {renderPage()}
    </Layout>
  );
}
