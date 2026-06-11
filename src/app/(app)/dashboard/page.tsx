import { CHAPTERS, chapterLabel } from "@/lib/format";

// The six-Life-Chapter dashboard (Product.md §4.3). Foundation stub: the 2x3 chapter grid reflows
// to 1 to 2 columns (responsiveness rule). Statuses, LCI, and alerts come from the api later; the
// app renders, never computes (App SETUP / Dashboard module).

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">Dashboard</h1>
        <p className="mt-1 text-base text-muted-foreground">
          Your six Life Chapters. Pick one to prepare for something.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CHAPTERS.map((chapter) => (
          <div
            key={chapter}
            className="flex min-h-28 flex-col justify-between rounded-xl border border-border bg-card p-4 text-card-foreground"
          >
            <span className="text-base font-medium">{chapterLabel(chapter)}</span>
            <span className="text-sm text-muted-foreground">Not started</span>
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Foundation placeholder. Chapter status, the LCI, and alerts render here once the api is ready.
      </p>
    </div>
  );
}
