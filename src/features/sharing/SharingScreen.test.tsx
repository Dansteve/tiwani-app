// The Sharing screen test (Docs/FeatureDecisions.md 2026-06-12 "Shared Child / Co-Coordinator access").
// It pins the viewer-ceiling tab set the role drives (an OWNER sees both "Who you share with" + "Shared
// with you"; a VIEWER sees "Shared with you" only) and carries the screen-level vitest-axe assertion (the
// shared src/test/axe.ts harness) for both roles. The child panels (invite / roster / shared-with-me)
// have their own focused tests, so they are stubbed here to keep this about the tab shell + the ceiling.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { axeRuleViolations } from "@/test/axe";

const recipientState: {
  activeRecipient: { id: string; first_name: string; role: string } | null;
  activeRole: string | null;
  isLoading: boolean;
} = {
  activeRecipient: { id: "rec_1", first_name: "Ada", role: "owner" },
  activeRole: "owner",
  isLoading: false,
};

vi.mock("@/state/RecipientProvider", () => ({
  useRecipient: () => recipientState,
}));

// Stub the child panels (each has its own focused test) so the tab shell + ceiling is what is exercised.
vi.mock("@/features/sharing/ShareInvitePanel", () => ({
  ShareInvitePanel: () => <div data-testid="share-invite-panel" />,
}));
vi.mock("@/features/sharing/ShareRoster", () => ({
  ShareRoster: () => <div data-testid="share-roster" />,
}));
vi.mock("@/features/sharing/SharedWithMeView", () => ({
  SharedWithMeView: () => <div data-testid="shared-with-me" />,
}));

import { SharingScreen } from "@/features/sharing/SharingScreen";

function renderSharing() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SharingScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  recipientState.activeRecipient = { id: "rec_1", first_name: "Ada", role: "owner" };
  recipientState.activeRole = "owner";
  recipientState.isLoading = false;
});

describe("SharingScreen viewer ceiling", () => {
  it("shows BOTH tabs for an OWNER, defaulting to the manage surface", () => {
    recipientState.activeRole = "owner";
    renderSharing();
    expect(screen.getByRole("tab", { name: /who you share with/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /shared with you/i })).toBeInTheDocument();
    // The owner default tab renders the invite + roster panels.
    expect(screen.getByTestId("share-invite-panel")).toBeInTheDocument();
    expect(screen.getByTestId("share-roster")).toBeInTheDocument();
  });

  it("HIDES the manage tab for a VIEWER and shows only 'Shared with you'", () => {
    recipientState.activeRole = "viewer";
    recipientState.activeRecipient = { id: "rec_1", first_name: "Ada", role: "viewer" };
    renderSharing();
    expect(screen.queryByRole("tab", { name: /who you share with/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("share-invite-panel")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /shared with you/i })).toBeInTheDocument();
    expect(screen.getByTestId("shared-with-me")).toBeInTheDocument();
  });
});

describe("SharingScreen accessibility (axe)", () => {
  it("has no axe violations for an OWNER", async () => {
    recipientState.activeRole = "owner";
    const { container } = renderSharing();
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("has no axe violations for a VIEWER", async () => {
    recipientState.activeRole = "viewer";
    recipientState.activeRecipient = { id: "rec_1", first_name: "Ada", role: "viewer" };
    const { container } = renderSharing();
    expect(await axeRuleViolations(container)).toEqual([]);
  });
});
