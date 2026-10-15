export default function LoadingDistractionAnalytics() {
  return (
    <div aria-label="Loading distraction analytics" className="space-y-5">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-white/[0.06]" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="glass-card h-24 animate-pulse" />)}</div>
      <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 2 }, (_, index) => <div key={index} className="glass-card h-64 animate-pulse" />)}</div>
    </div>
  );
}
