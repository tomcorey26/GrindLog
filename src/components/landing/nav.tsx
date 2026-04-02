import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-sm bg-background/80 border-b border-border/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/icon.webp" alt="10k Hours" width={28} height={28} />
          <span className="font-mono font-semibold text-foreground">
            10,000 Hours
          </span>
        </Link>
        <Button asChild size="sm">
          <Link href="/login">Get Started</Link>
        </Button>
      </div>
    </nav>
  );
}
