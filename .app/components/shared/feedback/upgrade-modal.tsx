"use client";

import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
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
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-primary/20 bg-white/95 backdrop-blur-xl">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-t-xl" />

        <DialogHeader className="pt-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 mx-auto sm:mx-0">
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            {t("upgrade.title", {
              moduleName: moduleName || t("upgrade.this_module"),
            })}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            {t("upgrade.description", {
              moduleName: moduleName || t("upgrade.this_module"),
              currentPlan: currentPlan,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <p className="text-sm font-semibold text-foreground">
            {t("upgrade.benefits_title")}
          </p>
          <ul className="space-y-3">
            {(t("upgrade.benefits", { returnObjects: true }) as string[]).map(
              (feature, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-green-600" />
                  </div>
                  {feature}
                </li>
              ),
            )}
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full sm:w-auto font-medium"
          >
            {t("common.maybe_later")}
          </Button>
          <Button
            onClick={() => {
              // Redirect to billing
              router.push("/billing");
              onClose();
            }}
            className="w-full sm:flex-1 gap-2 font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
          >
            {t("upgrade.upgrade_now")} <ArrowRight className="w-4 h-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
