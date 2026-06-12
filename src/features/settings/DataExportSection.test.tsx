// DataExportSection behaviour with the api client and the download helper mocked. Pins the data flow:
// clicking "Export my data" fetches GET /api/v1/me/export through the typed client and writes the
// returned document to a file (downloadJson), then shows the "Downloaded" state; a failed export shows
// the inline error. The section renders nothing FROM the export (it only triggers the download).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { AccountExport } from "@/lib/api/types";

const exportMyData = vi.fn();
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: { exportMyData: (...a: unknown[]) => exportMyData(...a) },
  };
});

const downloadJson = vi.fn();
vi.mock("@/lib/download", () => ({
  downloadJson: (...a: unknown[]) => downloadJson(...a),
}));

import { DataExportSection } from "@/features/settings/DataExportSection";

const EXPORT_DOC: AccountExport = {
  user_profile: {
    id: "user-1",
    email: "coordinator@example.com",
    first_name: "Sam",
    subscription_tier: "free",
    onboarding_complete: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  child_profile: [],
  activity_record: [],
  pulse_record: [],
  lci_snapshot: [],
  alert_record: [],
  card_record: [],
};

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DataExportSection />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  exportMyData.mockReset();
  downloadJson.mockReset();
});

describe("DataExportSection", () => {
  it("fetches the export and saves it to a file, then shows Downloaded", async () => {
    const user = userEvent.setup();
    exportMyData.mockResolvedValue(EXPORT_DOC);
    renderSection();

    await user.click(screen.getByRole("button", { name: /export my data/i }));

    await waitFor(() => expect(exportMyData).toHaveBeenCalledTimes(1));
    // The fetched document is written to a JSON file named for the account export.
    expect(downloadJson).toHaveBeenCalledWith(EXPORT_DOC, "tiwani-account-export.json");
    expect(await screen.findByText(/downloaded/i)).toBeInTheDocument();
  });

  it("shows an inline error and does not download when the export fails", async () => {
    const user = userEvent.setup();
    exportMyData.mockRejectedValue(new Error("boom"));
    renderSection();

    await user.click(screen.getByRole("button", { name: /export my data/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not|went wrong/i);
    expect(downloadJson).not.toHaveBeenCalled();
  });
});
