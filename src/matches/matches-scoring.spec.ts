import { describe, it, expect } from 'vitest';
import {
  calculateAge,
  calculateCompatibility,
  buildScoreSql,
  buildScoringParameters,
} from './matches-scoring.js';
import { User } from '../users/entities/user.entity.js';
import { PartnerPreferences } from '../users/entities/partner-preferences.entity.js';
import {
  Gender,
  MaritalStatus,
  Sect,
  SubSect,
  Diet,
} from '../common/enums/matrimony.enum.js';

describe('SoulSync Scoring Engine (matches-scoring)', () => {
  describe('calculateAge', () => {
    it('should return null for null/undefined/invalid date', () => {
      expect(calculateAge(null)).toBeNull();
      expect(calculateAge(undefined)).toBeNull();
      expect(calculateAge('invalid-date')).toBeNull();
    });

    it('should calculate age accurately based on today', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 25;
      const dob = new Date(birthYear, today.getMonth(), today.getDate());
      expect(calculateAge(dob)).toBe(25);
    });
  });

  describe('calculateCompatibility', () => {
    const baseUser: Partial<User> = {
      id: 'user-1',
      fullName: 'Aarav Shah',
      gender: Gender.MALE,
      dateOfBirth: new Date('1998-05-15'), // ~28 years old
      maritalStatus: MaritalStatus.NEVER_MARRIED,
      sect: Sect.MURTIPUJAK,
      subSect: SubSect.OSWAL,
      diet: Diet.STRICT_JAIN,
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
    };

    it('should calculate 100% compatibility for an ideal match', () => {
      const candidate: Partial<User> = {
        id: 'candidate-1',
        fullName: 'Pooja Mehta',
        gender: Gender.FEMALE,
        dateOfBirth: new Date('1999-05-15'), // 27 years old (within age range)
        maritalStatus: MaritalStatus.NEVER_MARRIED,
        sect: Sect.MURTIPUJAK,
        subSect: SubSect.OSWAL,
        diet: Diet.STRICT_JAIN,
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      };

      const result = calculateCompatibility(
        baseUser as User,
        candidate as User,
      );

      expect(result.score).toBe(100);
      expect(result.breakdown.sect.score).toBe(25);
      expect(result.breakdown.subSect.score).toBe(20);
      expect(result.breakdown.diet.score).toBe(25);
      expect(result.breakdown.age.score).toBe(15);
      expect(result.breakdown.location.score).toBe(15);
    });

    it('should award 20 points for subSect when candidate or user is UNSPECIFIED (No Bar)', () => {
      const candidate: Partial<User> = {
        id: 'cand-nobar',
        gender: Gender.FEMALE,
        sect: Sect.MURTIPUJAK,
        subSect: SubSect.UNSPECIFIED,
        diet: Diet.STRICT_JAIN,
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      };

      const result = calculateCompatibility(
        baseUser as User,
        candidate as User,
      );

      expect(result.breakdown.subSect.score).toBe(20);
      expect(result.breakdown.subSect.description).toContain('no bar / open');
    });

    it('should award 15 points for compatible sub-sect lineage (e.g. Oswal & Visa Oswal)', () => {
      const candidate: Partial<User> = {
        id: 'cand-lineage',
        gender: Gender.FEMALE,
        sect: Sect.MURTIPUJAK,
        subSect: SubSect.VISA_OSWAL,
        diet: Diet.STRICT_JAIN,
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      };

      const result = calculateCompatibility(
        baseUser as User,
        candidate as User,
      );

      expect(result.breakdown.subSect.score).toBe(15);
      expect(result.breakdown.subSect.description).toContain('lineage');
    });

    it('should award partial points for compatible Shwetambar Jain sects and diets', () => {
      const candidate: Partial<User> = {
        id: 'cand-intersect',
        gender: Gender.FEMALE,
        sect: Sect.STHANAKVASI, // Inter-sect Shwetambar Jain
        subSect: SubSect.PORWAL,
        diet: Diet.CHOVIHAR_JAIN, // Strict Jain <-> Chovihar Jain
        city: 'Pune',
        state: 'Maharashtra', // Same state (10 points)
        country: 'India',
      };

      const result = calculateCompatibility(
        baseUser as User,
        candidate as User,
      );

      expect(result.breakdown.sect.score).toBe(15);
      expect(result.breakdown.subSect.score).toBe(0);
      expect(result.breakdown.diet.score).toBe(20);
      expect(result.breakdown.location.score).toBe(10);
    });

    it('should score accurately based on explicit PartnerPreferences', () => {
      const candidate: Partial<User> = {
        id: 'cand-custom',
        gender: Gender.FEMALE,
        dateOfBirth: new Date('1996-01-01'), // ~30 years old
        sect: Sect.TERAPANTHI,
        subSect: SubSect.PORWAL,
        diet: Diet.VEGAN,
        city: 'Ahmedabad',
        state: 'Gujarat',
        country: 'India',
      };

      const preferences: Partial<PartnerPreferences> = {
        minAge: 25,
        maxAge: 32,
        preferredSects: [Sect.TERAPANTHI],
        preferredSubSects: [SubSect.PORWAL],
        preferredDiets: [Diet.VEGAN],
        preferredCities: ['Ahmedabad'],
      };

      const result = calculateCompatibility(
        baseUser as User,
        candidate as User,
        preferences as PartnerPreferences,
      );

      expect(result.breakdown.sect.score).toBe(25);
      expect(result.breakdown.subSect.score).toBe(20);
      expect(result.breakdown.diet.score).toBe(25);
      expect(result.breakdown.age.score).toBe(15);
      expect(result.breakdown.location.score).toBe(15);
      expect(result.score).toBe(100);
    });
  });

  describe('buildScoreSql and buildScoringParameters', () => {
    it('should generate valid SQL template and parameters', () => {
      const sql = buildScoreSql();
      expect(sql).toContain('CAST(candidate.sect AS text) IN (:...targetSects)');
      expect(sql).toContain('candidate."subSect"');
      expect(sql).toContain('CAST(candidate.diet AS text) IN (:...targetDiets)');
      expect(sql).toContain('candidate."dateOfBirth"');
      expect(sql).toContain('LOWER(candidate.city)');

      const user: Partial<User> = {
        id: 'u1',
        gender: Gender.MALE,
        sect: Sect.MURTIPUJAK,
        subSect: SubSect.OSWAL,
        diet: Diet.STRICT_JAIN,
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      };

      const params = buildScoringParameters(user as User);
      expect(params.targetSects).toEqual([Sect.MURTIPUJAK]);
      expect(params.userSect).toBe(Sect.MURTIPUJAK);
      expect(params.targetSubSects).toEqual([SubSect.OSWAL]);
      expect(params.targetDiets).toEqual([Diet.STRICT_JAIN]);
      expect(params.targetCities).toEqual(['mumbai']);
      expect(params.targetStates).toEqual(['maharashtra']);
      expect(params.userCountry).toBe('india');
    });
  });
});

