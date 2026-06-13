// The ShareLinkBar test (Product.md §4.6; Docs/FeatureDecisions.md 2026-06-13, card-name-privacy). The
// shared/downloaded PNG must equal what a HELPER opens at the link, not the owner's first-name preview, so
// the bar fetches the PUBLIC content by token (api.getCard, name-stripped server-side) and captures a
// hidden CardContentView rendered with THAT content. With the api client + the capture mocked (jsdom has
// no layout, so the pixel capture itself is exercised only in a real browser), this asserts: the bar
// fetches by token, the hidden capture node renders the public (name-free) content, and the share action
// captures and shares the image + link. The name-stripping is the api's; the app re-implements none.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { CardContent } from "@/lib/api/types";

// The PUBLIC content the token resolves to: the api has already stripped the name (it reads "this child",
// not "Ada"), so capturing this is what makes the PNG match the live link.
const PUBLIC_CONTENT: CardContent = {
  child_first_name: "this child",
  activity_name: "Swimming lesson",
  chapter: "social",
  tier: "Modified",
  tier_label: "Take it at their pace",
  intro: "They do best when things are calm and predictable.",
  strategies: [{ title: "Arrive a few minutes early", detail: "So the pool fills up gradually." }],
  if_difficult: "If things get overwhelming, a quiet break usually helps.",
  safety_note: "For anything about food, medicines, or health, follow the family's plan and ask first.",
  is_stale: false,
};

const getCard = vi.fn();
vi.mock("@/lib/api/client", () => ({
  api: { getCard: (...args: unknown[]) => getCard(...args) },
}));

// Mock the capture helpers: the real pixel capture needs a browser. We assert the bar calls captureCardImage
// on the hidden node and assembles the share payload, and that the file-share branch fires navigator.share.
const captureCardImage = vi.fn();
vi.mock("@/features/card/cardImage", async () => {
  const actual = await vi.importActual<typeof import("@/features/card/cardImage")>(
    "@/features/card/cardImage"
  );
  return {
    ...actual,
    captureCardImage: (...args: unknown[]) => captureCardImage(...args),
  };
});

import { ShareLinkBar } from "@/features/card/ShareLinkBar";

function renderBar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ShareLinkBar
        url="https://app.example/c?t=tok_abc123"
        token="tok_abc123"
        firstName="Ada"
      />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  getCard.mockReset();
  getCard.mockResolvedValue(PUBLIC_CONTENT);
  captureCardImage.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ShareLinkBar (the shared PNG matches the public link)", () => {
  it("renders the shareable link field", async () => {
    renderBar();
    const field = (await screen.findByLabelText("Shareable link")) as HTMLInputElement;
    expect(field.value).toBe("https://app.example/c?t=tok_abc123");
  });

  it("fetches the PUBLIC content by token (name-stripped) for the capture", async () => {
    renderBar();
    await waitFor(() =>
      expect(getCard).toHaveBeenCalledWith("tok_abc123", expect.anything())
    );
  });

  it("renders a hidden capture node with the public (name-free) content", async () => {
    renderBar();
    // The hidden capture node wraps the api's PUBLIC card <article> (it reads "this child", the api's
    // name-free copy, NOT the owner's first name). It is the node the PNG is captured from. Several icons
    // are also aria-hidden, so select the wrapper by the <article> it holds, not the first aria-hidden node.
    const article = await waitFor(() => {
      const node = document.querySelector('[aria-hidden="true"] article');
      expect(node).not.toBeNull();
      return node as HTMLElement;
    });
    const hidden = article.closest('[aria-hidden="true"]') as HTMLElement;
    expect(within(hidden).getByText("this child")).toBeInTheDocument();
    expect(within(hidden).queryByText("Ada")).not.toBeInTheDocument();
  });

  it("disables the image actions until the public content has loaded", async () => {
    // A never-resolving read keeps the content pending: the Download button is disabled meanwhile.
    getCard.mockReturnValue(new Promise(() => {}));
    renderBar();
    const download = await screen.findByRole("button", { name: /download card image/i });
    expect(download).toBeDisabled();
  });

  it("shares the captured image + link through the native share sheet when files are supported", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { share, canShare });
    captureCardImage.mockResolvedValue(new Blob(["png"], { type: "image/png" }));

    renderBar();
    // Wait for the public content so the share button is enabled.
    const shareButton = await screen.findByRole("button", { name: /share card/i });
    await waitFor(() => expect(shareButton).not.toBeDisabled());

    fireEvent.click(shareButton);

    // It captured the hidden public node, then shared the image + the link.
    await waitFor(() => expect(captureCardImage).toHaveBeenCalled());
    await waitFor(() => expect(share).toHaveBeenCalled());
    const payload = share.mock.calls[0][0];
    expect(payload.url).toBe("https://app.example/c?t=tok_abc123");
    expect(payload.files).toHaveLength(1);
  });
});
