'use client';
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

const downloadCategories = [
  { title: "Audit Reports", slug: "audit-report", icon: "📊", desc: "Official financial and performance audit reports of GMMC." },
  { title: "Annual Reports", slug: "annual-report", icon: "📑", desc: "Yearly academic and administrative progress reports." },
  { title: "SSR (Self Study Report)", slug: "ssr", icon: "🏢", desc: "University Grants Commission requested evaluation reports." },
  { title: "Tracer Studies", slug: "tracer-study", icon: "🎓", desc: "Reports mapping the employment and outcomes of our graduates." },
];

export default function DownloadsDirectory() {
  return (
    <div>
      <Navbar />
      
      <main style={{ padding: '4rem 1.5rem', minHeight: '60vh', backgroundColor: 'var(--bg-faded)' }}>
        <div className="container">
          <div style={{ marginBottom: '4rem', textAlign: 'center' }}>
            <h1 className="section-title">Campus Downloads</h1>
            <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>Access all public documents, reports, and templates published by Gupteshwor Mahadev Multiple Campus.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            {downloadCategories.map((cat) => (
              <Link href={`/downloads/${cat.slug}`} key={cat.slug} style={{ textDecoration: 'none' }}>
                <div style={{ 
                  background: 'white', 
                  padding: '2rem', 
                  borderRadius: '12px', 
                  boxShadow: '0 4px 15px rgba(0,0,0,0.05)', 
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  borderTop: '4px solid var(--accent-blue)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
                }}
                >
                  <span style={{ fontSize: '3rem', marginBottom: '1rem', display: 'inline-block' }}>{cat.icon}</span>
                  <h3 style={{ color: 'var(--primary-blue)', marginBottom: '0.5rem', fontSize: '1.25rem' }}>{cat.title} &rarr;</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, flex: 1 }}>{cat.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
