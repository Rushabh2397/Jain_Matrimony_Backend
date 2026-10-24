# 💍 Jain Matrimony Backend — Feature Catalog

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

### 1.1 Passwordless WhatsApp OTP Authentication & Argon2 Hardening (`WhatsAppService` & `OtpService`)
- **Live WhatsApp Delivery**: Dispatches OTPs directly to user WhatsApp accounts via the **Meta WhatsApp Cloud API** (Graph API `v21.0`), supporting both official authentication templates and direct messages.
- **Argon2 In-Memory OTP Hashing**: Generated 6-digit OTPs are never stored in plaintext. They are cryptographically hashed using **Argon2** (`argon2.hash`) before in-memory storage alongside TTL and attempt counters, preventing memory-scraping vulnerabilities.
- **Brute-Force & Rate-Limiting Protection**:
  - **Cooldown**: 30-second cooldown between OTP requests to prevent spamming (`429 Too Many Requests`).
  - **TTL**: 5-minute expiry per OTP code.
  - **Attempt Limit**: Locks out and deletes OTP after 3 failed verification attempts.
  - **One-Time Use**: OTP is immediately cleared after successful validation to prevent replay attacks.
  - **Argon2 Verification**: Verification is performed asynchronously via `argon2.verify(stored.otpHash, submittedOtp)`.
  - **Developer Mock Fallback**: If Meta API credentials are not provided in local dev, logs OTP safely to the console without breaking local workflows.
- **`POST /auth/send-otp`**: Sends a 6-digit verification code to the user's WhatsApp number (`+<country_code><number>` in E.164 format). Pre-registers a minimal base account if new.
- **`POST /auth/verify-otp`**: Validates the WhatsApp OTP via Argon2 and issues dual JWT tokens (short-lived access token + rotating refresh token).

### 1.2 Dual-Token Architecture & Rotating Refresh Tokens
- **Short-Lived Access Token (`accessToken`)**: 15-minute lifespan signed with `JWT_SECRET` containing `{ sub: user.id, role: user.role }`.
- **Long-Lived Refresh Token (`refreshToken`)**: 7-day lifespan signed with `JWT_REFRESH_SECRET` containing `{ sub: user.id, role: user.role, tokenType: 'refresh' }`.
- **Argon2 Token Storage (`User.hashedRefreshToken`)**: The refresh token is hashed with Argon2 before saving to the database. The column is configured with `select: false` so the hash is never accidentally leaked in profile queries.
- **`POST /auth/refresh`**:
  - Verifies the incoming refresh token's JWT signature and expiration.
  - Retrieves the user with `hashedRefreshToken` and validates the raw token against the hash using `argon2.verify`.
  - Atomically issues fresh access and rotated refresh tokens, updates the database with the new Argon2 hash, and invalidates the previous refresh token.
- **`POST /auth/logout`** *(Protected via `JwtAuthGuard`)*:
  - Immediately revokes the active session by setting `hashedRefreshToken = null` in the database.

