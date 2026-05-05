export default function AdmissionsManager() {
  return (
    <div>
      <h1 className="section-title" style={{ margin: '0 0 2rem 0', textAlign: 'left' }}>Admissions Review</h1>

      <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--bg-faded)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Applicant Name</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Program</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Date</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No admission applications found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
