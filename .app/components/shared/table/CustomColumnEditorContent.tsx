"use client";

import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/shared/ui/button/Button";
import { Input } from "@/components/shared/ui/input/Input";
import { Label } from "@/components/shared/ui/label/Label";
import { cn } from "@/lib/utils";

export type ColumnFieldType =
  | "text"
  | "number"
  | "date"
  | "datetime"
  | "select"
  | "boolean"
  | "json"
  | "currency"
  | "status"
  | "phone"
  | "email";

export type ColumnFieldChoice = {
  key: string;
  label: string;
  icon: LucideIcon;
  tone: string;
  enabled: boolean;
};

type Props = {
  seed: number;
  nameDefault: string;
  optionsDefault: string;
  currentType: ColumnFieldType;
  fieldTypeFilter: string;
  onFieldTypeFilterChange: (value: string) => void;
  choices: ColumnFieldChoice[];
  lockTypeChange: boolean;
  onTypeChange: (nextType: ColumnFieldType) => void;
  onNameChange: (value: string) => void;
  onOptionsChange: (value: string) => void;
  error: string | null;
  onSave: () => void;
  saveLabel: string;
};

export function CustomColumnEditorContent({
  seed,
  nameDefault,
  optionsDefault,
  currentType,
  fieldTypeFilter,
  onFieldTypeFilterChange,
  choices,
  lockTypeChange,
  onTypeChange,
  onNameChange,
  onOptionsChange,
  error,
  onSave,
  saveLabel,
}: Props) {
  const orderedChoices = [
    ...choices.filter((choice) => choice.enabled),
    ...choices.filter((choice) => !choice.enabled),
  ];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="rounded-[14px] border border-[#D8E5FB] bg-[#F9FBFF] p-2">
          <Input
            key={`col-label-${seed}`}
            placeholder="Type property name..."
            defaultValue={nameDefault}
            onChange={(e) => onNameChange(e.target.value)}
            className="h-12 text-2xl font-medium rounded-[12px] border-[#D0DFF8]"
          />
        </div>
        <div className="rounded-[12px] border border-border/80 bg-white p-1.5">
          <Input
            placeholder="Search property type..."
            value={fieldTypeFilter}
            onChange={(e) => onFieldTypeFilterChange(e.target.value)}
            className="h-10 rounded-[10px] border-[#ECECE9]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-[14px] border border-[#ECECE9] p-3 max-h-[360px] overflow-auto">
        {orderedChoices.map((choice) => {
          const Icon = choice.icon;
          const selected = choice.key === currentType;
          const typeLocked = lockTypeChange && choice.key !== currentType;
          const isEnabled = choice.enabled && !typeLocked;
          return (
            <button
              key={choice.key}
              type="button"
              disabled={!isEnabled}
              onClick={() => {
                if (!isEnabled) return;
                onTypeChange(choice.key as ColumnFieldType);
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                isEnabled
                  ? "hover:bg-[#F6F8FB]"
                  : "opacity-45 cursor-not-allowed",
                selected && "bg-[#EEF4FF] ring-1 ring-[#C7D8F9]",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border",
                  choice.tone,
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[17px] font-medium text-[#37352F]">
                {choice.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {currentType === "select" ||
        currentType === "currency" ||
        currentType === "status" ? (
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-widest font-bold text-[#91918E]">
              Options (Comma Separated)
            </Label>
            <Input
              key={`col-options-${seed}`}
              placeholder={
                currentType === "currency"
                  ? "e.g. USD, EUR, ETB"
                  : currentType === "status"
                    ? "e.g. Pending, In Progress, Done, Cancelled"
                    : "e.g. High, Medium, Low"
              }
              defaultValue={optionsDefault}
              onChange={(e) => onOptionsChange(e.target.value)}
              className="h-10 rounded-[10px] border-[#E9E9E7]"
            />
          </div>
        ) : null}
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <Button
          onClick={onSave}
          className="w-full bg-[#2F3A4E] hover:bg-[#232C3D] text-white rounded-[12px] h-11 font-bold"
        >
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}
