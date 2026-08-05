import Link from 'next/link';
import { DashboardShell } from '../components/dashboard-shell';

export default function HomePage() {
  return (
    <DashboardShell title="Accueil Back-office">
      <section className="panel">
        <h2>Navigation rapide</h2>
        <p>Accès direct aux écrans de pilotage du livrable.</p>
        <div className="quick-links">
          <Link href="/chantiers" className="cta-link">
            Ouvrir un chantier
          </Link>
          <Link href="/ncr" className="cta-link">
            Ouvrir la liste des NCR
          </Link>
          <Link href="/ncr/nouveau" className="cta-link">
            Déclarer une NCR
          </Link>
          <Link href="/hse" className="cta-link">
            Ouvrir le dashboard HSE
          </Link>
        </div>
      </section>
    </DashboardShell>
  );
}
