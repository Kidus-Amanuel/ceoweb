"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/shared/ui/dialog/Dialog";
import { Button } from "@/components/shared/ui/button";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName?: string;
  currentPlan?: string;
}

export function UpgradeModal({
  isOpen,
  onClose,
  moduleName,
  currentPlan = "Starter",
}: UpgradeModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-primary/20 bg-white/95 backdrop-blur-xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-t-xl" />

        <DialogHeader className="pt-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 mx-auto sm:mx-0">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            Upgrade to use {moduleName || "this module"}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            The <span className="font-bold text-foreground">{moduleName}</span>{" "}
            module is not available on your current{" "}
            <span className="font-semibold text-primary">{currentPlan}</span>{" "}
            plan.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <p className="text-sm font-semibold text-foreground">
            What you&apos;ll get in the Business plan:
          </p>
          <ul className="space-y-3">
            {[
              "Access to Inventory & Finance modules",
              "Manage up to 20 users",
              "Advanced reporting features",
              "Priority support & higher reliability",
            ].map((feature, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-muted-foreground"
              >
                <div className="mt-0.5 w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-green-600" />
                </div>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full sm:w-auto font-medium"
          >
            Maybe later
          </Button>
          <Button
            onClick={() => {
              // Redirect to billing or contact sales
              window.open("/billing", "_blank");
              onClose();
            }}
            className="w-full sm:flex-1 gap-2 font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
          >
            Upgrade Now <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
