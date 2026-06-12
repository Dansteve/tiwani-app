// Trigger a client-side file download from in-memory data, with no extra network request. Used by the
// Settings data export (the GET /api/v3/me/export document already in memory is written to a file). Kept
// in lib/ as a small, framework-agnostic browser helper; it is a no-op outside the browser (SSR / tests
// with no document) so a caller never has to guard the environment.

/**
 * Save `data` as a pretty-printed JSON file named `filename` to the user's device. Mechanism: serialize
 * to a Blob, mint a temporary object URL, click a hidden anchor carrying `download`, then revoke the URL
 * (so the blob is released). Returns true when the download was triggered, false when there is no DOM to
 * trigger it (SSR / a non-browser test environment), so the caller can treat "no browser" as a no-op
 * rather than a thrown error.
 */
export function downloadJson(data: unknown, filename: string): boolean {
  if (typeof document === "undefined" || typeof URL === "undefined" || !URL.createObjectURL) {
    return false;
  }
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    // Appended so the click dispatches in every browser (Firefox requires the node to be in the DOM).
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    // Release the object URL whether or not the click path threw, so the blob is not leaked.
    URL.revokeObjectURL(url);
  }
  return true;
}
