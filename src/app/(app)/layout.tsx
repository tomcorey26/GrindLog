import Image from "next/image";
import Link from "next/link";
import { Toaster } from "sonner";
import { Providers } from "@/components/Providers";
import { TabNav } from "@/components/TabNav";
import { LogoutButton } from "@/components/LogoutButton";
import { buttonVariants } from "@/components/ui/button";
import { CountdownAutoStop } from "@/components/CountdownAutoStop";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="h-dvh flex flex-col bg-background">
        <div className="max-w-md w-full mx-auto flex flex-col flex-1 min-h-0">
          <header className="px-4 pt-6 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image src="/icon.webp" alt="" width={28} height={28} />
              <h1 className="text-xl font-bold">10,000 Hours</h1>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/account"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                Account
              </Link>
              <LogoutButton />
            </div>
          </header>
          <div className="px-4 pb-2">
            <TabNav />
          </div>
          <main className="flex-1 min-h-0 overflow-auto flex flex-col py-0.5 px-4 pb-[env(safe-area-inset-bottom)]">
            {children}
          </main>
        </div>
        <Toaster position="top-center" />
        <CountdownAutoStop />
      </div>
    </Providers>
  );
}
