import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import styles from "./archive.module.css";

// We mock some data for the UI simulation
const mockDocumentsUrl = [
  { title: "Audit Report 2023", slug: "audit-report", year: 2023, url: "#" },
  { title: "Audit Report 2022", slug: "audit-report", year: 2022, url: "#" },
  { title: "Audit Report 2021", slug: "audit-report", year: 2021, url: "#" },
  { title: "Self Study Report (SSR) - Final", slug: "ssr", year: 2023, url: "#" },
  { title: "Self Study Report (SSR) - Draft", slug: "ssr", year: 2022, url: "#" },
];

export default async function DownloadsPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  
  // Mock logic to format the slug back to Title Case (e.g. "audit-report" -> "Audit Report")
  const categoryName = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  // Filter documents by the current category and sort by Year (descending layout order string)
  const filteredDocs = mockDocumentsUrl
    .filter(doc => doc.slug === slug)
    .sort((a, b) => b.year - a.year);

  return (
    <div>
      <Navbar />
      
      <main style={{ padding: '4rem 1.5rem', minHeight: '60vh', backgroundColor: 'var(--bg-faded)' }}>
        <div className="container">
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <h1 className="section-title">{categoryName} Archives</h1>
            <p style={{ color: 'var(--text-muted)' }}>Chronological archive of all public {categoryName.toLowerCase()}s.</p>
          </div>

          <div className={styles.container}>
            {filteredDocs.length > 0 ? (
              <ul className={styles.archiveList}>
                {filteredDocs.map((doc, index) => (
                  <li key={index} className={styles.archiveItem}>
                    <div className={styles.itemData}>
                      <h3>{doc.title}</h3>
                      <p>Published Year: {doc.year}</p>
                    </div>
                    <div className={styles.actions}>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                        <span style={{ fontSize: '1.2rem' }}>👁️</span> View
                      </a>
                      <a href={doc.url} download className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>📥</span> Download
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem' }}>📂</span>
                <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>No {categoryName.toLowerCase()}s have been published yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
