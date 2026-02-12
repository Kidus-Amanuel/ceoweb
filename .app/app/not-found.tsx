"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { LayoutDashboard, Rocket, Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/shared/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md space-y-8"
      >
        {/* Visual Element */}
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

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Coming Soon
          </h1>
          <p className="text-lg text-muted-foreground">
            We&apos;re building something amazing! This module is currently
            under development to give you the best experience.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Link href="/dashboard">
            <Button
              size="lg"
              className="group gap-2 rounded-2xl px-8 shadow-xl shadow-primary/20 transition-all hover:translate-y-[-2px] hover:shadow-2xl hover:shadow-primary/30"
            >
              <LayoutDashboard className="h-5 w-5 transition-transform group-hover:scale-110" />
              Return to Dashboard
            </Button>
          </Link>
        </div>

        {/* Support Link */}
        <p className="text-sm text-muted-foreground/60 pt-8">
          Need help?{" "}
          <Link
            href="/contact"
            className="text-primary hover:underline underline-offset-4"
          >
            Contact Support
          </Link>
        </p>
      </motion.div>

      {/* Background Decor */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[50%] w-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -right-1/4 -bottom-1/4 h-[50%] w-[50%] rounded-full bg-accent/5 blur-[120px]" />
      </div>
    </div>
  );
}
