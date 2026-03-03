import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/shared/ui/button";
import {
  AnimatedNotFound,
  AnimatedBackground,
  AnimatedContainer,
} from "@/components/shared/ui/animated-not-found";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center overflow-hidden">
      <AnimatedContainer>
        {/* Visual Element */}
        <AnimatedNotFound />

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Coming Soon
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            We are building something amazing! This module is currently under
            development to give you the best experience.
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
      </AnimatedContainer>

      {/* Background Decor */}
      <AnimatedBackground />
    </div>
  );
}
