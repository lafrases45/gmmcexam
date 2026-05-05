export interface CurriculumItem {
  year?: string;
  semester?: string;
  subjects: string[];
}

export interface CoordinatorContact {
  phone: string;
  email: string;
}

export interface CareerPath {
  title: string;
  description: string;
  icon: string;
}

export interface Facility {
  name: string;
  description: string;
  image?: string;
}

export interface ProgramData {
  title: string;
  slug: string;
  heroImage: string;
  coordinatorImage?: string; // NEW: Coordinator Photo
  shortDescription: string;
  coordinatorName: string;
  coordinatorMessage: string;
  coordinatorContact: CoordinatorContact;
  duration: string;
  affiliation: string;
  eligibility: string[];
  careerProspects: string[]; 
  careerPathways: CareerPath[]; 
  learningOutcomes: string[];
  facilities?: Facility[];
  curriculumOverview: string;
  curriculum: CurriculumItem[];
  syllabusLink?: string;
  noticesCategory: string;
  gallery: string[];
}

export const programsData: Record<string, ProgramData> = {
  bbs: {
    title: "Bachelor in Business Studies (BBS)",
    slug: "bbs",
    heroImage: "/images/programs/hero-bbs.png",
    coordinatorImage: "/images/coordinators/bbs.png",
    shortDescription: "A four-year annual program designed to develop competent managers for any sector of organized activity.",
    coordinatorName: "Management Coordinator",
    coordinatorMessage: "Our BBS program at GMMC is designed to equip students with the required conceptual knowledge of business and administration. We produce graduates capable of performing in complex management environments.",
    coordinatorContact: { phone: "061-455677", email: "dept.management@gmmc.edu.np" },
    duration: "4 Years (Annual System)",
    affiliation: "Tribhuvan University",
    eligibility: [
      "Successfully completed 10+2 in business/commerce or equivalent.",
      "Recognized Higher Secondary School Board or Tribhuvan University.",
      "Must satisfy entry criteria as prescribed by the Faculty Board."
    ],
    careerProspects: ["Corporate Sector", "Banking", "Entrepreneurship"],
    careerPathways: [
      { title: "Financial Analyst", description: "Manage investments and financial strategies for top firms.", icon: "📈" },
      { title: "HR Manager", description: "Design organizational policies and lead personnel teams.", icon: "👥" },
      { title: "Marketing Executive", description: "Drive brand growth through innovative digital strategies.", icon: "🚀" }
    ],
    learningOutcomes: [
      "Mastery of accounting and financial analysis principles.",
      "Advanced understanding of organizational behavior and ethics.",
      "Strategic decision-making in competitive business environments."
    ],
    curriculumOverview: "Broad-based foundation in business, concentration in specialized functional areas.",
    curriculum: [
      { year: "1st Year", subjects: ["Business English", "Microeconomics", "Financial Accounting", "Principles of Management"] }
    ],
    syllabusLink: "https://gmmc.edu.np/syllabus/",
    noticesCategory: "BBS",
    gallery: [
      "/images/gallery/bbs-class.jpg",
      "/images/gallery/bbs-seminar.jpg",
      "/images/gallery/campus-life-1.jpg"
    ]
  },
  bed: {
    title: "Bachelor in Education (B.Ed.)",
    slug: "bed",
    heroImage: "/images/programs/hero-bed.png",
    coordinatorImage: "/images/coordinators/bed.png",
    shortDescription: "A four-year program integrating innovation in teaching and social policy to produce world-class educators.",
    coordinatorName: "Ramji Prasad Paudel",
    coordinatorMessage: "Our B.Ed program is the pioneer of this campus. We produce educators who are not just teachers, but leaders in educational reform and social policy.",
    coordinatorContact: { phone: "061-455677", email: "dept.education@gmmc.edu.np" },
    duration: "4 Years (Annual System)",
    affiliation: "Tribhuvan University",
    eligibility: [
      "10+2 pass or equivalent with at least Second Division.",
      "Minimum 2.01 GPA.",
      "Success in college entrance examination."
    ],
    careerProspects: ["Teaching", "Education Administration", "Curriculum Design"],
    careerPathways: [
      { title: "Academic Administrator", description: "Lead schools and educational institutions efficiently.", icon: "🏫" },
      { title: "Curriculum Specialist", description: "Design modern educational frameworks and syllabi.", icon: "✍️" },
      { title: "Education Officer", description: "Serve in government education departments and policy units.", icon: "⚖️" }
    ],
    learningOutcomes: [
      "Proficiency in innovative pedagogical techniques.",
      "Ability to design and evaluate educational assessments.",
      "Expertise in child psychology and inclusive education."
    ],
    curriculumOverview: "Specialization in Major English and Major Nepali with Population Minor.",
    curriculum: [
      { year: "1st Year", subjects: ["General English (Eng.Ed.411)", "Compulsory Nepali (Nep. 401)", "Philosophical and Sociological Foundations of Education (Ed.412)", "Foundation of Language and Linguistics (Eng.Ed.416)", "Reading Writing and Critical Thinking (Eng. Ed. 417)", "Nepali Katha Ra Upanyas (Nep.Ed.416)", "Nepali Natak Ekanki Ra Nibandha (Nep.Ed.417)", "Foundation of Population Education (Pop.Ed.418)"] }
    ],
    syllabusLink: "https://gmmc.edu.np/bachelor-in-education-b-ed/",
    noticesCategory: "B.Ed",
    gallery: [
      "/images/gallery/bed-practice.jpg",
      "/images/gallery/campus-library.jpg"
    ]
  },
  mbs: {
    title: "Master of Business Studies (MBS)",
    slug: "mbs",
    heroImage: "/images/programs/hero-mbs.png",
    coordinatorImage: "/images/coordinators/mbs.png",
    shortDescription: "An advanced postgraduate degree for strategic leadership and research in business management.",
    coordinatorName: "MBS Coordinator",
    coordinatorMessage: "Since 2018, our MBS program has been the choice for professionals seeking to lead Gandaki Province's corporate sector. We pride ourselves on academic rigor.",
    coordinatorContact: { phone: "061-455677", email: "mbs.coord@gmmc.edu.np" },
    duration: "2 Years (4 Semesters)",
    affiliation: "Tribhuvan University",
    eligibility: ["Successfully completed BBS or Bachelor degree in any discipline.", "Commitment to 80% attendance."],
    careerProspects: ["Strategic Leadership", "Consultancy", "Academic Research"],
    careerPathways: [
      { title: "Operations Director", description: "Manage complex logistics and production at a strategic level.", icon: "🏗️" },
      { title: "Business Consultant", description: "Provide high-level advice to international corporations.", icon: "💡" },
      { title: "Strategic Researcher", description: "Drive innovation through data-driven business research.", icon: "📊" }
    ],
    learningOutcomes: [
      "Advanced proficiency in managerial economics and statistical methods.",
      "Strategic mastery of international business operations.",
      "Conducting and publishing meaningful academic research."
    ],
    curriculumOverview: "Semester-based system including core courses and a mandatory dissertation.",
    curriculum: [
      { semester: "1st Semester", subjects: ["Marketing Management", "Managerial Economics", "Statistical Methods", "OB"] }
    ],
    syllabusLink: "https://gmmc.edu.np/master-of-business-studies-mbs/",
    noticesCategory: "MBS",
    gallery: [
      "/images/gallery/mbs-research.jpg",
      "/images/gallery/corporate-visit.jpg"
    ]
  },
  bitm: {
    title: "Bachelor of Information Technology Management (BITM)",
    slug: "bitm",
    heroImage: "/images/programs/hero-bitm.png",
    coordinatorImage: "/images/coordinators/it.png",
    shortDescription: "A cutting-edge program merging technical IT mastery with organizational leadership skills.",
    coordinatorName: "IT Coordinator",
    coordinatorMessage: "Our BITM students enjoy access to modern labs and non-credit courses in emerging tech like AI and Cloud Computing. We bridge the gap between code and commerce.",
    coordinatorContact: { phone: "061-455677", email: "it.dept@gmmc.edu.np" },
    duration: "4 Years (8 Semesters)",
    affiliation: "Tribhuvan University",
    eligibility: ["10+2 with CGPA 1.8+.", "Successful CMAT entrance exam performance."],
    careerProspects: ["Software Engineering", "IT Management", "System Analysis"],
    careerPathways: [
      { title: "IT Manager", description: "Lead technical teams and manage organizational infrastructure.", icon: "🖥️" },
      { title: "Systems Analyst", description: "Optimize business processes through technology solutions.", icon: "🔍" },
      { title: "Full-Stack Developer", description: "Build modern web and mobile applications from scratch.", icon: "💻" }
    ],
    learningOutcomes: [
      "Full competency in C, Java, and Database programming.",
      "Expertise in IT project management and system security.",
      "Ability to lead digital transformation in any organization."
    ],
    facilities: [
      { name: "Modern Computing Lab", description: "High-performance workstations with high-speed internet access." },
      { name: "Innovation Studio", description: "Collaborative space for hackathons and software projects." }
    ],
    curriculumOverview: "Project-based learning with mandatory industrial internships.",
    curriculum: [
      { semester: "1st Semester", subjects: ["Programming in C", "Computer Systems", "Mathematics", "English"] }
    ],
    syllabusLink: "https://gmmc.edu.np/bachelor-of-information-management-bim/",
    noticesCategory: "BITM",
    gallery: [
      "/images/gallery/it-lab-1.jpg",
      "/images/gallery/coding-session.jpg"
    ]
  },
  bhm: {
    title: "Bachelor of Hotel Management (BHM)",
    slug: "bhm",
    heroImage: "/images/programs/hero-bhm.png",
    coordinatorImage: "/images/coordinators/bhm.png",
    shortDescription: "A world-class hospitality course featuring international internships and professional training facilities.",
    coordinatorName: "BHM Coordinator",
    coordinatorMessage: "With two professional kitchens and a fine dining restaurant on campus, our BHM program offers the most realistic training environment in Pokhara.",
    coordinatorContact: { phone: "061-455677", email: "bhm.dept@gmmc.edu.np" },
    duration: "4 Years (8 Semesters)",
    affiliation: "Tribhuvan University",
    eligibility: ["10+2 passing", "Minimum 1.8 CGPA", "Passion for hospitality."],
    careerProspects: ["Hotel Management", "Culinary Arts", "Cruise/Aviation careers"],
    careerPathways: [
      { title: "Executive Chef", description: "Lead high-end kitchens in international five-star hotels.", icon: "👨‍🍳" },
      { title: "Restaurant Manager", description: "Direct food and beverage services at premium global venues.", icon: "🍽️" },
      { title: "Hospitality Executive", description: "Manage front-office and guest relations on a global scale.", icon: "🛎️" }
    ],
    learningOutcomes: [
      "Professional mastery of culinary arts and table service.",
      "Strategic management of food and beverage operations.",
      "Global hospitality standards and guest relation excellence."
    ],
    facilities: [
      { name: "Training Kitchens", description: "Two fully-equipped commercial kitchens for practical culinary training." },
      { name: "Fine Dining Restaurant", description: "Realistic restaurant environment for F&B service training." },
      { name: "Mock Bar & Coffee Shop", description: "Professional bar setup for bartending and barista skills." }
    ],
    curriculumOverview: "Practical-first approach with international internships in semesters 6 and 7.",
    curriculum: [
      { year: "Foundational Skills", subjects: ["Food Production", "F&B Service", "Housekeeping", "Front Office"] }
    ],
    syllabusLink: "https://gmmc.edu.np/bachelor-of-hotel-management-bhm/",
    noticesCategory: "BHM",
    gallery: [
      "/images/gallery/bhm-kitchen.jpg",
      "/images/gallery/dining-service.jpg"
    ]
  }
};