### 1.3 Privacy-First & Onboarding-Aware Auth Response
- Does **not** leak phone numbers or unpopulated profile rows.
- Returns a streamlined payload with smart onboarding status flags and dual tokens:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1Ni...",
    "refreshToken": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": "fd8ee954-1483-4116-a4bf-ebc4d01beba2",
      "isNewUser": true,
      "isProfileComplete": false
    }
  }
  ```
  - `isNewUser`: `true` if core profile info (`gender` and `dateOfBirth`) is missing.
  - `isProfileComplete`: `true` once core matrimonial fields (`gender`, `dateOfBirth`, `maritalStatus`, `sect`, `diet`) are filled.

### 1.4 JWT Strategy & Token Decoupling
- **Token Payload**: Contains strictly `sub` (User UUID) and `role` (`UserRole.USER` or `UserRole.ADMIN`).
- **`JwtStrategy`** (`src/auth/strategies/jwt.strategy.ts`): Decodes and validates bearer tokens from the `Authorization: Bearer <token>` header without database roundtrips.
- **`JwtAuthGuard`** (`src/auth/guards/jwt-auth.guard.ts`): Protects private routes.

### 1.5 Role-Based Access Control (RBAC)
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
- **`GET /users/:id`** *(Protected via `JwtAuthGuard`)*: Fetches another user's profile card with dynamic photo-gating based on interest status (photoUrls unlocked if own profile, if candidate unlocked photos, if interest accepted, or if candidate granted photo access on their interest).
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

## 📜 4. Decoupled Extended Profile Details (`ProfileDetails`)

To keep the core `User` model lightweight and modular, extensive bio, lifestyle, Shwetambar Jain family lineage, and astrological details are decoupled into a dedicated `ProfileDetails` entity (`profile_details` table):

### 4.1 Entity Model (`src/users/entities/profile-details.entity.ts`)
- Mapped to `profile_details` table with a bidirectional `OneToOne` relationship to `User` (`onDelete: 'CASCADE'`).
- Uses `Relation<T>` wrappers to resolve TypeScript/ESM circular evaluation issues.
- **Bio & Lifestyle**:
  - `bio`: About Me / Partner Expectations personal narrative (up to 1,500 chars).
  - `hobbies`: `simple-array` of comma-free hobby strings (e.g. *Travelling, Reading, Garba, Yoga*).
  - `heightCm`: Height in centimeters (`120` to `230` cm) for clean numeric range querying.
  - `languagesKnown`: `simple-array` of comma-free strings (e.g. *Gujarati, Marwari, Hindi, English*).
- **Shwetambar Jain Cultural & Family Details**:
  - `gotra`: Clan / Gotra lineage.
  - `nativePlace`: Vatan / Ancestral hometown (Gujarat, Rajasthan, etc.).
  - `mosal`: Maternal family surname / ancestral place (essential in Shwetambar Jain community matchmaking).
  - `fatherName` & `fatherOccupation`: Father's identity and professional background.
  - `motherName` & `motherOccupation`: Mother's identity and background.
  - `brothersCount` & `marriedBrothersCount`: Number of brothers and married brothers.
  - `sistersCount` & `marriedSistersCount`: Number of sisters and married sisters.
- **Astrology / Kundli Details (Optional)**:
  - `timeOfBirth`: Birth time string (e.g. `"14:30"`).
  - `placeOfBirth`: Birth city/town for horoscope and kundli matching.

### 4.2 Endpoints & Automatic Inclusion
- **`GET /users/profile/details`** *(Protected via `JwtAuthGuard`)*: Retrieves the authenticated user's profile details.
- **`PUT /users/profile/details`** *(Protected via `JwtAuthGuard`)*: Upserts (creates or merges) the authenticated user's profile details via `UpsertProfileDetailsDto`.
- **Automatic Relation Loading**: Both `GET /users/profile` and `GET /users/:id` automatically eagerly load `profileDetails` so candidates' complete biodata is returned in profile views.

---

## 🔮 5. SoulSync Matching Engine (`MatchesModule`)

The **SoulSync Matching Engine** computes dynamic compatibility scores across cultural, religious, and personal dimensions directly inside PostgreSQL via TypeORM `QueryBuilder`.

### 5.1 Discovery Feed Filters
When an authenticated user requests their discovery feed (`GET /matches`):
- **Excludes Self**: `candidate.id != :currentUserId`
- **Excludes Same-Gender**: Restricts matches strictly to the target gender (`candidate.gender = :targetGender`), respecting preferences or defaulting to opposite gender.
- **Excludes Incompatible Marital Statuses**: Matches candidate's marital status against the user's `preferredMaritalStatuses`. Defaults to compatible statuses (e.g. `Never Married` with `Never Married`).
- **Excludes Interacted Profiles by Default (`includeInteracted: false`)**: Automatically runs a `NOT EXISTS` subquery against `interest_requests` so profiles where an interest was already sent or received in either direction are excluded from the discovery feed. Setting `includeInteracted=true` surfaces interacted profiles.
- **Profile Completion Guard**: Requires basic profile completion (`gender` and `dateOfBirth`) before discovery feed can be accessed.
- **Dynamic Photo Unlocking via InterestRequest**: Efficiently batch-checks `interest_requests` for the returned page of candidates. Photo gallery (`photoUrls`) is unlocked if candidate has `isPhotosLocked: false`, if an interest handshake between the users is `ACCEPTED`, or if the candidate sent an interest with `grantPhotoAccess: true`. Otherwise, `photoUrls` defaults to `[]` and only `defaultPhotoUrl` is visible. Response includes `isPhotoAccessGranted: boolean`.

### 4.2 SoulSync Compatibility Scoring Formula (100% Total)

| Dimension | Max Weight | Matching Rules & Cultural Nuances |
| :--- | :---: | :--- |
| **Sect** | **25%** | • **25 pts**: Candidate sect matches user preference/sect.<br>• **15 pts**: Compatible Shwetambar Jain sects (*Murtipujak / Sthanakvasi / Terapanthi*).<br>• **0 pts**: Incompatible or different sect. |
| **Sub-Sect** | **20%** | • **20 pts**: Candidate or preference is *Unspecified / No Bar* or exact match.<br>• **15 pts**: Shared sub-sect lineage (e.g. *Oswal* with *Visa/Dasa Oswal*, *Shrimal* with *Visa Shrimal*).<br>• **0 pts**: Different sub-sect. |
| **Diet** | **25%** | • **25 pts**: Exact dietary match (*Strict Jain, Vegan, etc.*).<br>• **20 pts**: *Strict Jain* (No root vegetables) ⇄ *Chovihar Jain* compatibility.<br>• **15 pts**: Compatible Jain diet.<br>• **0 pts**: Incompatible diet. |
| **Age** | **15%** | • **15 pts**: Candidate age falls within `[minAge, maxAge]`.<br>• **8 pts**: Near preferred range (within ±2 years).<br>• **4 pts**: Close to preferred range (within ±4 years).<br>• **0 pts**: Outside window or DOB not provided. |
| **Location** | **15%** | • **15 pts**: City match (case-insensitive).<br>• **10 pts**: State match.<br>• **5 pts**: Country match.<br>• **0 pts**: Outside preferred locations. |

### 4.3 Endpoints
- **`GET /matches`** *(Protected via `JwtAuthGuard`)*: Paginated discovery feed sorted by `match_score DESC` and `candidate.createdAt DESC`. Supports filtering by `minScore`, `sect`, `subSect`, `diet`, `city`, and `includeInteracted` (boolean, default `false`).
- **`GET /matches/:id/score`** *(Protected via `JwtAuthGuard`)*: Detailed compatibility score and breakdown with a specific candidate profile.

---

## 📱 5. Mobile Push Notifications Module (`NotificationsModule`)

Cross-platform mobile push notification engine powered by the **Firebase Admin SDK (FCM)**.

### 5.1 Architecture & Capabilities
- **Firebase Multicast Delivery**: Dispatches push notifications to multiple registered device tokens (`sendEachForMulticast`) simultaneously for user and family/parent devices.
- **Resilient Dev / Mock Mode**: Automatically detects missing Firebase credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) in local environments, gracefully falling back to a structured console logger (`[PUSH NOTIFICATION]`) without crashing the application.
- **Device Token Registry**: Devices register and update their FCM tokens via `PUT /users/fcm-token`, appending new tokens without duplicates.

---

## 🤝 6. Interest Handshake & Chat Unlock Module (`InterestsModule`)

Facilitates matrimonial connection requests with cultural etiquette, icebreakers, photo access grants, and automated conversation unlocking.

### 6.1 Handshake Lifecycle & Rules
- **Anti-Self & Duplicate Protection**: Prohibits sending interests to oneself (`400 Bad Request`) or duplicate interest requests in either direction between two users (`409 Conflict`).
- **Warm Cultural Icebreakers**: Senders can attach an optional personalized note (up to 300 characters) and proactively grant private photo viewing permissions.
- **Mutual Handshake Acceptance**:
  - Only the intended recipient can accept or decline a pending interest (`403 Forbidden` for others).
  - When **Accepted**, the engine automatically unlocks a dedicated `Conversation` room between both members (if one does not already exist) and fires an FCM mobile push notification to the sender.
  - When **Declined**, the interest status is updated without creating a conversation room.
- **Push Notification Integration**:
  - `INTEREST_RECEIVED`: Dispatched to recipient's registered devices when an interest is received.
  - `INTEREST_ACCEPTED`: Dispatched to sender's registered devices when their interest request is accepted.

## 📸 7. "Ask to View" Photo Permission Flow & Dynamic Gating

In accordance with privacy-first Shwetambar Jain matrimonial traditions, candidates frequently want to browse profiles and request photo viewing permission before committing to a formal matrimonial interest, or revoke photo viewing permission later if circumstances change.

### 7.1 Architecture & Entity Model (`src/users/entities/photo-access-request.entity.ts`)
- Mapped to `photo_access_requests` table with a composite `@Unique(['requester', 'targetUser'])` constraint to prevent duplicate requests.
- **Request Lifecycle (`PhotoRequestStatus`)**:
  - `Pending`: Request sent and awaiting candidate review.
  - `Approved`: Candidate granted private photo viewing permission.
  - `Declined`: Candidate declined photo viewing request.
  - `Revoked`: Candidate revoked previously approved photo viewing access.
- **Validation & Anti-Abuse**:
  - Senders cannot request photo access for their own profile (`400 Bad Request`).
  - Cannot request photo access if the candidate's photos are already public (`400 Bad Request`).
  - Cannot create duplicate requests when an active request exists (`409 Conflict`).
  - Only the intended target user can approve, decline, or revoke a photo request (`403 Forbidden`).
- **Mobile Push Notification Handshake**:
  - `PHOTO_ACCESS_REQUESTED`: Triggered via FCM to the target user when a new photo request is created.
  - `PHOTO_ACCESS_APPROVED`: Triggered via FCM to the requester when their photo request is approved.

### 7.2 Unified 4-Tier Photo-Gating Logic
Private photos (`photoUrls`) are dynamically unlocked across `GET /users/:id` and `GET /matches` if and only if **any** of the following conditions are met:
1. **Self-profile**: The viewer is viewing their own profile (`candidate.id === viewerId`).
2. **Public photos**: Candidate has set `isPhotosLocked: false`.
3. **Approved Photo Request**: An active `PhotoAccessRequest` exists between the viewer and candidate with `status === PhotoRequestStatus.APPROVED`.
4. **Matrimonial Handshake Grant**: An `InterestRequest` exists between the users where either `status === InterestStatus.ACCEPTED` OR the candidate initiated the interest with `grantPhotoAccess: true`.

When unauthorized, `photoUrls` defaults to `[]` and only `defaultPhotoUrl` is returned. In both endpoints, candidate objects return `photoRequestStatus` (`Pending`, `Approved`, `Declined`, `Revoked`, or `null`) and `isPhotoAccessGranted: boolean`.

### 7.3 Interest Photo Access Revocation & Grant Toggle
- **`PATCH /interests/:requestId/photo-access`**: Allows either participant in an interest request to toggle their photo grant (`grantPhotoAccess: boolean`) on and off at any time without altering the overall interest request status.

---

## 💬 8. Real-Time Chat & Messaging Module (`ChatModule`)

Provides bidirectional real-time communication via **Socket.IO WebSockets** with REST fallback endpoints, automatic FCM push notification alerts, and read receipt tracking.

### 8.1 Architecture & Features
- **Real-Time WebSockets Gateway (`/chat`)**:
  - **JWT Handshake Authentication**: Validates JWT bearer tokens upon socket connection and assigns clients to their personal inbox room (`user_<userId>`).
  - **Scoped Conversation Rooms**: Clients join active rooms (`conv_<conversationId>`) to receive instant message broadcasts.
  - **Dual-Channel Broadcast**: New messages are emitted simultaneously to the active conversation room (`conv_<conversationId>`) and the recipient's personal room (`user_<recipientId>`), ensuring immediate badge updates even if the recipient is on the main inbox screen.
  - **Live Read Receipts**: Emits `messagesRead` event when incoming messages in a conversation are opened.
- **REST Inbox & History API**:
  - Lists conversations ordered by `lastMessageAt DESC`.
  - Paginated message retrieval (`take` & `skip`).
  - REST message dispatch fallback triggering both database persistence and FCM push notifications.

---

## 🛡️ 9. Safety, User Blocking & Profile Moderation (`SafetyModule`)

Provides comprehensive Trust & Safety protection in compliance with Apple App Store (Guideline 1.2) and Google Play Store policies for user-generated content and dating applications.

### 9.1 Architecture & Entity Models
- **`UserBlock` (`src/safety/entities/user-block.entity.ts`)**:
  - Mapped to `user_blocks` table with composite `@Unique(['blocker', 'blockedUser'])` constraint to guarantee idempotent blocking.
  - Bidirectional relation tracking `blocker` and `blockedUser`.
- **`UserReport` (`src/safety/entities/user-report.entity.ts`)**:
  - Mapped to `user_reports` table.
  - Categorized by `ReportReason` enum:
    - `Fake / Misleading Profile`
    - `Inappropriate Photos or Bio`
    - `Harassment or Abusive Behavior`
    - `Scam / Financial Request / Spam`
    - `Already Married / Engaged`
    - `Other`
  - Tracked via `ReportStatus` lifecycle (`Pending`, `Reviewed`, `Resolved`, `Dismissed`).
  - Stores reporter, reported user, details note (up to 1000 chars), and admin resolution notes.

### 9.2 Immediate Side Effects on Block
When a user blocks another user:
1. **Chat Deactivation**: All existing `Conversation` rooms between the two members are immediately deactivated (`isActive = false`), immediately cutting off WebSocket message broadcasts and REST message posting.
2. **Interest Invalidation**: Any pending or accepted `InterestRequest` handshakes between the users are automatically marked as `CANCELLED`.
3. **Photo Access Revocation**: Photo viewing access is blocked across all discovery feeds and candidate profile views.

### 9.3 Cross-Module Enforcement
- **`MatchesModule` (`GET /matches` & `GET /matches/:id/score`)**:
  - Discovery feed queries automatically execute a `NOT EXISTS` subquery against `user_blocks` in both directions, ensuring blocked candidates never appear in recommendations.
  - Detailed score requests with a blocked profile return `404 Not Found`.
- **`UsersModule` (`GET /users/:id` & `POST /users/:targetId/photo-request`)**:
  - `GET /users/:id` returns `404 Not Found ('User profile not available')` if blocked in either direction, preventing reconnaissance.
  - `POST /users/:targetId/photo-request` throws `403 Forbidden ('Cannot interact with this profile')`.
- **`InterestsModule` (`POST /interests/:receiverId`)**:
  - Throws `403 Forbidden ('Cannot interact with this profile')` if either user has blocked the other.
- **Reporting Auto-Block**:
  - When submitting a report via `POST /safety/report/:targetUserId`, `alsoBlock` defaults to `true`, executing an instant block along with filing the report.

---

## 🔒 10. Account Deletion & Data Portability (`DPDP Compliance`)

Implements privacy-first data rights under the **Digital Personal Data Protection Act (DPDP), 2023** and GDPR standards, providing self-service data portability and complete erasure ("Right to be Forgotten").

### 10.1 Right to Data Portability (`GET /users/profile/export`)
Allows the authenticated user to download a structured, machine-readable JSON archive containing all personal data processed by the platform:
- **Audit Metadata**: `exportVersion`, `exportedAt` timestamp, `dataSubjectId`, and compliance standard reference.
- **Identity & Profile Biodata**: Full name, contact details, date of birth, cultural attributes (sect, sub-sect, diet), education, occupation, income range, family type, location, and photo metadata.
- **Preferences & Extended Details**: Active partner search preferences, bio, hobbies, height, languages, gotra, native place, mosal, family details, and kundli details.
- **Interaction History**: Sent and received matrimonial interests (with icebreaker notes and statuses), photo access requests, conversation participant summaries, block lists, and submitted moderation reports.
- **Security Guarantee**: Sensitive authentication tokens (`hashedRefreshToken`) and device push tokens (`fcmTokens`) are strictly excluded from the export archive.

### 10.2 Right to Erasure / "Right to be Forgotten" (`DELETE /users/profile`)
Provides self-service account termination and automated PII anonymization:
- **TypeORM Soft Deletion**: Records `@DeleteDateColumn() deletedAt: Date | null` on the user entity, automatically hiding the profile from all future queries and matchmaking feeds.
- **PII Scrubbing & Phone Scrambling**:
  - Full name anonymized to `'Deleted Member'`.
  - Phone number scrambled to `deleted_<timestamp>_<phoneNumber>`, purging the user's real phone number while releasing the database `@Unique` constraint for any future fresh re-registration.
  - Email, organization name, city, state, country, and photo gallery (`photoUrls`) wiped.
  - Default avatar reset to a neutral placeholder.
  - Refresh token hash (`hashedRefreshToken`) and FCM tokens (`fcmTokens`) cleared, immediately terminating active sessions.
- **Cascading Side Effects**:
  - **Chat Deactivation**: All ongoing conversations where the user is a participant are immediately deactivated (`isActive = false`).
  - **Interest Cancellation**: Any pending or accepted matrimonial interests are transitioned to `CANCELLED`.
  - **Photo Permission Revocation**: Active or pending photo access requests are transitioned to `REVOKED`.
  - **Decoupled Data Removal**: User's `PartnerPreferences` and `ProfileDetails` records are deleted.
- **Optional Exit Feedback**: Accepts optional feedback note (`reason`) in `DeleteAccountDto` (up to 500 characters).

---

## 🪪 11. KYC Document Upload & Admin Verification Workflow (`UsersModule`)

Ensures high community trust and authenticity across Shwetambar Jain matrimonial profiles by validating government-issued identity documents before awarding the `isVerified = true` verified member badge.

### 11.1 Document Types & Lifecycle (`KycStatus`)
- **Supported Identity Documents (`KycDocumentType`)**:
  - `Aadhaar Card`
  - `Passport`
  - `PAN Card`
  - `Voter ID`
- **Verification Lifecycle (`KycStatus`)**:
  - `Unsubmitted`: Default state on user registration.
  - `Pending`: Document uploaded and awaiting admin moderation.
  - `Approved`: Document verified by an Admin; `isVerified` set to `true`.
  - `Rejected`: Document rejected with mandatory feedback notes; `isVerified` set to `false`.

### 11.2 Privacy-First Document Protection
- **Column-Level Projection Shield (`select: false`)**: The `kycDocumentUrl` column is flagged with `select: false` on the `User` entity, ensuring sensitive government ID URLs are never inadvertently exposed in candidate search, discovery feeds, or public profile APIs.
- **Admin Review Projection**: Only the authorized admin query (`GET /users/admin/kyc/pending`) explicitly selects `.addSelect('user.kycDocumentUrl')` for document inspection.

### 11.3 Multi-Channel Push Notifications & Feedback
- **On Approval**: Awards verified community badge (`isVerified: true`) and fires an FCM push notification (`Profile Verified! 💍`).
- **On Rejection**: Requires an admin rejection explanation and fires an FCM notification (`KYC Verification Update`) with actionable feedback so the member can re-upload legible proof.

---

## ☁️ 12. Media Upload & Presigned Object Storage (`MediaModule`)

Provides direct-to-cloud file uploads leveraging S3-compatible object storage (AWS S3, Cloudflare R2, MinIO) without routing high-bandwidth binary payloads through the application server.

### 12.1 Presigned Upload Workflow (`MediaService`)
- **Direct S3/R2 Ingestion**: Uses `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` with `PutObjectCommand` to generate short-lived (5-minute / 300-second) cryptographically signed PUT URLs.
- **Client Flow**: Clients request a presigned URL, upload the raw binary payload directly to the storage bucket, and subsequently store the deterministic CDN URL (`fileUrl`) in their profile or KYC record.
- **Structured Storage Namespacing**:
  - `profile_photo`: `users/${userId}/avatar-${Date.now()}.${ext}`
  - `gallery_photo`: `users/${userId}/gallery-${Date.now()}.${ext}`
  - `kyc_document`: `kyc/${userId}/doc-${Date.now()}.${ext}`

### 12.2 Strict MIME Type & Extension Validation
- **Supported File Types (`MediaUploadType`)**: `profile_photo`, `gallery_photo`, `kyc_document`.
- **MIME Allowlist**:
  - Images: `image/jpeg`, `image/png`, `image/webp` (allowed for all upload types).
  - Documents: `application/pdf` is **strictly restricted to KYC identity documents**; attempting to upload a PDF as an avatar or gallery image is rejected with `400 Bad Request`.
- **Sanitized Extensions**: Deterministic file extension mapping derived from verified MIME types (`.jpg`, `.png`, `.webp`, `.pdf`).

### 12.3 Environment-Aware Architecture & Local Development Fallback
- **Configurable Storage Providers**: Compatible with Cloudflare R2, AWS S3, or self-hosted MinIO via standard environment variables:
  - `S3_REGION` (default: `'auto'` for R2)
  - `S3_ENDPOINT` (e.g. Cloudflare R2 S3 API URL or MinIO endpoint)
  - `S3_ACCESS_KEY_ID` & `S3_SECRET_ACCESS_KEY`
  - `S3_BUCKET_NAME`
  - `CDN_BASE_URL` (public CDN domain for served assets)
- **Zero-Dependency Dev Mode**: If S3 credentials are absent in local development, returns a realistic mock upload URL (`http://localhost:3000/mock-upload/...`) and mock public CDN URL, allowing frontend developers and CI runners to test without cloud provisioning.

