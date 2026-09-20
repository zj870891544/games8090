export default function Loading() {
  return (
    <div className="page loading-page" aria-label="Loading games">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-hero" />
      <div className="game-grid">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div className="skeleton skeleton-card" key={i} />
        ))}
      </div>
    </div>
  );
}
