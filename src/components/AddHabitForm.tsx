'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function AddHabitForm({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onAdd(name.trim());
    setName('');
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input placeholder="New habit name..." value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
      <Button type="submit" disabled={loading || !name.trim()}>Add</Button>
    </form>
  );
}