---

## 🛠️ API Endpoint Matrix

| Method | Endpoint | Auth Required | Role Required | Description |
| :--- | :--- | :---: | :---: | :--- |
| :--- | :--- | :---: | :---: | :--- |
| **POST** | `/auth/send-otp` | ❌ No | Anyone | Trigger login OTP |
| **POST** | `/auth/verify-otp` | ❌ No | Anyone | Verify OTP, receive dual JWT tokens (access + refresh) & onboarding flags |
| **POST** | `/auth/refresh` | ❌ No | Anyone | Rotate and exchange valid refresh token for fresh access and refresh tokens |
| **POST** | `/auth/logout` | ✅ JWT | User / Admin | Revoke active refresh token session |
| **GET** | `/users/profile` | ✅ JWT | User / Admin | Retrieve current authenticated profile |
| **PUT** | `/users/profile` | ✅ JWT | User / Admin | Update current profile details |
| **GET** | `/users/profile/export` | ✅ JWT | User / Admin | Export all personal data in JSON format under DPDP Data Portability |
| **DELETE** | `/users/profile` | ✅ JWT | User / Admin | Self-service soft delete and personal data erasure under DPDP Right to be Forgotten |
| **POST** | `/users/profile/kyc` | ✅ JWT | User / Admin | Submit government ID document proof for KYC verification |
| **GET** | `/users/profile/kyc` | ✅ JWT | User / Admin | Retrieve authenticated user's KYC status and submission history |
| **GET** | `/users/preferences` | ✅ JWT | User / Admin | Retrieve current partner preferences |
| **PUT** | `/users/preferences` | ✅ JWT | User / Admin | Upsert current partner preferences |
| **GET** | `/users/profile/details` | ✅ JWT | User / Admin | Retrieve decoupled bio, lifestyle, family & kundli details |
| **PUT** | `/users/profile/details` | ✅ JWT | User / Admin | Upsert decoupled bio, lifestyle, family & kundli details |
| **PUT** | `/users/fcm-token` | ✅ JWT | User / Admin | Register / append FCM mobile push token for user/parents |
| **POST** | `/users/:targetId/photo-request` | ✅ JWT | User / Admin | Request permission to view locked photos of a candidate |
| **PATCH** | `/users/photo-requests/:requestId/respond` | ✅ JWT | User / Admin | Approve, Decline, or Revoke a photo access request |
| **GET** | `/users/photo-requests/received` | ✅ JWT | User / Admin | List incoming photo access requests received by user |
| **GET** | `/users/photo-requests/sent` | ✅ JWT | User / Admin | List outgoing photo access requests sent by user |
| **GET** | `/users/:id` | ✅ JWT | User / Admin | View profile by UUID (photo-gated & blocks-enforced) |
| **GET** | `/users` | ✅ JWT | **Admin Only** | Directory listing for moderation |
| **GET** | `/users/admin/kyc/pending` | ✅ JWT | **Admin Only** | Paginated review queue of pending KYC submissions with document links |
| **PATCH** | `/users/admin/kyc/:targetUserId/review` | ✅ JWT | **Admin Only** | Approve or reject a user's KYC submission with push notification alerts |
| **GET** | `/matches` | ✅ JWT | User / Admin | SoulSync discovery feed ordered by compatibility % (supports `includeInteracted`, excludes blocked users) |
| **GET** | `/matches/:id/score` | ✅ JWT | User / Admin | Detailed compatibility score breakdown with candidate |
| **POST** | `/interests/:receiverId` | ✅ JWT | User / Admin | Send interest handshake request with optional icebreaker note |
| **PATCH** | `/interests/:requestId/respond` | ✅ JWT | User / Admin | Accept (unlocks chat room) or Decline an interest request |
| **PATCH** | `/interests/:requestId/photo-access` | ✅ JWT | User / Admin | Dynamically grant or revoke photo access on an interest request |
| **GET** | `/interests/received` | ✅ JWT | User / Admin | List all incoming interest requests received by user |
| **GET** | `/interests/sent` | ✅ JWT | User / Admin | List all outgoing interest requests sent by user |
| **GET** | `/chat/conversations` | ✅ JWT | User / Admin | Retrieve all user conversations ordered by latest activity |
| **GET** | `/chat/conversations/:id/messages` | ✅ JWT | User / Admin | Get paginated message history for a conversation |
| **POST** | `/chat/messages` | ✅ JWT | User / Admin | REST fallback to send message and trigger FCM push |
| **PATCH** | `/chat/conversations/:id/read` | ✅ JWT | User / Admin | Mark all unread incoming messages in conversation as read |
| **WS** | `/chat` namespace | ✅ JWT | User / Admin | Real-time chat gateway (`sendMessage`, `joinConversation`, `markRead`) |
| **POST** | `/safety/block/:targetUserId` | ✅ JWT | User / Admin | Block a candidate, terminate active chat rooms, and cancel interests |
| **DELETE** | `/safety/block/:targetUserId` | ✅ JWT | User / Admin | Unblock a previously blocked user |
| **GET** | `/safety/blocked` | ✅ JWT | User / Admin | Retrieve list of profiles blocked by the authenticated user |
| **POST** | `/safety/report/:targetUserId` | ✅ JWT | User / Admin | Report a profile for moderation (with optional auto-block) |
| **GET** | `/safety/reports` | ✅ JWT | **Admin Only** | Moderation dashboard to list all reported profiles (supports `status` filter) |
| **PATCH** | `/safety/reports/:reportId` | ✅ JWT | **Admin Only** | Review and update report status with resolution notes |
| **POST** | `/media/presigned-url` | ✅ JWT | User / Admin | Generate cryptographically signed S3/R2 direct upload URL for photos or KYC proof |

---

## 🚀 Upcoming Backlog (Immediate Roadmap)

1. **Advanced Partner Filter Presets & Horoscope Compatibility**:
   - Extended Kundli Milan gun scoring (out of 36 gunas) for astrological compatibility.
2. **Automated Weekly Match Digest**:
   - Scheduled job to notify users of high-compatibility new registrations via WhatsApp/push notification.
3. **Multi-Admin Activity Audit Log**:
   - Traceability log tracking admin actions (KYC approvals/rejections and report resolutions).

