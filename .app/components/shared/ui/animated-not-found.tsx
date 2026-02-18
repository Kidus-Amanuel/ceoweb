"use client";

import { motion } from "framer-motion";
import { Rocket, Construction } from "lucide-react";

export function AnimatedNotFound() {
  return (
    <div className="relative mx-auto h-40 w-40">
      <motion.div
        animate={{
          rotate: [0, 10, -10, 0],
          y: [0, -5, 5, 0],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-full w-full items-center justify-center rounded-3xl bg-primary/10 border border-primary/20 shadow-2xl shadow-primary/10"
      >
        <Construction className="h-20 w-20 text-primary" />
      </motion.div>

      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 1, 0.5],
        }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg shadow-accent/20"
      >
        <Rocket className="h-5 w-5" />
      </motion.div>
    </div>
  );
}

export function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden text-center">
      <div className="absolute -left-1/4 -top-1/4 h-[50%] w-[50%] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute -right-1/4 -bottom-1/4 h-[50%] w-[50%] rounded-full bg-accent/5 blur-[120px]" />
    </div>
  );
}

export function AnimatedContainer({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-md space-y-8"
    >
      {children}
    </motion.div>
  );
}
