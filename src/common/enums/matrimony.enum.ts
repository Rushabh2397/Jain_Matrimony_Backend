export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
}

export enum MaritalStatus {
  NEVER_MARRIED = 'Never Married',
  DIVORCED = 'Divorced',
  WIDOWED = 'Widowed',
  AWAITING_DIVORCE = 'Awaiting Divorce',
}

export enum Sect {
  MURTIPUJAK = 'Murtipujak (Deravasi)',
  STHANAKVASI = 'Sthanakvasi',
  TERAPANTHI = 'Terapanthi',
  OTHER = 'Other',
}

export enum SubSect {
  OSWAL = 'Oswal',
  VISA_OSWAL = 'Visa Oswal',
  DASA_OSWAL = 'Dasa Oswal',
  SHRIMAL = 'Shrimal',
  VISA_SHRIMAL = 'Visa Shrimal',
  PORWAL = 'Porwal',
  KHANDELWAL = 'Khandelwal',
  HUMAD = 'Humad',
  NEMA = 'Nema',
  AGRAWAL = 'Agrawal',
  UNSPECIFIED = 'Unspecified / No Bar',
}

export enum Diet {
  STRICT_JAIN = 'Strict Jain (No Root Vegetables)',
  CHOVIHAR_JAIN = 'Jain + Regular Chovihar',
  REGULAR_JAIN = 'Regular Jain (Vegetarian)',
  VEGAN = 'Vegan',
}

export enum EducationLevel {
  HIGH_SCHOOL = 'High School / Diploma',
  BACHELORS = 'Bachelors (B.Com / B.Tech / BA / BBA / B.Sc)',
  MASTERS = 'Masters (MBA / M.Tech / M.Com / MS)',
  CA_CS_CFA = 'CA / CS / CFA / ICWA',
  MEDICAL = 'Medical (MBBS / MD / BDS / MDS / BAMS)',
  LEGAL = 'Law (LLB / LLM)',
  DOCTORATE = 'Doctorate / PhD',
  OTHER = 'Other',
}

export enum OccupationType {
  BUSINESS_ENTREPRENEUR = 'Business / Family Business / Entrepreneur',
  CA_FINANCE = 'Chartered Accountant / Finance / Investment Banking',
  SOFTWARE_IT = 'Software Engineer / IT Professional',
  DOCTOR_HEALTHCARE = 'Doctor / Healthcare Professional',
  CONSULTANT_CORPORATE = 'Corporate / Management / Consultant',
  LAWYER_LEGAL = 'Lawyer / Legal Professional',
  GOVT_CIVIL_SERVICES = 'Government / Civil Services',
  ARCHITECT_DESIGNER = 'Architect / Interior / Fashion Designer',
  HOMEMAKER = 'Homemaker / Not Working',
  STUDENT = 'Student',
  OTHER = 'Other',
}

export enum IncomeRange {
  NO_INCOME = 'Not Working / Homemaker / Student',
  UNDER_5_LPA = 'Under 5 LPA',
  LPA_5_10 = '5 - 10 LPA',
  LPA_10_20 = '10 - 20 LPA',
  LPA_20_35 = '20 - 35 LPA',
  LPA_35_50 = '35 - 50 LPA',
  ABOVE_50_LPA = '50+ LPA',
}



export enum FamilyType {
  JOINT = 'Joint Family',
  NUCLEAR = 'Nuclear Family',
}

export enum UserRole {
  USER = 'User',
  ADMIN = 'Admin',
}