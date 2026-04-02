"use client";

import { motion } from "framer-motion";
import { ListChecks, Timer, Flame, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: ListChecks,
    title: "Build your routine",
    description:
      "Stack your skills into daily routines. Guitar, then coding, then reading — like sets in a workout.",
  },
  {
    icon: Timer,
    title: "Time every session",
    description:
      "Stopwatch for flow state. Countdown for focused blocks. Just hit play.",
  },
  {
    icon: Flame,
    title: "Never break the chain",
    description:
      "Daily streaks keep you accountable. Show up, log your time, keep the fire going.",
  },
  {
    icon: Trophy,
    title: "Track your mastery",
    description:
      "See your skills ranked by hours. Calendar heat maps. Watch mastery get closer.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function FeaturesSection() {
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.h2
          className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Everything you need to build a practice habit
        </motion.h2>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-6"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={item}>
              <Card className="h-full">
                <CardContent className="pt-6">
                  <feature.icon className="w-10 h-10 text-primary mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
