import { Toaster } from 'sonner';
import { Providers } from '@/components/Providers';

export default function TimerLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="h-dvh flex flex-col bg-background">
        <main className="flex-1 flex flex-col min-h-0 items-center px-4 pb-[env(safe-area-inset-bottom)]">
          <div className="w-full md:max-w-md flex flex-col flex-1 min-h-0">
            {children}
          </div>
        </main>
        <Toaster position="top-center" />
      </div>
    </Providers>
  );
}
