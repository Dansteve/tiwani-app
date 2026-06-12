// Trigger a client-side file download to the user's device. Kept in lib/ as a small, framework-agnostic
// browser helper; it is a no-op outside the browser (SSR / tests with no document) so a caller never has
// to guard the environment. Two entry points over one DOM mechanism: downloadBlob saves any Blob already
// in memory (e.g. the application/pdf the api returned for a Continuity Card), and downloadJson is the
// JSON convenience over it (the Settings data export of the GET /api/v1/me/export document).

/**
 * Save an already-in-memory `blob` as `filename` to the user's device. Mechanism: mint a temporary
 * object URL for the blob, click a hidden anchor carrying `download`, then revoke the URL (so the blob
 * is released). Returns true when the download was triggered, false when there is no DOM to trigger it
 * (SSR / a non-browser test environment), so the caller can treat "no browser" as a no-op rather than a
 * thrown error. The blob's own MIME type (set when it was created) drives how the browser handles it.
 */
export function downloadBlob(blob: Blob, filename: string): boolean {
  if (typeof document === "undefined" || typeof URL === "undefined" || !URL.createObjectURL) {
    return false;
  }
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

/**
 * Save `data` as a pretty-printed JSON file named `filename` to the user's device. Serializes to a
 * JSON-typed Blob and hands it to downloadBlob (the one anchor mechanism). Returns true when the
 * download was triggered, false when there is no DOM (SSR / a non-browser test environment).
 */
export function downloadJson(data: unknown, filename: string): boolean {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  return downloadBlob(blob, filename);
}
