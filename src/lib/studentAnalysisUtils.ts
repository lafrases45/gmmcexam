export type EthnicGroup = 'Dalit' | 'EDJ' | 'Janajati' | 'Madeshi' | 'Other';
export type Gender = 'M' | 'F';

export const ETHNIC_OPTIONS: EthnicGroup[] = ['Dalit', 'EDJ', 'Janajati', 'Madeshi', 'Other'];
export const GENDER_OPTIONS: Gender[] = ['M', 'F'];

/**
 * Guesses the ethnic group based on the surname/full name.
 * Adapted from existing board exam logic.
 */
export const guessEthnicGroup = (fullName: any): EthnicGroup => {
  if (!fullName || typeof fullName !== 'string') return 'Other';
  const n = fullName.toLowerCase().trim();
  
  const janajati = [
    'gurung', 'magar', 'tamang', 'rai', 'limbu', 'sherpa', 'newar', 'thapa', 'pun', 'ghale', 'ale', 'rana', 'gharti', 'roka', 'budha', 'chidi', 'tharu', 'danuwar', 'majhi', 'kumal', 'darai',
    'shrestha', 'maharjan', 'bajracharya', 'shakya', 'malla', 'joshi', 'pradhan', 'rajbhandari', 'lamichhane', 'hyoju', 'dhaubhadel', 'kayastha', 'amatya',
    'loke', 'syangtan', 'ghising', 'yonzon', 'moktan', 'pakhrin', 'blon', 'bomjan', 'thing', 'glan', 'waiba'
  ];
  const dalit = ['bkr', 'bk', 'kami', 'damai', 'sarki', 'gandharba', 'pariyar', 'bishwakarma', 'sunar', 'shilpakar', 'nepali', 'dholi'];
  const madhesi = [
    'sah', 'yadav', 'jha', 'mandal', 'gupta', 'thakur', 'mahato', 'singh', 'mukhiya', 'mishra', 'chaudhary', 'prajapati', 'shah', 'telu', 'paswan', 'kushwaha', 'sahani', 'das', 'rauniyar', 'ansari', 'sheikh'
  ];
  const brahminChhetri = [
    'sharma', 'koirala', 'adhikari', 'acharya', 'bhattarai', 'poudel', 'pant', 'pokhrel', 'pandey', 'subedi', 'regmi', 'bastola', 'dahal', 'ghimire', 'neupane', 'sapkota', 'timilsina', 'upadhyaya', 'rimal',
    'karki', 'khadka', 'basnet', 'kc', 'chhetri', 'rawat', 'bista', 'kunwar', 'budhathoki', 'rokaya', 'khatri', 'bohara', 'hamal', 'baun', 'chettri'
  ];
  const edj = ["chamar", "lama"]; // Example additions for EDJ if needed
  
  const words = n.split(/\s+/);
  
  if (words.some(w => janajati.includes(w))) return 'Janajati';
  if (words.some(w => dalit.includes(w))) return 'Dalit';
  // Note: Madeshi is spelled Madeshi in ETHNIC_OPTIONS here
  if (words.some(w => madhesi.includes(w))) return 'Madeshi';
  if (words.some(w => edj.includes(w))) return 'EDJ';
  if (words.some(w => brahminChhetri.includes(w))) return 'Other';
  
  return 'Other';
};

export const guessGender = (fullName: any): Gender => {
  if (!fullName || typeof fullName !== 'string') return 'M';
  const n = fullName.toLowerCase().trim();
  
  const femaleSuffixes = ['devi', 'maya', 'kumari', 'shanti', 'laxmi', 'saraswati', 'kala', 'sheela', 'tara'];
  const unicodeFemaleSuffixes = ['कुमारी', 'देवी', 'माया', 'शान्ति', 'लक्ष्मी', 'सरस्वती', 'कला', 'शीला', 'तारा'];
  
  const femaleFirstNames = [
    'shristi', 'sristi', 'aanisha', 'anisha', 'anita', 'anjali', 'anjila', 'anjy', 'anju', 'archana', 'asmita', 'asika', 'asha', 'akriti', 'aarati', 'arati',
    'bandana', 'binita', 'bimala', 'bina', 'bishnu', 'bhagwati', 'bhumika', 'bhawana',
    'chanda', 'chandrika', 'charu',
    'deepa', 'deepti', 'dikshya', 'dipa', 'dolma', 'durga',
    'elina', 'eleena', 'esha',
    'geeta', 'gita', 'goma', 'gauri', 'ganga',
    'hira', 'huma', 'hema',
    'indira', 'isha', 'ishwari', 'indu',
    'janaki', 'jamuna', 'jyoti', 'junu', 'jina',
    'kabita', 'kalpana', 'kamala', 'karuna', 'karishma', 'kiran', 'kriti', 'kusum', 'kunti',
    'laxmi', 'lila', 'lalita', 'lucky',
    'manisha', 'manju', 'maya', 'meena', 'mina', 'muna', 'mamata', 'monika', 'mira',
    'nabina', 'namrata', 'neeta', 'nitu', 'nirmala', 'niruta', 'nisha', 'neha',
    'ojashwi', 'omshanti',
    'pabitra', 'parbati', 'pooja', 'puja', 'pratima', 'prativa', 'purnima', 'puspa', 'pushpa', 'preeti', 'priti', 'priyanka', 'pema',
    'rabina', 'rachana', 'rita', 'reema', 'rima', 'rekha', 'roshni', 'roshani', 'rupa', 'radha', 'radhika', 'rashmi', 'ranjana', 'renu', 'renuka',
    'sabina', 'sabitra', 'sadhana', 'samjhana', 'sandhya', 'sangita', 'sangeeta', 'sapana', 'sarita', 'saraswati', 'shanti', 'sharmila', 'shova', 'shobha', 'sita', 'sneha', 'soniya', 'sonia', 'sudha', 'sujata', 'sumitra', 'sunita', 'sushila', 'sushma', 'swechha', 'sweta',
    'tara', 'tulasa', 'tika',
    'uma', 'urmila', 'ushma', 'usha',
    'varsha', 'barsha', 'vimala', 'vidya',
    'yamuna', 'yashoda'
  ];

  const words = n.split(/\s+/);
  
  if (words.some(w => femaleFirstNames.includes(w))) return 'F';
  if (femaleSuffixes.some(s => n.endsWith(s))) return 'F';
  if (unicodeFemaleSuffixes.some(s => n.endsWith(s))) return 'F';
  
  const legacyFemaleKeywords = ['sharmila', 'dikshya', 'rachana', 'sadhana', 'tulasa', 'yamuna'];
  if (legacyFemaleKeywords.some(k => n.includes(k))) return 'F';

  return 'M';
};
