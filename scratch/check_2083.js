const adbs = require('ad-bs-converter');

console.log('Baisakh 2083 BS Days:');
let total = 0;
let saturdays = 0;
for (let d = 1; d <= 32; d++) {
  const ad = adbs.bs2ad(`2083/1/${d}`);
  if (ad.year === 0) break;
  total++;
  const date = new Date(ad.year, ad.month - 1, ad.day);
  if (date.getDay() === 6) saturdays++;
  console.log(`${d}: ${ad.year}/${ad.month}/${ad.day} (${date.toLocaleDateString('en-US', {weekday: 'long'})})`);
}
console.log('Total days:', total);
console.log('Saturdays:', saturdays);
