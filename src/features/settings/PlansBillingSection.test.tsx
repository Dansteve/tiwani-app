// PlansBillingSection behaviour with the api client mocked. Pins the subscription surface (the app
// half of the feature): it SHOWS the plan list with prices formatted pence -> GBP, marks the caller's
// current plan, and on "Upgrade" calls checkout. Because checkout is STUBBED (the api returns 503
// until Stripe keys exist, Subscription.md), the section must render a CALM "coming soon" state
// (role="status"), NOT an error toast/alert. The app renders what the api returns and computes nothing
// but the price formatting.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { MySubscription, PlanList } from "@/lib/api/types";

const listBillingPlans = vi.fn();
const getMySubscription = vi.fn();
const startCheckout = vi.fn();
vi.mock("@/lib/api/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    api: {
      listBillingPlans: (...a: unknown[]) => listBillingPlans(...a),
      getMySubscription: (...a: unknown[]) => getMySubscription(...a),
      startCheckout: (...a: unknown[]) => startCheckout(...a),
    },
  };
});

import { ApiError } from "@/lib/api/client";
import { PlansBillingSection } from "@/features/settings/PlansBillingSection";

const PLANS: PlanList = {
  tiers: [
    { key: "free", name: "Free", price_monthly_pence: 0, price_yearly_pence: null, active: true, sort: 0 },
    { key: "standard", name: "Standard", price_monthly_pence: 1999, price_yearly_pence: null, active: true, sort: 1 },
    { key: "premium", name: "Premium", price_monthly_pence: 2999, price_yearly_pence: null, active: true, sort: 2 },
  ],
};

const FREE_SUB: MySubscription = { tier: "free", status: "none", current_period_end: null };

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PlansBillingSection />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  listBillingPlans.mockReset();
  getMySubscription.mockReset();
  startCheckout.mockReset();
});

describe("PlansBillingSection", () => {
  it("lists the plans with prices formatted pence -> GBP, and marks the current plan", async () => {
    listBillingPlans.mockResolvedValue(PLANS);
    getMySubscription.mockResolvedValue(FREE_SUB);
    renderSection();

    // Prices are shown as the human pounds amount (1999 -> £19.99, 2999 -> £29.99), free as "Free".
    expect(await screen.findByText("£19.99")).toBeInTheDocument();
    expect(screen.getByText("£29.99")).toBeInTheDocument();
    // The free tier (current plan here) is marked "Your plan"; the section never recomputes the tier.
    expect(screen.getAllByText(/your plan/i).length).toBeGreaterThan(0);
  });

  it("offers Upgrade on a paid tier the caller is not on, and starts checkout for that tier", async () => {
    const user = userEvent.setup();
    listBillingPlans.mockResolvedValue(PLANS);
    getMySubscription.mockResolvedValue(FREE_SUB);
    // A pending promise: the click starts checkout but does not resolve to a redirect in this test.
    startCheckout.mockReturnValue(new Promise(() => {}));
    renderSection();

    await user.click(await screen.findByRole("button", { name: /upgrade to standard/i }));

    await waitFor(() => expect(startCheckout).toHaveBeenCalledTimes(1));
    // Checkout is started for the clicked tier's key (the monthly cadence default).
    expect(startCheckout).toHaveBeenCalledWith("standard", "monthly");
  });

  it("shows a calm coming-soon state (not an error) when checkout is stubbed with a 503", async () => {
    const user = userEvent.setup();
    listBillingPlans.mockResolvedValue(PLANS);
    getMySubscription.mockResolvedValue(FREE_SUB);
    // The stubbed checkout: the api returns 503 until Stripe keys exist (Subscription.md).
    startCheckout.mockRejectedValue(new ApiError(503, "Stripe is not configured"));
    renderSection();

    await user.click(await screen.findByRole("button", { name: /upgrade to standard/i }));

    // The 503 is surfaced as a calm status message, NOT a destructive alert/toast.
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/coming soon/i);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an inline error (not the coming-soon state) when checkout fails for another reason", async () => {
    const user = userEvent.setup();
    listBillingPlans.mockResolvedValue(PLANS);
    getMySubscription.mockResolvedValue(FREE_SUB);
    startCheckout.mockRejectedValue(new ApiError(500, "boom"));
    renderSection();

    await user.click(await screen.findByRole("button", { name: /upgrade to premium/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not start/i);
  });

  it("shows the renewal date for a paid current plan, and no Upgrade on that tier", async () => {
    listBillingPlans.mockResolvedValue(PLANS);
    getMySubscription.mockResolvedValue({
      tier: "standard",
      status: "active",
      current_period_end: "2025-07-03T00:00:00Z",
    } satisfies MySubscription);
    renderSection();

    // The current-plan summary names the tier and shows when it renews (the app never computes the date).
    expect(await screen.findByText(/renews/i)).toHaveTextContent(/2025/);
    // The Standard row is the current plan, so it carries no "Upgrade to Standard" CTA.
    expect(screen.queryByRole("button", { name: /upgrade to standard/i })).not.toBeInTheDocument();
    // Premium (a higher paid tier the caller is not on) still offers its upgrade.
    expect(screen.getByRole("button", { name: /upgrade to premium/i })).toBeInTheDocument();
  });

  it("shows an inline error when the plan list fails to load", async () => {
    listBillingPlans.mockRejectedValue(new ApiError(500, "boom"));
    getMySubscription.mockResolvedValue(FREE_SUB);
    renderSection();

    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load the plans/i);
  });
});
