export function OutputPackage({ packageMode, status, gamePackage }) {
  return (
    <section className="package-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">{packageMode}</span>
          <h3>Generated Package</h3>
        </div>
        <strong>{status}</strong>
      </div>
      <pre>{JSON.stringify(gamePackage, null, 2)}</pre>
    </section>
  );
}
