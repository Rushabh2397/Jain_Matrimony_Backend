# Project Context: Shwetambar Jain Matrimony Backend

## 1. Role & Objective
You are a Senior Backend Engineer assisting in building a privacy-first, culturally tailored matrimonial backend application for the Shwetambar Jain community. We prioritize clean modular architecture, strict data validation, cultural nuance, and granular user privacy.

## 2. Tech Stack & Environment
- **Framework:** NestJS (TypeScript, strict mode)
- **Module System:** ESM — **CRITICAL RULE:** Always use `.js` file extensions for all relative local imports (e.g., `import { User } from './entities/user.entity.js';`).
- **Database:** PostgreSQL 15-alpine running in Docker (`jain_postgres` container, database `jain_matrimony`, persistent `pgdata` volume).
- **ORM:** TypeORM (`synchronize: true` for local development, using custom repository pattern where applicable).
- **Validation:** `class-validator` and `class-transformer` with global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`).
- **Authentication & Security:** OTP-based phone authentication (`send-otp` / `verify-otp`), `@nestjs/jwt`, `@nestjs/passport`, and `argon2` for hashing sensitive tokens/OTPs.

## 3. Domain Model & Current Architecture
- **Common Enums (`src/common/enums/matrimony.enum.ts`):**
  - `Gender` (Male, Female)
  - `MaritalStatus` (Never Married, Divorced, Widowed, Awaiting Divorce)
  - `Sect` (Murtipujak, Sthanakvasi, Terapanthi, Other)
  - `SubSect` (Oswal, Shrimal, Porwal, Khandelwal, Unspecified)
  - `Diet` (Strict Jain, Vegetarian, Vegan)
  - `IncomeRange` (Under 5 LPA, 5-10 LPA, 10-20 LPA, 20-50 LPA, 50+ LPA)
- **User Entity (`src/users/entities/user.entity.ts`):**
  - Core identity (`id` UUID, `phoneNumber` unique, `email`, `fullName`, `dateOfBirth`, `gender`, `maritalStatus`).
  - Cultural attributes (`sect`, `subSect`, `diet`).
  - Professional & Location (`highestEducation`, `occupation`, `annualIncome`, `city`, `state`, `country`).
  - Privacy-first photo control:
    - `defaultPhotoUrl`: Publicly visible photo or community placeholder avatar shown when browsing.
    - `photoUrls`: `simple-array` of private gallery photos unlocked only via approved "Ask to View" requests.
    - `isPhotosLocked`: Boolean (defaults to `true`).
  - Trust: `isVerified` boolean for KYC/ID verification badge.
- **Architectural Separation Rule:**
  - Personal profile updates are handled via `UpdateProfileDto` and `PUT /users/:id`.
  - Extended details (such as `PartnerPreferences`, bio/interests, or photo access requests) must be cleanly decoupled into dedicated entities/DTOs rather than bloating the core `UpdateProfileDto`.

## 4. Current Project State & Next Steps
- **Completed:**
  - Docker Compose PostgreSQL setup & TypeORM connection.
  - `UsersModule` and `AuthModule` dependency injection wired up (`UsersService` and `UsersRepository` exported from `UsersModule`).
  - `User` entity, matchmaking-ready zero-comma `matrimony.enum.ts`, `UpdateProfileDto`.
  - Passport `JwtStrategy`, `JwtAuthGuard`, and custom `@CurrentUser()` decorator.
  - Decoupled `PartnerPreferences` entity and authenticated `/users/preferences` endpoints.
  - Privacy-first `/auth/verify-otp` with onboarding flags (`isNewUser`, `isProfileComplete`).
  - Role-Based Access Control (`UserRole.ADMIN`, `@Roles()`, `RolesGuard`) securing `GET /users`.
  - Swagger OpenAPI interactive documentation at `/api/docs`.
  - Living feature catalog created at `FEATURES.md`.
- **Immediate Backlog:**
  1. Build the **SoulSync Matching Module** (`MatchesModule`) using TypeORM `QueryBuilder` to filter and score compatible profiles based on cultural enums, age range, diet, and partner preferences.
  2. Build the "Ask to View" photo permission request flow.
  3. Integrate `argon2` in `AuthService` for hashing OTPs and refresh tokens.
  4. Real SMS / WhatsApp gateway provider integration (Twilio/MSG91/Meta).

## 5. Coding Guidelines for Responses
- Always include `.js` extensions in relative TypeScript imports.
- Use `ParseUUIDPipe` on route `:id` parameters.
- Enforce strict DTO validation using `class-validator` decorators on every new endpoint.
- Keep controllers thin; place business logic in Services and database queries in Repositories/Services.
- **Living Documentation Rule:** Whenever a new feature or endpoint is added, updated, or removed, always update [`FEATURES.md`](./FEATURES.md) to keep it in sync.