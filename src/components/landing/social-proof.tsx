"use client";

import { motion } from "framer-motion";

const stats = [
  { number: "10,000", label: "The hours it takes to master a skill" },
  { number: "66", label: "Average days to form a new habit" },
  { number: "1", label: "The only session you need today" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function SocialProofSection() {
  return (
    <section className="py-16 sm:py-24">
      <motion.div
        className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-12 text-center"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-100px" }}
      >
        {stats.map((stat) => (
          <motion.div key={stat.number} variants={item}>
            <p className="text-5xl sm:text-6xl font-mono font-bold text-primary">
              {stat.number}
            </p>
            <p className="mt-3 text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
