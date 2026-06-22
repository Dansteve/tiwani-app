// A calm content-area skeleton, shown while the (app) guards resolve the session / profile / account
// status on a cold load, INSTEAD of a blank flash. The shell (desktop sidebar, mobile tabs) is already
// painted around it, so this fills the content with a header + card placeholders so a load reads as
// "loading", not "frozen" (the owner's "use skeletons" ask + the page-load-feels-slow note).

export function ContentSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="space-y-2.5">
        <div className="h-8 w-48 animate-pulse rounded-md bg-card" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-card" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}
