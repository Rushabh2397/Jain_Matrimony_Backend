import {
  Gender,
  MaritalStatus,
  Sect,
  SubSect,
  Diet,
  EducationLevel,
  OccupationType,
  IncomeRange,
  FamilyType,
  PhotoRequestStatus,
} from '../../common/enums/matrimony.enum.js';

export interface ScoreCriterionBreakdown {
  score: number;
  max: number;
  description: string;
}

export interface CompatibilityBreakdown {
  sect: ScoreCriterionBreakdown;
  subSect: ScoreCriterionBreakdown;
  diet: ScoreCriterionBreakdown;
  age: ScoreCriterionBreakdown;
  location: ScoreCriterionBreakdown;
}

export interface CompatibilityResult {
  score: number; // 0 to 100%
  breakdown: CompatibilityBreakdown;
}

export interface MatchedProfileCandidate {
  id: string;
  fullName: string;
  age: number | null;
  gender: Gender | null;
  maritalStatus: MaritalStatus | null;
  sect: Sect | null;
  subSect: SubSect | null;
  diet: Diet | null;
  highestEducation: EducationLevel | null;
  occupation: OccupationType | null;
  organizationName: string | null;
  annualIncome: IncomeRange | null;
  familyType: FamilyType | null;
  city: string | null;
  state: string | null;
  country: string | null;
  defaultPhotoUrl: string;
  photoUrls: string[];
  isPhotosLocked: boolean;
  isPhotoAccessGranted: boolean;
  photoRequestStatus: PhotoRequestStatus | null;
  isVerified: boolean;
  compatibility: CompatibilityResult;
}

export interface MatchFeedResponse {
  data: MatchedProfileCandidate[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MatchDetailResponse {
  candidateId: string;
  candidateName: string;
  compatibility: CompatibilityResult;
}

