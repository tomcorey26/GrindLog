"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PressableButton } from "@/components/ui/pressable-button";

export function FinalCTASection() {
  return (
    <section className="py-16 sm:py-24 bg-card">
      <motion.div
        className="max-w-5xl mx-auto px-4 sm:px-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          Your first session starts now
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Free. No credit card. Just you and the clock.
        </p>
        <div className="mt-8">
          <PressableButton asChild size="lg">
            <Link href="/login">Get Started</Link>
          </PressableButton>
        </div>
      </motion.div>
    </section>
  );
}
