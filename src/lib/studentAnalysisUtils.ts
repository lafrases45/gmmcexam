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
  
  const trimmed = fullName.trim();
  if (!trimmed) return 'Other';

  const nameParts = trimmed.toUpperCase().split(/\s+/);
  if (nameParts.length === 0) return 'Other';
  
  const surname = nameParts[nameParts.length - 1];
  const lastTwo = nameParts.length >= 2 ? `${nameParts[nameParts.length - 2]} ${nameParts[nameParts.length - 1]}` : "";
  
  const normalizedSurname = surname.replace(/\./g, "").trim();
  const normalizedLastTwo = lastTwo.replace(/\./g, "").replace(/\s+/g, "").trim();

  const categories: Record<EthnicGroup, string[]> = {
    "EDJ": ["TAMANG", "CHAMAR", "LAMA"],
    "Janajati": ["GURUNG", "MAGAR", "RAI", "LIMBU", "SHERPA", "NEWAR", "SHRESTHA", "MAHARJAN", "SHAKYA", "BAJRACHARYA", "THAKALI", "THARU", "GHARTI", "PUN", "BHUJEL", "ALE"],
    "Dalit": ["BK", "PARIYAR", "NEPALI", "SUNAR", "KAMI", "DAMAI", "SARKI", "GAHATRAJ", "DARJI", "BISHWAKARMA"],
    "Madeshi": ["YADAV", "SAH", "MAHATO", "THAKUR", "PANDIT", "JHA", "MISHRA", "SINGH", "GUPTA", "DAS", "MANDAL", "KUMAR"],
    "Other": [
      "THAPA", "PAUDEL", "POUDEL", "ADHIKARI", "ARYAL", "BASTOLA", "BHANDARI", "BHATTA", "BHATTARAI", "DAHAL", "DEVKOȚA", "GAUTAM", "GHIMIRE", "JOSHI", "KOIRALA", "LAMSAL", "NEUPANE", "PANT", "POKHREL", "POKHAREL", "REGMI", "RIJAL", "SHARMA", "SUBEDI", "TIWARI", "UPADHYAYA", "WAGLE",
      "KC", "BASNET", "BISTA", "BOHARA", "CHAND", "CHHETRI", "HAMAL", "KARKI", "KHATRI", "KHADKA", "KUNWAR", "MAHAT", "RANA", "RAWAL", "ROKAYA", "SHAH", "SHAHI", "THAKURI"
    ]
  };

  for (const group of (Object.keys(categories) as EthnicGroup[])) {
    if (categories[group].includes(normalizedSurname) || categories[group].includes(normalizedLastTwo)) {
      return group;
    }
  }
  
  return "Other";
};

/**
 * Guesses gender based on common Nepali names and indicators.
 */
export const guessGender = (fullName: any): Gender => {
  if (!fullName || typeof fullName !== 'string') return 'M';
  
  const trimmed = fullName.trim();
  if (!trimmed) return 'M';

  const nameParts = trimmed.toUpperCase().split(/\s+/);
  if (nameParts.length === 0) return 'M';
  
  const firstName = nameParts[0];
  const femaleIndicators = [
    "KUMARI", "DEVI", "MAYA", "LALITA", "SITA", "GITA", "RITA", "ANITA", "SUNITA", 
    "BINITA", "PRATIKSHYA", "SUSHMA", "POOJA", "REKHA", "AKRITI", "SONY", "SONI", 
    "ANJALI", "ANU", "SABINA", "BINA", "ALINA", "ALISHA", "ANISHA", "AAYUSHA", "AASHIKA", "ASMITA", "BISHNU", "DIKSHYA", "MONIKA"
  ];
  
  if (femaleIndicators.some(ind => firstName === ind || trimmed.toUpperCase().includes(" " + ind))) return "F";
  if (firstName.endsWith("I")) return "F";
  
  const maleANames = ["SUMAN", "ROSAN", "ROSHAN", "ROHAN", "JEEVAN", "KIRAN", "SURYA", "KRISHNA", "RAMA", "BISHAL"];
  if (firstName.endsWith("A") && !maleANames.includes(firstName)) return "F";

  return "M";
};
