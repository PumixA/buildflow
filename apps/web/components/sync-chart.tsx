/** Graphique de démonstration statique — à brancher sur `GET /sync/status` en V2. */
export function SyncChart() {
  return (
    <div className="chart-box">
      <h3>Activité des Synchronisations (24h)</h3>
      <svg viewBox="0 0 600 220" className="chart-svg" role="img" aria-label="Synchronisations 24h">
        <polyline
          fill="none"
          stroke="#2386ff"
          strokeWidth="3"
          points="0,185 80,190 160,150 240,98 320,52 400,36 480,110 560,140 600,150"
        />
        <polyline
          fill="none"
          stroke="#f9a825"
          strokeWidth="2"
          points="0,201 80,199 160,201 240,198 320,196 400,195 480,199 560,200 600,201"
        />
      </svg>
      <div className="chart-legend">
        <span className="legend-item">
          <i className="dot blue" />
          Syncs réussies
        </span>
        <span className="legend-item">
          <i className="dot amber" />
          Syncs échouées
        </span>
      </div>
    </div>
  );
}
