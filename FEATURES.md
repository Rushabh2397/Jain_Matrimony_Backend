# 💍 Shwetambar Jain Matrimony Backend — Feature Catalog

> **Living Documentation**: This document tracks the implemented features, architectural decisions, and current capabilities of the application. It is updated whenever new features are introduced.

---

## 🏛️ System Architecture & Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Framework** | **NestJS 12** (TypeScript, Strict Mode) | Modular architecture, dependency injection, global pipes, interceptors. |
| **Module System** | **ECMAScript Modules (ESM)** | `type: "module"` with strict `.js` extensions on all local relative imports. |
| **Database** | **PostgreSQL 15-alpine** | Running via Docker Compose (`jain_postgres`), persistent storage via `pgdata` volume. |
| **ORM** | **TypeORM 1.1** | Synchronize enabled in dev; relation handling via `Relation<T>` to avoid ESM TDZ circular dependencies. |
| **Documentation** | **Swagger / OpenAPI 3.0** | Hosted at `http://localhost:3000/api/docs` with Bearer auth support (`JWT-auth`). |
| **Testing** | **Vitest 4.1** | Fast test runner with coverage and full unit test coverage across modules. |
| **Linting & Code Quality** | **Oxlint** & **Prettier** | High-performance linter and code formatter. |

---

## 🔐 1. Authentication & Security Module (`AuthModule`)

### 1.1 Passwordless Phone OTP Authentication
- **`POST /auth/send-otp`**: Sends a 6-digit verification code to the user's phone number (`+<country_code><number>` in E.164 format). Pre-registers a minimal base account if the phone number is new.
- **`POST /auth/verify-otp`**: Validates the OTP and issues a signed JWT access token.

