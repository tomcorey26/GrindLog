"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PressableButton } from "@/components/ui/pressable-button";
import { Card } from "@/components/ui/card";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const ROW_COLORS = [
  "bg-primary/20",
  "bg-primary/30",
  "bg-primary/10",
];

const mockSkills = [
  { name: "Guitar", duration: "30 min" },
  { name: "Coding", duration: "45 min" },
  { name: "Reading", duration: "15 min" },
];

function RoutineMock() {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, scale: 0.95, rotate: -1 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <div className="max-w-xs mx-auto shadow-lg rounded-xl">
        <Card className="p-5">
          <p className="text-xs font-mono text-muted-foreground mb-1">MORNING ROUTINE</p>
          <p className="text-sm font-semibold text-foreground mb-4">Daily Practice</p>
          <div className="space-y-3">
            {mockSkills.map((skill, i) => (
              <div
                key={skill.name}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${ROW_COLORS[i]}`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/40 flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-foreground">{skill.name}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{skill.duration}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="text-sm font-mono font-semibold text-foreground">1h 30m</span>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

export function HeroSection() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          <motion.div
            className="flex-1 text-center lg:text-left"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <motion.h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground"
              variants={item}
            >
              Build a practice routine. Stick to it.
            </motion.h1>
            <motion.p
              className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0"
              variants={item}
            >
              A workout tracker, but for skills. Create routines for guitar,
              coding, art — anything you want to master. Track every session.
              Log the grind.
            </motion.p>
            <motion.div className="mt-8" variants={item}>
              <PressableButton asChild size="lg">
                <Link href="/login">Get Started</Link>
              </PressableButton>
            </motion.div>
          </motion.div>
          <div className="flex-1 w-full max-w-sm lg:max-w-none">
            <RoutineMock />
          </div>
        </div>
      </div>
    </section>
  );
}
