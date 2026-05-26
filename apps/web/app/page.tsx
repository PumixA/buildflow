import Link from 'next/link';
import { DashboardShell } from '../components/dashboard-shell';

export default function HomePage() {
  return (
    <DashboardShell title="Accueil Back-office">
      <section className="panel">
        <h2>Navigation rapide</h2>
        <p>Accès direct aux écrans de pilotage du livrable.</p>
        <div className="quick-links">
          <Link href="/hse" className="cta-link">
            Ouvrir le dashboard HSE
          </Link>
          <Link href="/ncr" className="cta-link">
            Ouvrir la liste des NCR
          </Link>
          <Link href="/ncr/NCR-2024-0155" className="cta-link">
            Ouvrir la fiche NCR
          </Link>
        </div>
      </section>
    </DashboardShell>
  );
}
