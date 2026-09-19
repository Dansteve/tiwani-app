"use client";

// The ENRICHMENT question (LCE Addendum v1.1 §5): when the Specificity Gate fails, the engine asks ONE
// value-first question to improve THIS plan now (never to "collect data"). The api authors the question
// (it names the child + the pressure), so this RENDERS `enrichment.question` VERBATIM and authors no
// question wording (the governed-copy rule, exactly as alerts are rendered). The options are the api's
// { code, label } answers; the carer taps one or more, then submits, and the parent re-calls preparePlan
// with the selected codes as `enrichment_answer` (the byproduct-input model: the profile grows from the
// carer's confirmed choice, LCE Addendum §5 / Product2.md principle 1).
//
// The options are the shared TagPill (multi-select, colour + label + icon, 44px), so the surface matches
// the today-flags picker. The whole prompt is flag-gated by the caller (isFusionEnabled) pending the
// psychiatrist copy sign-off. It computes no score and applies no tag effect; it only collects codes.

import { useState } from "react";
import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TagPill } from "@/components/TagPill";
import { dimensionLabel } from "@/lib/format";
import type { PlanEnrichment } from "@/lib/api/types";

interface EnrichmentPromptProps {
  enrichment: PlanEnrichment;
  /** Re-call preparePlan with the selected option codes (the enrichment_answer); the parent owns the run. */
  onEnrich: (codes: string[]) => void;
  /** True while the enrichment re-run is in flight (disables the submit so it fires once). */
  isEnriching?: boolean;
}

export function EnrichmentPrompt({ enrichment, onEnrich, isEnriching = false }: EnrichmentPromptProps) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function submit() {
    if (selected.length === 0) return;
    onEnrich(selected);
  }

  return (
    <section
      aria-labelledby="enrichment-label"
      className="space-y-3 rounded-2xl border border-primary/25 bg-primary/10 p-5"
      // Coach-marks anchor: the plan tour points its (optional, flag-gated) "enrichment" step here.
      data-tour="plan-enrichment"
    >
      <div className="flex items-start gap-3">
        <HelpCircle className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            One quick question about {dimensionLabel(enrichment.dimension)}
          </p>
          {/* The api-authored, governed question, rendered verbatim (the app authors no wording). */}
          <h2 id="enrichment-label" className="mt-1 text-base font-semibold text-foreground">
            {enrichment.question}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tap anything that fits. It tailors this plan and helps us learn what matters for them.
          </p>
        </div>
      </div>

      <fieldset>
        <legend className="sr-only">{enrichment.question}</legend>
        <div className="flex flex-wrap gap-2">
          {enrichment.options.map((option) => (
            <TagPill
              key={option.code}
              label={option.label}
              selected={selected.includes(option.code)}
              onToggle={() => toggle(option.code)}
            />
          ))}
        </div>
      </fieldset>

      <Button
        type="button"
        onClick={submit}
        disabled={selected.length === 0 || isEnriching}
        className="w-full sm:w-auto"
      >
        {isEnriching ? "Updating your plan..." : "Update the plan"}
      </Button>
    </section>
  );
}
