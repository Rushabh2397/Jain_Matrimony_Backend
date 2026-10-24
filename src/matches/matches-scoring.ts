import { User } from '../users/entities/user.entity.js';
import { PartnerPreferences } from '../users/entities/partner-preferences.entity.js';
import {
  Gender,
  Sect,
  SubSect,
  Diet,
} from '../common/enums/matrimony.enum.js';
import {
  CompatibilityResult,
} from './interfaces/match-response.interface.js';

export function calculateAge(dob: Date | string | null | undefined): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function getResolvedPreferences(
  user: User,
  preferences?: PartnerPreferences | null,
) {
  const userAge = calculateAge(user.dateOfBirth);

  const minAge =
    preferences?.minAge ??
    (userAge
      ? user.gender === Gender.MALE
        ? Math.max(18, userAge - 5)
        : Math.max(18, userAge - 2)
      : 21);

  const maxAge =
    preferences?.maxAge ??
    (userAge
      ? user.gender === Gender.MALE
        ? userAge + 1
        : userAge + 5
      : 35);

  const targetSects =
    preferences?.preferredSects && preferences.preferredSects.length > 0
      ? preferences.preferredSects
      : user.sect
        ? [user.sect]
        : [];

  const targetSubSects =
    preferences?.preferredSubSects && preferences.preferredSubSects.length > 0
      ? preferences.preferredSubSects
      : user.subSect
        ? [user.subSect]
        : [];

  const targetDiets =
    preferences?.preferredDiets && preferences.preferredDiets.length > 0
      ? preferences.preferredDiets
      : user.diet
        ? [user.diet]
        : [];

  const targetCities =
    preferences?.preferredCities && preferences.preferredCities.length > 0
      ? preferences.preferredCities.map((c) => c.trim().toLowerCase())
      : user.city
        ? [user.city.trim().toLowerCase()]
        : [];

  const targetStates =
    preferences?.preferredStates && preferences.preferredStates.length > 0
      ? preferences.preferredStates.map((s) => s.trim().toLowerCase())
      : user.state
        ? [user.state.trim().toLowerCase()]
        : [];

  return {
    minAge,
    maxAge,
    targetSects,
    targetSubSects,
    targetDiets,
    targetCities,
    targetStates,
  };
}

export function calculateCompatibility(
  user: User,
  candidate: User,
  preferences?: PartnerPreferences | null,
): CompatibilityResult {
  const {
    minAge,
    maxAge,
    targetSects,
    targetSubSects,
    targetDiets,
    targetCities,
    targetStates,
  } = getResolvedPreferences(user, preferences);

  // 1. Sect Scoring (Max 25)
  let sectScore = 0;
  let sectDesc = 'Different sect';
  const mainstreamJainSects = [Sect.MURTIPUJAK, Sect.STHANAKVASI, Sect.TERAPANTHI];

  if (candidate.sect && targetSects.includes(candidate.sect)) {
    sectScore = 25;
    sectDesc = `Exact sect match (${candidate.sect})`;
  } else if (
    candidate.sect &&
    user.sect &&
    mainstreamJainSects.includes(candidate.sect) &&
    mainstreamJainSects.includes(user.sect)
  ) {
    sectScore = 15;
    sectDesc = `Compatible Shwetambar Jain sect (${candidate.sect})`;
  }

  // 2. Sub-Sect Scoring (Max 20)
  let subSectScore = 0;
  let subSectDesc = 'Different sub-sect';

  const isNoBar =
    candidate.subSect === SubSect.UNSPECIFIED ||
    user.subSect === SubSect.UNSPECIFIED ||
    targetSubSects.includes(SubSect.UNSPECIFIED);

  if (isNoBar) {
    subSectScore = 20;
    subSectDesc = 'Sub-sect no bar / open';
  } else if (candidate.subSect && targetSubSects.includes(candidate.subSect)) {
    subSectScore = 20;
    subSectDesc = `Exact sub-sect match (${candidate.subSect})`;
  } else if (
    candidate.subSect &&
    user.subSect &&
    ((candidate.subSect.includes('Oswal') && user.subSect.includes('Oswal')) ||
      (candidate.subSect.includes('Shrimal') && user.subSect.includes('Shrimal')))
  ) {
    subSectScore = 15;
    subSectDesc = `Compatible sub-sect lineage (${candidate.subSect})`;
  }

  // 3. Diet Scoring (Max 25)
  let dietScore = 0;
  let dietDesc = 'Diet preferences differ';

  if (candidate.diet && targetDiets.includes(candidate.diet)) {
    dietScore = 25;
    dietDesc = `Exact dietary match (${candidate.diet})`;
  } else if (
    (candidate.diet === Diet.STRICT_JAIN && user.diet === Diet.CHOVIHAR_JAIN) ||
    (candidate.diet === Diet.CHOVIHAR_JAIN && user.diet === Diet.STRICT_JAIN)
  ) {
    dietScore = 20;
    dietDesc = 'Strict Jain / Chovihar compatible';
  } else if (candidate.diet && user.diet) {
    dietScore = 15;
    dietDesc = `Jain dietary compatible (${candidate.diet})`;
  }

  // 4. Age Scoring (Max 15)
  let ageScore = 0;
  let ageDesc = 'Date of birth not provided';
  const candidateAge = calculateAge(candidate.dateOfBirth);

  if (candidateAge !== null) {
    if (candidateAge >= minAge && candidateAge <= maxAge) {
      ageScore = 15;
      ageDesc = `Within preferred age range (${minAge}-${maxAge} yrs)`;
    } else if (candidateAge >= minAge - 2 && candidateAge <= maxAge + 2) {
      ageScore = 8;
      ageDesc = `Near preferred age range (${candidateAge} yrs)`;
    } else if (candidateAge >= minAge - 4 && candidateAge <= maxAge + 4) {
      ageScore = 4;
      ageDesc = `Close to preferred age range (${candidateAge} yrs)`;
    } else {
      ageScore = 0;
      ageDesc = `Outside preferred age range (${candidateAge} yrs)`;
    }
  }

  // 5. Location Scoring (Max 15)
  let locScore = 0;
  let locDesc = 'Different location';

  const candidateCity = candidate.city ? candidate.city.trim().toLowerCase() : null;
  const candidateState = candidate.state ? candidate.state.trim().toLowerCase() : null;
  const candidateCountry = candidate.country ? candidate.country.trim().toLowerCase() : null;
  const userCountry = user.country ? user.country.trim().toLowerCase() : null;

  if (candidateCity && targetCities.includes(candidateCity)) {
    locScore = 15;
    locDesc = `Matching city (${candidate.city})`;
  } else if (candidateState && targetStates.includes(candidateState)) {
    locScore = 10;
    locDesc = `Matching state (${candidate.state})`;
  } else if (candidateCountry && userCountry && candidateCountry === userCountry) {
    locScore = 5;
    locDesc = `Matching country (${candidate.country})`;
  }

  const totalScore = Math.min(100, sectScore + subSectScore + dietScore + ageScore + locScore);

  return {
    score: totalScore,
    breakdown: {
      sect: { score: sectScore, max: 25, description: sectDesc },
      subSect: { score: subSectScore, max: 20, description: subSectDesc },
      diet: { score: dietScore, max: 25, description: dietDesc },
      age: { score: ageScore, max: 15, description: ageDesc },
      location: { score: locScore, max: 15, description: locDesc },
    },
  };
}

