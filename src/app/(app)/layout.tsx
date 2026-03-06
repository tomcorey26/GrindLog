import { Providers } from '@/components/Providers';
import { TabNav } from '@/components/TabNav';
import { LogoutButton } from '@/components/LogoutButton';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="h-dvh flex flex-col bg-background">
        <div className="max-w-md w-full mx-auto flex flex-col flex-1 min-h-0">
          <header className="px-4 pt-6 pb-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">10,000 Hours</h1>
            <LogoutButton />
          </header>
          <div className="px-4 pb-2">
            <TabNav />
          </div>
          <main className="flex-1 min-h-0 overflow-auto flex flex-col px-4 pb-[env(safe-area-inset-bottom)]">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
