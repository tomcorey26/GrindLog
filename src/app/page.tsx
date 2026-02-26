'use client';

import { useEffect, useState } from 'react';
import { AuthForm } from '@/components/AuthForm';
import { Dashboard } from '@/components/Dashboard';

export default function Home() {
  const [user, setUser] = useState<{ id: number; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  async function checkAuth() {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    } else {
      setUser(null);
    }
    setLoading(false);
  }

  useEffect(() => { checkAuth(); }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Loading...</p>
    </div>;
  }

  if (!user) return <AuthForm onSuccess={checkAuth} />;
  return <Dashboard user={user} onLogout={checkAuth} />;
}
