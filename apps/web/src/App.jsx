export function App() {
  return (
    <main className="shell">
      <p className="eyebrow">Headless media SDK demo</p>
      <h1>Frameflow</h1>
      <p className="lede">
        The workspace is ready. Search, gallery, lightbox, and video reels are added in the
        implementation phases.
      </p>
      <section className="status-card" aria-labelledby="phase-title">
        <span className="status-dot" aria-hidden="true" />
        <div>
          <h2 id="phase-title">Phase 1 · Foundation</h2>
          <p>Workspace packages and public contracts are configured.</p>
        </div>
      </section>
    </main>
  );
}
