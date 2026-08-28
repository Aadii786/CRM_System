"use strict";

// Curated name pools for generating realistic-looking demo data
// (requirements #53: "Pakistani names, international names... not just
// John Doe"). No external faker dependency - a deterministic PRNG plus a
// modest set of real first/last names gives enough variety for 58,000+
// unique-looking records at seed time.

const PAKISTANI_FIRST_NAMES = [
  "Muhammad", "Ahmed", "Ali", "Hassan", "Hussain", "Bilal", "Usman", "Umar",
  "Zain", "Fahad", "Faisal", "Imran", "Kamran", "Tariq", "Adeel", "Asad",
  "Waqas", "Shahid", "Naveed", "Rashid", "Saad", "Salman", "Hamza", "Danish",
  "Farhan", "Junaid", "Kashif", "Nabeel", "Rizwan", "Sohail", "Yasir", "Zeeshan",
  "Ayesha", "Fatima", "Sana", "Hira", "Maria", "Amna", "Zainab", "Mahnoor",
  "Sara", "Iqra", "Rabia", "Nida", "Komal", "Anum", "Areeba", "Bushra",
  "Farah", "Ghazala", "Huma", "Javeria", "Kiran", "Laiba", "Mehak", "Nabila",
  "Noor", "Rukhsana", "Saima", "Sidra", "Tehmina", "Uzma", "Warda", "Yusra",
];

const PAKISTANI_LAST_NAMES = [
  "Khan", "Malik", "Sheikh", "Chaudhry", "Raza", "Iqbal", "Farooq", "Butt",
  "Qureshi", "Abbasi", "Baig", "Awan", "Cheema", "Dar", "Ghori", "Hashmi",
  "Javed", "Kayani", "Lodhi", "Mirza", "Niazi", "Pasha", "Rana", "Siddiqui",
  "Tahir", "Ansari", "Bhatti", "Durrani", "Gill", "Hayat", "Jatoi", "Kiani",
];

const INTERNATIONAL_FIRST_NAMES = [
  "James", "John", "Robert", "Michael", "David", "William", "Richard",
  "Joseph", "Thomas", "Charles", "Daniel", "Matthew", "Andrew", "Steven",
  "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan",
  "Jessica", "Sarah", "Karen", "Emily", "Michelle", "Amanda", "Laura",
  "Wei", "Yuki", "Hiroshi", "Chen", "Li", "Ahmed", "Fatima", "Omar",
  "Sofia", "Carlos", "Priya", "Raj", "Aisha", "Ibrahim", "Layla", "Yusuf",
];

const INTERNATIONAL_LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Anderson", "Taylor", "Thomas", "Moore",
  "Wilson", "Lee", "Walker", "Hall", "Allen", "Young", "King", "Wright",
  "Zhang", "Wang", "Tanaka", "Suzuki", "Kim", "Park", "Al-Sayed", "Hassan",
];

const CITIES = [
  { city: "Lahore", country: "Pakistan" },
  { city: "Karachi", country: "Pakistan" },
  { city: "Islamabad", country: "Pakistan" },
  { city: "Rawalpindi", country: "Pakistan" },
  { city: "Faisalabad", country: "Pakistan" },
  { city: "Multan", country: "Pakistan" },
  { city: "Peshawar", country: "Pakistan" },
  { city: "Quetta", country: "Pakistan" },
  { city: "Sialkot", country: "Pakistan" },
  { city: "Gujranwala", country: "Pakistan" },
  { city: "Dubai", country: "United Arab Emirates" },
  { city: "London", country: "United Kingdom" },
  { city: "Toronto", country: "Canada" },
  { city: "New York", country: "United States" },
  { city: "Riyadh", country: "Saudi Arabia" },
];

const JOB_TITLES = [
  "HR Manager", "Training Coordinator", "CEO", "Managing Director",
  "Marketing Manager", "Operations Manager", "Finance Manager", "Admissions Officer",
  "Program Manager", "Business Development Manager", "Head of L&D", "Director",
  "Assistant Professor", "Research Officer", "Project Manager", "Consultant",
  "Procurement Officer", "IT Manager", "Quality Assurance Lead", "Student",
];

const COMPANY_PREFIXES = [
  "Al-Habib", "Crescent", "Indus", "Meridian", "Punjab", "Sindh", "National",
  "Pak", "Sunrise", "Horizon", "Metro", "Continental", "Elite", "Prime",
  "Global", "United", "Star", "Alpha", "Zenith", "Vantage", "Nova", "Apex",
];

const COMPANY_SUFFIXES = [
  "Industries", "Textiles", "Engineering", "Holdings", "Group", "Enterprises",
  "Solutions", "Technologies", "Pharmaceuticals", "Foods", "Motors", "Energy",
  "Logistics", "Construction", "Systems", "Consultants",
];

const GOVERNMENT_ORGS = [
  "Ministry of Education", "Higher Education Commission", "WAPDA", "NADRA",
  "Punjab Skills Development Fund", "Sindh Board of Investment", "PIA",
  "State Bank of Pakistan", "FBR", "NUST", "PITB", "Pakistan Railways",
];

const NGO_ORGS = [
  "Aman Foundation", "TCF Pakistan", "Akhuwat Foundation", "SOS Children's Villages",
  "Rural Support Programme", "Al-Khidmat Foundation", "Sarhad Rural Support Programme",
];

module.exports = {
  PAKISTANI_FIRST_NAMES,
  PAKISTANI_LAST_NAMES,
  INTERNATIONAL_FIRST_NAMES,
  INTERNATIONAL_LAST_NAMES,
  CITIES,
  JOB_TITLES,
  COMPANY_PREFIXES,
  COMPANY_SUFFIXES,
  GOVERNMENT_ORGS,
  NGO_ORGS,
};
