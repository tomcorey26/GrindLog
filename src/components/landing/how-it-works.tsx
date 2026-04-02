"use client";

import { motion } from "framer-motion";

const steps = [
  {
    number: "1",
    title: "Build your routine",
    description:
      "Pick your skills. Set durations. Stack them into a daily practice plan.",
  },
  {
    number: "2",
    title: "Hit play",
    description:
      "Work through your routine session by session. Timer keeps you honest.",
  },
  {
    number: "3",
    title: "Watch the hours stack up",
    description:
      "Streaks, heat maps, rankings. Your effort, visualized.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function HowItWorksSection() {
  return (
    <section className="py-16 sm:py-24 bg-card">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <motion.h2
          className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          How it works
        </motion.h2>
        <motion.div
          className="flex flex-col sm:flex-row gap-8 sm:gap-12"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              className="flex-1 flex flex-col items-center text-center"
              variants={item}
            >
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mb-4">
                {step.number}
              </div>
              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute" />
              )}
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