### 1.2 Privacy-First & Onboarding-Aware Auth Response
- Does **not** leak phone numbers or unpopulated profile rows.
- Returns a streamlined payload with smart onboarding status flags:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": "fd8ee954-1483-4116-a4bf-ebc4d01beba2",
      "isNewUser": true,
      "isProfileComplete": false
    }
  }
  ```
  - `isNewUser`: `true` if core profile info (`gender` and `dateOfBirth`) is missing.
  - `isProfileComplete`: `true` once core matrimonial fields (`gender`, `dateOfBirth`, `maritalStatus`, `sect`, `diet`) are filled.

### 1.3 JWT Strategy & Token Decoupling
- **Token Payload**: Contains strictly `sub` (User UUID) and `role` (`UserRole.USER` or `UserRole.ADMIN`).
- **`JwtStrategy`** (`src/auth/strategies/jwt.strategy.ts`): Decodes and validates bearer tokens from the `Authorization: Bearer <token>` header without database roundtrips.
- **`JwtAuthGuard`** (`src/auth/guards/jwt-auth.guard.ts`): Protects private routes.

### 1.4 Role-Based Access Control (RBAC)
- **`UserRole` Enum**: `USER = 'User'`, `ADMIN = 'Admin'`.
- **`@Roles(...)` Decorator**: Sets required roles on endpoints.
- **`RolesGuard`** (`src/common/guards/roles.guard.ts`): Enforces role checks and issues `403 Forbidden` if unauthorized.

---

## 👤 2. User & Profile Management (`UsersModule`)

### 2.1 Culturally Tailored Shwetambar Jain Domain Model
All enums in `src/common/enums/matrimony.enum.ts` are tailored for the community and engineered with **zero commas** inside string values to ensure safe serialization in PostgreSQL via TypeORM `simple-array`:

- **Gender**: `Male`, `Female`
- **MaritalStatus**: `Never Married`, `Divorced`, `Widowed`, `Awaiting Divorce`
- **Sect**: `Murtipujak (Deravasi)`, `Sthanakvasi`, `Terapanthi`, `Other`
- **SubSect**: `Oswal`, `Visa Oswal`, `Dasa Oswal`, `Shrimal`, `Visa Shrimal`, `Porwal`, `Khandelwal`, `Humad`, `Nema`, `Agrawal`, `Unspecified / No Bar`
- **Diet**: `Strict Jain (No Root Vegetables)`, `Jain + Regular Chovihar`, `Regular Jain (Vegetarian)`, `Vegan`
- **EducationLevel**: `High School / Diploma`, `Bachelors (...)`, `Masters (...)`, `CA / CS / CFA / ICWA`, `Medical (...)`, `Law (...)`, `Doctorate / PhD`, `Other`
- **OccupationType**: `Business / Family Business / Entrepreneur`, `Chartered Accountant / Finance / Investment Banking`, `Software Engineer / IT Professional`, `Doctor / Healthcare Professional`, etc.
- **IncomeRange**: `Not Working / Homemaker / Student`, `Under 5 LPA`, `5 - 10 LPA`, `10 - 20 LPA`, `20 - 35 LPA`, `35 - 50 LPA`, `50+ LPA`
- **FamilyType**: `Joint Family`, `Nuclear Family`

### 2.2 User Profile Entity (`src/users/entities/user.entity.ts`)
- **Identity & Contact**: `id` (UUID), `phoneNumber` (unique), `email`, `fullName`, `dateOfBirth`.
- **Cultural & Religious**: `sect`, `subSect`, `diet`.
- **Professional & Educational**: `highestEducation` (`EducationLevel`), `occupation` (`OccupationType`), `organizationName`, `annualIncome` (`IncomeRange`).
- **Family & Location**: `familyType`, `city`, `state`, `country`.
- **Privacy & Photos**:
  - `defaultPhotoUrl`: Public thumbnail or community placeholder avatar.
  - `photoUrls`: Private gallery photos (`simple-array`).
  - `isPhotosLocked`: Defaults to `true` (unlocked only upon approved "Ask to View" requests).
- **Trust & Admin**: `isVerified` (KYC verified badge), `role` (`UserRole`).

### 2.3 Profile Endpoints
- **`GET /users/profile`** *(Protected via `JwtAuthGuard`)*: Returns the logged-in user's complete profile using `@CurrentUser() user: ActiveUserData`.
- **`PUT /users/profile`** *(Protected via `JwtAuthGuard`)*: Updates the logged-in user's profile with validated DTO (`UpdateProfileDto`).
- **`GET /users/:id`** *(Public / UUID parameter)*: Fetches another user's public profile card.
- **`GET /users`** *(Admin-Only via `RolesGuard` + `@Roles(UserRole.ADMIN)`)*: Full directory dump restricted exclusively to administrators for KYC audits and moderation.

---

## 🎯 3. Decoupled Partner Preferences Module

To prevent profile bloating, partner preferences are cleanly decoupled into their own dedicated database table and endpoints:

### 3.1 Entity Model (`src/users/entities/partner-preferences.entity.ts`)
- Mapped to `partner_preferences` table.
- Bidirectional `OneToOne` relationship with `User` with `onDelete: 'CASCADE'`.
- Uses `Relation<T>` wrappers to resolve TypeScript/ESM circular evaluation issues.
- **Filterable Preference Fields**:
  - `preferredGender`: `Gender`
  - `minAge` & `maxAge`: `int` (18–80)
  - `preferredMaritalStatuses`: `simple-array` of `MaritalStatus`
  - `preferredSects`: `simple-array` of `Sect`
  - `preferredSubSects`: `simple-array` of `SubSect`
  - `preferredDiets`: `simple-array` of `Diet`
  - `preferredEducationLevels`: `simple-array` of `EducationLevel`
  - `preferredOccupations`: `simple-array` of `OccupationType`
  - `minIncome`: `IncomeRange`
  - `preferredFamilyTypes`: `simple-array` of `FamilyType`
  - `preferredCities`: `simple-array` of strings
  - `preferredStates`: `simple-array` of strings

### 3.2 Preference Endpoints
- **`GET /users/preferences`** *(Protected via `JwtAuthGuard`)*: Retrieves the authenticated user's partner preferences.
- **`PUT /users/preferences`** *(Protected via `JwtAuthGuard`)*: Upserts (creates or merges) the authenticated user's preferences via `UpsertPartnerPreferencesDto`.

---

## 🛠️ API Endpoint Matrix

| Method | Endpoint | Auth Required | Role Required | Description |
| :--- | :--- | :---: | :---: | :--- |
| **POST** | `/auth/send-otp` | ❌ No | Anyone | Trigger login OTP |
| **POST** | `/auth/verify-otp` | ❌ No | Anyone | Verify OTP, receive JWT & onboarding flags |
| **GET** | `/users/profile` | ✅ JWT | User / Admin | Retrieve current authenticated profile |
| **PUT** | `/users/profile` | ✅ JWT | User / Admin | Update current profile details |
| **GET** | `/users/preferences` | ✅ JWT | User / Admin | Retrieve current partner preferences |
| **PUT** | `/users/preferences` | ✅ JWT | User / Admin | Upsert current partner preferences |
| **GET** | `/users/:id` | ❌ No | Anyone | View public profile by UUID |
| **GET** | `/users` | ✅ JWT | **Admin Only** | Directory listing for moderation / KYC |

---

## 🚀 Upcoming Backlog (Immediate Roadmap)

1. **SoulSync Matching Engine (`MatchesModule`)**:
   - QueryBuilder scoring engine calculating compatibility % based on Sect, Sub-Sect, Diet, Age, and Location.
   - Discovery feed excluding self, same-gender, and incompatible marital statuses.
2. **"Ask to View" Photo Permission Flow**:
   - Request-based gallery unlock for profiles with `isPhotosLocked = true`.
3. **SMS / WhatsApp Gateway Integration**:
   - Integration with MSG91 / Twilio / WhatsApp Cloud API for live OTPs.
4. **KYC Document Upload & Verification**:
   - Government ID document upload with Admin review workflow to award `isVerified = true`.

