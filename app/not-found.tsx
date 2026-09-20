import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page empty-state">
      <span className="eyebrow">404 · OFF THE MAP</span>
      <h1>This level doesn’t exist.</h1>
      <p>There’s plenty more to play back at the arcade.</p>
      <Link className="button primary" href="/games">
        Find a game →
      </Link>
    </div>
  );
}
