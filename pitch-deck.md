---
marp: true
theme: gaia
_class: lead
paginate: true
backgroundColor: #0f172a
color: #f8fafc
---

# 💍 SoulSync Matrimony
### Modern, Privacy-First Shwetambar Jain Matchmaking
*Where Traditional Community Values Meet Next-Gen Privacy & Technology*

**Executive & Investor Presentation**

---

## 🎯 The Problem & Market Opportunity

* **Horizontal Noise**: Legacy apps (Shaadi, BharatMatrimony) overlook key religious and cultural compatibility factors (sect lineages, strict Jain vs. Chovihar diet).
* **Privacy Deficits**: Photos and phone numbers are exposed or locked behind spam-heavy paywalls.
* **The Family Gap**: Marriage decisions are collaborative, yet platforms fail to support shared family device access.
* **The Opportunity**: A high-trust, privacy-first vertical platform built around verified lineage and mutual consent.

---

## 🗺️ End-to-End User Journey

1. **Seamless Onboarding**
   * Passwordless WhatsApp Cloud OTP & decoupled biodata entry.
2. **Deterministic Discovery**
   * SoulSync 100-point compatibility score directly in PostgreSQL.
3. **Controlled Handshake**
   * Private photos locked by default; "Ask to View" and warm etiquette notes.
4. **Mutual Connection**
   * Instant real-time WebSockets chat with multicast family push alerts.

---

## 📱 Onboarding & Decoupled Data Model

* **Passwordless WhatsApp Authentication**
  * Live OTP via Meta WhatsApp Cloud API.
  * Argon2 memory-hard hashing; dual access/refresh tokens.
* **Core Profile (`User`)**
  * Identity, Sect (*Murtipujak, Sthanakvasi, Terapanthi*), Sub-Sect (*Visa Oswal, Shrimal, etc.*), Diet, Career, Location.
* **Extended Biodata (`ProfileDetails`)**
  * Cultural Lineage: *Gotra*, ancestral town (*Vatan*), maternal roots (*Mosal*).
  * Family background and optional Kundli/astrological details.

---

## 🔮 SoulSync 100-Point Matchmaking Engine

* **Sect (25 pts)**: Exact sect match (25) or compatible Shwetambar branch (15).
* **Sub-Sect (20 pts)**: Exact match / No Bar (20) or shared lineage clustering (15).
* **Diet (25 pts)**: Exact match (25) or Strict Jain ⇄ Chovihar harmony (20).
* **Age Range (15 pts)**: Exact preferred window (15) or ±2 to ±4 year buffers.
* **Location (15 pts)**: City match (15), State match (10), Country match (5).

*Deterministic SQL filtering excludes self, same-gender, and already-interacted profiles.*

---

## 🛡️ Multi-Tier Consent & Photo Privacy

* **Default Privacy Shield**
  * Candidate photo galleries (`photoUrls`) default to locked (`[]`).
  * Only verified placeholder avatars are visible publicly.
* **"Ask to View Photos" Flow**
  * Request photo access without proposing marriage.
  * Target profile can approve, decline, or revoke access at any time.
* **Dynamic 4-Tier Unlock Engine**
  * Unlocks on self-view, public toggle, approved photo request, or accepted mutual interest.

---

## 💬 Real-Time Chat & Multicast Family Alerts

* **Zero Unsolicited DMs**
  * Chat rooms are only created when an Interest Request is accepted.
* **Sub-100ms Messaging**
  * NestJS WebSockets (`Socket.IO`) with typing status and read receipts.
  * Reliable REST fallback endpoints for unstable connections.
* **Multicast Push Notifications (Firebase FCM)**
  * Profiles support multiple device tokens (`fcmTokens`).
  * Alerts trigger simultaneously on both candidate and parent phones.

---

## 🚨 Trust, Safety & App Store Compliance

* **Idempotent User Blocking**
  * Immediately deactivates chat rooms, cancels pending interests, and revokes photo permissions.
  * Bidirectional exclusion: blocked users cannot find or view profiles.
* **Community Moderation & Reporting**
  * Structured flags: Fake profile, Harassment, Inappropriate media, Scam/Spam.
  * Submitting a report automatically blocks the user by default.
  * Role-based admin review queues for moderation actions.

---

## ⚖️ Regulatory Moat: DPDP Act (2023) Compliance

* **Right to Data Portability (`GET /users/profile/export`)**
  * Machine-readable JSON export of all personal profile data and interaction history.
  * Sensitive security tokens (Argon2 hashes, device IDs) are excluded.
* **Right to be Forgotten (`DELETE /users/profile`)**
  * TypeORM soft deletion (`deletedAt`).
  * Name anonymized to `Deleted Member` and phone scrambled to release unique constraints.
  * Cascading cancellation of open interests, chats, and photo grants.

---

## 🏗️ Technical Architecture & Moat

* **Backend Stack**: NestJS 12 (ESM) + PostgreSQL 15 + TypeORM 1.1 (`Relation<T>` architecture).
* **Security**: Argon2 passwordless OTP & refresh token rotation, strict RBAC guards.
* **Verification**: Comprehensive Vitest unit test suite with 0 Oxlint errors.
* **Investment Summary**: A production-grade, highly defensible backend engine tailored to an affluent, high-intent community where horizontal platforms fall short.