export function buildScoreSql(): string {
  return `(
    (CASE
      WHEN CAST(candidate.sect AS text) IN (:...targetSects) THEN 25
      WHEN CAST(candidate.sect AS text) IN ('Murtipujak (Deravasi)', 'Sthanakvasi', 'Terapanthi')
           AND :userSect IN ('Murtipujak (Deravasi)', 'Sthanakvasi', 'Terapanthi') THEN 15
      ELSE 0
    END)
    +
    (CASE
      WHEN CAST(candidate."subSect" AS text) = 'Unspecified / No Bar' OR :userSubSect = 'Unspecified / No Bar' OR 'Unspecified / No Bar' IN (:...targetSubSects) THEN 20
      WHEN CAST(candidate."subSect" AS text) IN (:...targetSubSects) THEN 20
      WHEN (:userSubSect LIKE '%Oswal%' AND CAST(candidate."subSect" AS text) LIKE '%Oswal%') OR
           (:userSubSect LIKE '%Shrimal%' AND CAST(candidate."subSect" AS text) LIKE '%Shrimal%') THEN 15
      ELSE 0
    END)
    +
    (CASE
      WHEN CAST(candidate.diet AS text) IN (:...targetDiets) THEN 25
      WHEN (CAST(candidate.diet AS text) = 'Strict Jain (No Root Vegetables)' AND :userDiet = 'Jain + Regular Chovihar') OR
           (CAST(candidate.diet AS text) = 'Jain + Regular Chovihar' AND :userDiet = 'Strict Jain (No Root Vegetables)') THEN 20
      WHEN candidate.diet IS NOT NULL AND :userDiet != '__NONE__' THEN 15
      ELSE 0
    END)
    +
    (CASE
      WHEN candidate."dateOfBirth" IS NULL THEN 0
      WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, candidate."dateOfBirth")) BETWEEN :minAge AND :maxAge THEN 15
      WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, candidate."dateOfBirth")) BETWEEN (:minAge - 2) AND (:maxAge + 2) THEN 8
      WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, candidate."dateOfBirth")) BETWEEN (:minAge - 4) AND (:maxAge + 4) THEN 4
      ELSE 0
    END)
    +
    (CASE
      WHEN candidate.city IS NOT NULL AND LOWER(candidate.city) IN (:...targetCities) THEN 15
      WHEN candidate.state IS NOT NULL AND LOWER(candidate.state) IN (:...targetStates) THEN 10
      WHEN candidate.country IS NOT NULL AND :userCountry != '__NONE__' AND LOWER(candidate.country) = LOWER(:userCountry) THEN 5
      ELSE 0
    END)
  )`;
}

export function buildScoringParameters(
  user: User,
  preferences?: PartnerPreferences | null,
): Record<string, any> {
  const {
    minAge,
    maxAge,
    targetSects,
    targetSubSects,
    targetDiets,
    targetCities,
    targetStates,
  } = getResolvedPreferences(user, preferences);

  return {
    targetSects: targetSects.length > 0 ? targetSects : ['__NONE__'],
    userSect: user.sect ?? '__NONE__',
    targetSubSects: targetSubSects.length > 0 ? targetSubSects : ['__NONE__'],
    userSubSect: user.subSect ?? '__NONE__',
    targetDiets: targetDiets.length > 0 ? targetDiets : ['__NONE__'],
    userDiet: user.diet ?? '__NONE__',
    minAge,
    maxAge,
    targetCities: targetCities.length > 0 ? targetCities : ['__NONE__'],
    targetStates: targetStates.length > 0 ? targetStates : ['__NONE__'],
    userCountry: user.country ? user.country.trim().toLowerCase() : '__NONE__',
  };
}

