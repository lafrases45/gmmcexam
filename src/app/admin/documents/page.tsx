import Link from 'next/link';

export default function DocumentHub() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="section-title" style={{ margin: 0, textAlign: 'left' }}>Document Hub</h1>
        <Link href="/admin/documents/create" className="btn btn-primary">+ Upload New Document</Link>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-faded)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Title</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Category</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Published Year</th>
              <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Audit Report 2023</td>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}><span style={{ background: '#e0f2f1', color: '#00897b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>Audit Report</span></td>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>2023</td>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>
                <button style={{ background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>SSR Form Third Iteration</td>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}><span style={{ background: '#f3e5f5', color: '#8e24aa', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>SSR</span></td>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>2022</td>
              <td style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>
                <button style={{ background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
