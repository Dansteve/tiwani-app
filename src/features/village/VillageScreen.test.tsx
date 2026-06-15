import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { axeRuleViolations } from "@/test/axe";

// The Village viewer-ceiling test (Docs/FeatureDecisions.md 2026-06-12 "Helper Village ACCESS",
// refinement 1): an OWNER sees the "Post & track" owner surface; a VIEWER (a recipient SHARED with the
// caller) sees the "Ways to help" + roster tabs ONLY, never the owner posting surface, never shown-then-403.
// The child feature panels are stubbed so this stays about the tab set the role drives.

const recipientState: {
  activeChildId: string | null;
  activeRecipient: { id: string; first_name: string; role: string } | null;
  activeRole: string | null;
  isLoading: boolean;
} = {
  activeChildId: "rec_1",
  activeRecipient: { id: "rec_1", first_name: "Ada", role: "owner" },
  activeRole: "owner",
  isLoading: false,
};

vi.mock("@/state/RecipientProvider", () => ({
  useRecipient: () => recipientState,
}));

const getRoster = vi.fn();
vi.mock("@/lib/api/client", () => ({
  api: { getRoster: (...a: unknown[]) => getRoster(...a) },
}));

// Stub the child panels (each has its own focused test) so the tab shell is what is exercised here.
vi.mock("@/features/village/PostNeedForm", () => ({
  PostNeedForm: () => <div data-testid="post-need-form" />,
}));
vi.mock("@/features/village/OwnerNeedsList", () => ({
  OwnerNeedsList: () => <div data-testid="owner-needs-list" />,
}));
vi.mock("@/features/village/OpenNeedsList", () => ({
  OpenNeedsList: () => <div data-testid="open-needs-list" />,
}));
vi.mock("@/features/village/RosterPanel", () => ({
  RosterPanel: () => <div data-testid="roster-panel" />,
}));

import { VillageScreen } from "@/features/village/VillageScreen";

function renderVillage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <VillageScreen />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getRoster.mockReset();
  getRoster.mockResolvedValue({ recipient_first_name: "Ada", members: [] });
  recipientState.activeChildId = "rec_1";
  recipientState.activeRecipient = { id: "rec_1", first_name: "Ada", role: "owner" };
  recipientState.activeRole = "owner";
  recipientState.isLoading = false;
});

describe("VillageScreen viewer ceiling", () => {
  it("shows the owner 'Post & track' surface for an OWNER", () => {
    recipientState.activeRole = "owner";
    renderVillage();
    expect(screen.getByRole("tab", { name: /post & track/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /ways to help/i })).toBeInTheDocument();
    // The roster tab is labelled "Members" (its value stays "village"); the page heading is still "Village".
    expect(screen.getByRole("tab", { name: /^members$/i })).toBeInTheDocument();
    // The owner default tab renders the posting surface.
    expect(screen.getByTestId("post-need-form")).toBeInTheDocument();
  });

  it("HIDES 'Post & track' for a VIEWER and defaults to the 'Ways to help' board", () => {
    recipientState.activeRole = "viewer";
    recipientState.activeRecipient = { id: "rec_1", first_name: "Ada", role: "viewer" };
    renderVillage();

    // The owner posting tab + surface are gone (the ceiling), never shown-then-403.
    expect(screen.queryByRole("tab", { name: /post & track/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("post-need-form")).not.toBeInTheDocument();
    // The viewer reaches the claim board + the roster ("Members" tab).
    expect(screen.getByRole("tab", { name: /ways to help/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^members$/i })).toBeInTheDocument();
    expect(screen.getByTestId("open-needs-list")).toBeInTheDocument();
  });
});

// The Village tour anchors on the real screen (the app-wide "Show me around"): the button is present for
// everyone, the owner-only "Post & track" tour anchor renders only for an owner (so its step drops for a
// viewer via resolveVisibleSteps), and the everyone "Ways to help" anchor is always present.
describe("VillageScreen tour anchors", () => {
  it("offers the 'Show me around' button and the owner 'post' anchor for an OWNER", () => {
    recipientState.activeRole = "owner";
    const { container } = renderVillage();
    expect(screen.getByRole("button", { name: /show me around/i })).toBeInTheDocument();
    expect(container.querySelector('[data-tour="village-post-tab"]')).not.toBeNull();
    expect(container.querySelector('[data-tour="village-help-tab"]')).not.toBeNull();
  });

  it("drops the owner 'post' anchor for a VIEWER but keeps 'help' (the viewer-safe tour)", () => {
    recipientState.activeRole = "viewer";
    recipientState.activeRecipient = { id: "rec_1", first_name: "Ada", role: "viewer" };
    const { container } = renderVillage();
    expect(screen.getByRole("button", { name: /show me around/i })).toBeInTheDocument();
    // The owner-only tab is not rendered, so its tour step has no target and auto-skips.
    expect(container.querySelector('[data-tour="village-post-tab"]')).toBeNull();
    // The everyone tab anchor is present, so the viewer still gets a useful tour.
    expect(container.querySelector('[data-tour="village-help-tab"]')).not.toBeNull();
  });
});

describe("VillageScreen accessibility (axe)", () => {
  it("has no axe violations for an OWNER", async () => {
    recipientState.activeRole = "owner";
    const { container } = renderVillage();
    await screen.findByRole("tab", { name: /post & track/i });
    expect(await axeRuleViolations(container)).toEqual([]);
  });

  it("has no axe violations for a VIEWER", async () => {
    recipientState.activeRole = "viewer";
    recipientState.activeRecipient = { id: "rec_1", first_name: "Ada", role: "viewer" };
    const { container } = renderVillage();
    await screen.findByRole("tab", { name: /ways to help/i });
    expect(await axeRuleViolations(container)).toEqual([]);
  });
});
