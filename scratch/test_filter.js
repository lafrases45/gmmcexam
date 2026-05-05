const subjects = [
  { name: 'S1', semester_or_year: '1st Year' },
  { name: 'S2', semester_or_year: '1' },
  { name: 'S3', semester_or_year: '1st Year' }
];

const manageYear = '1';

const filtered = subjects.filter(s => {
  const dbYear = String(s.semester_or_year || '').toLowerCase();
  const targetYear = String(manageYear).toLowerCase();
  return dbYear === targetYear || dbYear.startsWith(targetYear);
});

console.log(filtered.length);
