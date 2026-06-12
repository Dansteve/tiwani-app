"use client";

// The "Your data" Settings section: export everything the account holds (the data-rights export). It
// fetches GET /api/v3/me/export through the typed client (which the api scopes to the caller via RLS,
// so it can only ever contain this account's own data) and saves it to a JSON file on the device. The
// app renders nothing from the export; it only triggers the download. Errors surface inline (the repo
// has no toast library; the established pattern is an inline role="alert" on the destructive token, as
// on the Profile and Plan screens).

import { useMutation } from "@tanstack/react-query";
import { Check, Download } from "lucide-react";

import { api, ApiError } from "@/lib/api/client";
import { downloadJson } from "@/lib/download";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** The fixed export filename. No profile detail in the name (it is saved to the user's own device). */
const EXPORT_FILENAME = "tiwani-account-export.json";

export function DataExportSection() {
  const mutation = useMutation({
    mutationFn: () => api.exportMyData(),
    onSuccess: (data) => {
      // Save the returned document to a file on the device. The fetch already has the data in memory;
      // this just writes it out, so there is no second request and nothing is rendered from it.
      downloadJson(data, EXPORT_FILENAME);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Your data</CardTitle>
        <CardDescription>
          Download a copy of everything in your TIWANI account: your profile, the people you care for,
          and your prepared plans, check-ins, and cards. The file is saved to this device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {mutation.isError ? (
          <p
            role="alert"
            className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {mutation.error instanceof ApiError
              ? "We could not prepare your export just now. Please try again."
              : "Something went wrong preparing your export. Please try again."}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            <Download className="size-4" aria-hidden="true" />
            {mutation.isPending ? "Preparing..." : "Export my data"}
          </Button>
          {mutation.isSuccess ? (
            <span
              role="status"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-success"
            >
              <Check className="size-4 shrink-0" aria-hidden="true" />
              Downloaded
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
