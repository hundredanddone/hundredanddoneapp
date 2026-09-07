# 100 and Done

A doctor / clinic / hospital appointment booking app for iOS and Android, built with
Expo (SDK 57) and Supabase.

Two account types share one codebase, one login flow, and account-type-based navigation:

- **Patient** — find providers nearby, book a **clinic visit** ("I go to them") or a
  **home visit** ("they come to me"), and keep prescriptions and reports in one place.
- **Org** — an independent doctor, a clinic, or a hospital. An independent doctor signs
  up exactly like a hospital does; their organization simply has one member.

Sign-up and sign-in are the same action: **Continue with Google**. There is no
email/password and no phone OTP.

---

## Prerequisites

| Tool                       | Version / notes                                              |
| -------------------------- | ------------------------------------------------------------ |
| Node.js                    | 22.x (this project was scaffolded on 22.20.0)                |
| npm                        | 10+                                                          |
| Git                        | any recent version                                           |
| Xcode                      | 16+ — **macOS only**, required for iOS simulator builds      |
| Android Studio             | Ladybug+ with an SDK 35 platform + emulator image            |
| Watchman                   | optional, macOS only                                         |
| A Supabase project         | free tier is fine                                            |
| A Google Cloud project     | for the three OAuth client IDs                               |
| An Apple Developer account | $99/yr, required for any real iOS device or TestFlight build |
| A Stallion account         | for OTA updates                                              |

> **Windows note.** `npx expo prebuild` can only generate the `android/` project on
> Windows. The `ios/` project must be generated on macOS or Linux — or, more simply,
> left to EAS Build, which generates it on a macOS worker for every cloud build.

---

## Quick start

```bash
npm install
cp .env.example .env      # then fill it in — see "Environment variables"
npm run typecheck         # should be clean
npm run lint              # should be clean
```

You cannot run this app in **Expo Go**. Native Google Sign-In and Stallion are native
modules, so a custom development build is required — see
[Development builds](#development-builds).

---

## Environment variables

All client-side config lives in `.env` (gitignored). `.env.example` is committed with
blank values. Expo inlines `EXPO_PUBLIC_*` at build time, so **restart the bundler with
a cleared cache after editing** (`npx expo start -c`).

| Variable                               | Where it comes from                                                  |
| -------------------------------------- | -------------------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`             | Supabase Dashboard → Project Settings → API → Project URL            |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → Project Settings → API → Publishable (anon) key |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`     | Google Cloud Console → the **Web** OAuth client ID                   |

`EXPO_PUBLIC_*` values are embedded in the app bundle and are **not secret**. The
Supabase publishable key is safe to ship precisely because Row Level Security decides
what it can reach. Never put a Supabase _service role_ key in this project.

There are also three placeholders in `app.json` and one in `eas.json` that are not env
vars because config plugins read them at prebuild time. They are listed in
[Placeholders you still need to replace](#placeholders-you-still-need-to-replace).

---

## Google Cloud Console setup

You need **three** OAuth 2.0 Client IDs in the same Google Cloud project
(APIs & Services → Credentials → Create credentials → OAuth client ID). Each one has a
different job, and mixing them up is the single most common cause of
`DEVELOPER_ERROR` / `Invalid ID token` at sign-in.

### 1. Web client ID — the one the app actually uses

Application type: **Web application**.

This is the value that goes into `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, which
`src/lib/googleAuth.ts` passes to `GoogleSignin.configure({ webClientId })`.

> **Never** put the Android or iOS client ID in `webClientId`. Google issues the ID
> token _for_ the web client; the native clients only authorise the app that requests it.

### 2. Android client ID — authorises the Android app

Application type: **Android**.

- **Package name:** `com.hundredanddone.app`
- **SHA-1 certificate fingerprint:** you must register one per signing key.

Get the fingerprints after prebuilding:

```bash
npx expo prebuild --platform android
cd android && ./gradlew signingReport
```

Register **both**:

- the **debug** SHA-1 (from the `debug` variant) — for local development builds
- the **release** SHA-1 — for Play Store builds. If EAS manages your keystore, read it
  with `eas credentials` → Android → _Keystore: Manage everything_.

The Android client ID is not referenced anywhere in the code. Google matches it by
package name + fingerprint at sign-in time.

### 3. iOS client ID — authorises the iOS app

Application type: **iOS**, bundle ID `com.hundredanddone.app`.

Google shows you an **iOS URL scheme** (the reversed client ID, e.g.
`com.googleusercontent.apps.1234567890-abcdefg`). Put that into `app.json`:

```json
[
  "@react-native-google-signin/google-signin",
  { "iosUrlScheme": "com.googleusercontent.apps.YOUR-REVERSED-ID" }
]
```

then re-run `npx expo prebuild --platform ios` (on macOS) or let EAS rebuild.

### 4. Tell Supabase about all three

Supabase Dashboard → **Authentication → Providers → Google**:

1. Enable the provider.
2. Under **Authorized Client IDs**, add **all three** client IDs, comma-separated.
   This list is what `supabase.auth.signInWithIdToken({ provider: 'google' })` validates
   the incoming ID token against — if the web client ID is missing, every native sign-in
   fails.
3. The Client Secret is only needed for the web OAuth redirect flow, which this app does
   not use. Leaving "Skip nonce checks" off is fine.

---

## Supabase setup

### This project

|              |                              |
| ------------ | ---------------------------- |
| Project name | hundredanddone's Project     |
| Project ref  | `moherjbdvepcckwyqhao`       |
| Region       | `ap-southeast-1` (Singapore) |

`supabase/config.toml` is committed; `supabase/.temp/` (which holds the linked ref) is
gitignored, so each developer links their own checkout once.

### Applying the migrations

Two migrations live in `supabase/migrations/`:

- `0001_init.sql` — every table, Row Level Security on all of them, the RLS helper
  functions, and the `discover_organizations` RPC used for radius search.
- `0002_storage.sql` — the four storage buckets and their policies.

**With the Supabase CLI (recommended):**

```bash
npx supabase login                                   # opens a browser
npx supabase link --project-ref moherjbdvepcckwyqhao # prompts for the DB password
npx supabase db push
```

`login` writes an access token under `~/.supabase/`, and `link` stores the database
password in the OS keyring — so `db push` afterwards needs no further input. Neither
secret needs to be typed anywhere except those two prompts.

Verify afterwards with:

```bash
npx supabase migration list
```

**Without the CLI:** open the Supabase Dashboard → SQL Editor, paste the contents of
`0001_init.sql`, run it, then do the same for `0002_storage.sql`. Order matters —
the storage policies call helper functions defined in `0001`.

### What the schema looks like

`profiles` mirrors `auth.users` and carries `role` (`patient` | `org`) plus
`onboarding_completed`. Everything org-side hangs off `organizations`, and membership
is expressed through `org_members` — which is also how RLS decides what an org user can
touch. Availability is stored as `availability_rules` rows (one per day-of-week block,
per visit type), so clinic hours and home-visit hours are genuinely independent.

Two columns go beyond the original spec and are worth knowing about:

- `organizations.logo_url` — the avatar shown in discovery.
- `organizations.onboarding_step` — which wizard step is still outstanding. This is what
  makes the org wizard resumable; `null` means setup is finished.

### Row Level Security, in one paragraph

Every table has RLS enabled and **nothing is readable by `anon`**. A patient can only
read and write their own `profiles`, `patient_addresses`, `patient_family_members`,
`appointments`, `reviews` and `patient_records`. An org user reaches data through
`org_members.profile_id = auth.uid()`, checked by the `is_org_member()` helper — that
covers `organizations`, `org_branches`, `services`, `service_offerings`,
`availability_rules`, `availability_overrides`, `home_visit_service_areas`, and any
appointment or record carrying their `organization_id`. Org-authored `patient_records`
are only reachable when `org_treats_patient()` confirms a real appointment links that
patient to that org, while the patient can always read every record about themselves
regardless of who wrote it. Verification documents are never visible to patients at any
status. Public discovery is served by the `discover_organizations` RPC, which is
`SECURITY DEFINER` and returns a fixed, discovery-safe column list (name, type,
specialty, branch location, ratings, price-from) — never patient data.

The helpers are `SECURITY DEFINER` on purpose: a policy on `org_members` needs to ask
"is the caller a member of this org?" without re-entering that table's own policies and
recursing.

### Storage buckets

| Bucket              | Public | Path convention            |
| ------------------- | ------ | -------------------------- |
| `avatars`           | yes    | `<user_id>/<file>`         |
| `org-logos`         | yes    | `<organization_id>/<file>` |
| `verification-docs` | **no** | `<organization_id>/<file>` |
| `patient-records`   | **no** | `<patient_id>/<file>`      |

The policies key off the **first path segment**, so `src/lib/uploads.ts` must always
pass the owning id as the prefix. Private buckets are read through short-lived signed
URLs (`signedUrlFor()`).

### Profile creation

On first successful sign-in the client checks for a `profiles` row and inserts one from
the Google profile (email, full name, avatar) with `role` null and
`onboarding_completed` false — see `ensureProfile()` in `src/features/auth/api.ts`. The
insert is idempotent: a duplicate-key race from two devices falls back to re-reading the
row. If you would rather have the database own this, add an
`auth.users` → `handle_new_user()` trigger; `ensureProfile()` will then simply find the
row and move on.

---

## Development builds

**Expo Go will not work.** This project depends on three native modules that are not in
the Expo Go binary: `@react-native-google-signin/google-signin`, `react-native-stallion`
and `react-native-maps`. You need a custom dev client.

### Option A — EAS (no local native toolchain needed)

```bash
npm install -g eas-cli
eas login
eas init                                    # creates the EAS project, writes extra.eas.projectId
eas build --profile development --platform android
eas build --profile development --platform ios     # simulator build; needs an Apple account for devices
```

Install the resulting build, then:

```bash
npm start        # expo start --dev-client
```

### Option B — build locally

```bash
npx expo prebuild                 # generates android/ (and ios/ on macOS/Linux)
npm run android                   # expo run:android
npm run ios                       # expo run:ios — macOS only
```

`android/` and `ios/` are gitignored: this project uses Expo's _continuous native
generation_, so the native projects are always regenerated from `app.json` and the
config plugins. **Re-run `npx expo prebuild --clean` after changing any plugin config**
(the Google `iosUrlScheme`, the Stallion keys, the Maps API key).

---

## EAS Build

`eas.json` defines four profiles:

| Profile              | Distribution | Notes                                            |
| -------------------- | ------------ | ------------------------------------------------ |
| `development`        | internal     | dev client; iOS **simulator** build, Android APK |
| `development-device` | internal     | same, but a real-device iOS build                |
| `preview`            | internal     | release JS, internal testers / TestFlight        |
| `production`         | store        | App Store + Play Store, `autoIncrement` on       |

`eas.json` sets `"appVersionSource": "remote"`, so EAS owns the build number. Run
`eas init` once to create the project and write `extra.eas.projectId` into `app.json` —
it is intentionally absent until then, because a made-up project ID fails at build time
rather than at config time.

### iOS signing

Any iOS build for a real device, TestFlight or the App Store needs an **active Apple
Developer Program membership** ($99/yr). EAS can manage the certificate and provisioning
profile for you:

```bash
eas credentials            # pick iOS -> Build credentials
```

Choose _Let EAS handle it_ unless you have an existing certificate to import. You will
need your **Apple Team ID** (Apple Developer → Membership) for `eas.json`'s `submit`
section. Simulator builds (`development` profile) need no signing and no paid account.

### Android signing

EAS generates and stores a keystore on first release build. Read its SHA-1 with
`eas credentials` and register it as an Android OAuth client in Google Cloud Console,
otherwise Google Sign-In will fail in release builds while working fine in debug.

---

## Stallion OTA updates

Stallion ships JS-only updates without an App Store / Play Store review. The root
component is already wrapped:

```ts
// app/_layout.tsx
export default withStallion(RootLayout);
```

### 1. Fill in the plugin config

From your Stallion dashboard, replace the three placeholders in `app.json`:

```json
[
  "expo-stallion-plugin",
  {
    "projectId": "...",
    "appToken": "spb_...",
    "publicSigningKey": "..."
  }
]
```

The plugin **validates** that `appToken` starts with `spb_`, so the committed
placeholder is `spb_REPLACE_WITH_STALLION_APP_TOKEN` rather than a bare string — without
a well-formed value every `expo` command fails at config evaluation.

Then regenerate the native projects:

```bash
npx expo prebuild --clean
```

### 2. Build the release JS bundles

```bash
npm run bundle:ios
npm run bundle:android
```

These write Hermes bytecode bundles to `build-ios/` and `build-android/` (both
gitignored).

### 3. Publish

Publishing is a manual step until Stallion CLI credentials are in place:

```bash
npm install -g stallion-cli     # per your Stallion dashboard's instructions
stallion login
stallion publish-bundle --path ./build-android/index.android.bundle --platform android
stallion publish-bundle --path ./build-ios/main.jsbundle --platform ios
```

Only JS and assets can ship this way. Anything that changes native code — a new native
module, a config-plugin change, an SDK upgrade — needs a fresh store build.

---

## Scripts

| Script                                  | What it does                                                             |
| --------------------------------------- | ------------------------------------------------------------------------ |
| `npm start`                             | Metro for the dev client                                                 |
| `npm run start:go`                      | Metro without `--dev-client` (most screens will crash; diagnostics only) |
| `npm run android` / `npm run ios`       | build + run locally                                                      |
| `npm run prebuild` / `prebuild:clean`   | regenerate native projects                                               |
| `npm run typecheck`                     | `tsc --noEmit`, strict mode                                              |
| `npm run lint` / `lint:fix`             | ESLint (Expo flat config + Prettier)                                     |
| `npm run format` / `format:check`       | Prettier                                                                 |
| `npm run doctor`                        | `expo-doctor`                                                            |
| `npm run types:supabase`                | regenerate DB types (needs `SUPABASE_PROJECT_ID` and the Supabase CLI)   |
| `npm run bundle:ios` / `bundle:android` | release JS bundles for Stallion                                          |

---

## Project structure

```text
app/                              # Expo Router — file-based routing
  _layout.tsx                     # providers + the routing decision (Stack.Protected guards)
  index.tsx                       # cold-start gate: redirects to the right group
  +not-found.tsx
  (auth)/
    _layout.tsx
    sign-in.tsx                   # the single "Continue with Google" screen
    callback.tsx                  # deep-link auth callback (web/dev fallback)
  (onboarding)/
    _layout.tsx
    account-type.tsx              # Patient vs Doctor/Clinic/Hospital -> profiles.role
    resume.tsx                    # resumes an unfinished wizard
    patient/
      profile.tsx                 # confirm name (pre-filled), optional phone
      location.tsx                # location permission, then finish
    org/
      org-type.tsx                # independent doctor / clinic / hospital
      basic-info.tsx              # name, specialty, bio, logo
      location.tsx                # address + map pin picker
      availability-clinic.tsx     # day toggles + time blocks + slot length
      availability-home.tsx       # home-visit toggle, own hours, service-area radius
      services.tsx                # services with per-visit-type price + duration
      staff.tsx                   # invite doctors/staff (clinic + hospital only)
      verification.tsx            # licence / registration upload, then submit
  (patient)/
    _layout.tsx
    (tabs)/                       # home (discovery) · appointments · records · profile
    provider/[id].tsx             # provider profile + bookable services
    booking/[offeringId].tsx      # date + slot picker, address for home visits
    appointment/[id].tsx          # detail, cancel, home-visit map
  (org)/
    _layout.tsx
    (tabs)/                       # dashboard · schedule · availability · profile
    setup/                        # services · branches · staff
    appointment/[id].tsx          # status transitions + write to patient record

src/
  lib/                            # supabase.ts, googleAuth.ts, uploads.ts, time.ts, ...
  features/
    auth/                         # profile bootstrap + session sync
    onboarding/                   # wizard steps, resumable persistence, OrgStepShell
    booking/                      # slot generation, appointment creation, addresses
    discovery/                    # radius search, provider profiles, ProviderCard
    appointments/                 # lists, detail, status machine, AppointmentCard
    org-setup/                    # services, availability, staff, branches (shared editors)
    patient-records/              # patient + org record access
  components/                     # Button, Card, VisitTypeToggle, DayTimeBlockPicker,
                                  # AddressMapPicker, TimeSelect, Screen, ...
  hooks/                          # useTheme, useLocation, usePickedFile
  stores/                         # zustand: auth session, org context, preferences
  types/                          # domain types mirroring the migration
  constants/                      # theme tokens, env access

supabase/migrations/
  0001_init.sql                   # schema + RLS + discovery RPC
  0002_storage.sql                # buckets + storage policies
```

### Two deviations from the requested structure, and why

- **`src/stores/` was added.** The brief listed zustand client state (auth session,
  current account type, selected org context, the visit-type toggle preference) but no
  home for it. All four are cross-feature, so putting them inside any one feature folder
  would have made unrelated features import from it. `src/hooks/` stays for React hooks.
- **The template's root `components/`, `constants/` and `hooks/` moved under `src/`**,
  and the `@/*` path alias now points at `./src/*`. That matches the requested `src/`
  layout and means `@/components/Button` resolves the obvious way.

The `(auth)` / `(onboarding)` / `(patient)` / `(org)` route-group split is unchanged.

### How routing actually works

`app/_layout.tsx` reads the auth store and declares the four groups behind
`Stack.Protected` guards:

| State                                                    | Group          |
| -------------------------------------------------------- | -------------- |
| no session                                               | `(auth)`       |
| session, `role` null **or** `onboarding_completed` false | `(onboarding)` |
| session, finished, `role = 'patient'`                    | `(patient)`    |
| session, finished, `role = 'org'`                        | `(org)`        |

The guards also cover deep links, so a patient tapping an org URL is bounced rather than
rendering a screen their RLS policies would reject. `app/index.tsx` does the forward
redirect on cold start, and `(onboarding)/resume.tsx` reads
`organizations.onboarding_step` to drop a returning org back on the exact step it left.

---

## Placeholders you still need to replace

Everything below is committed with an obvious placeholder. Nothing here can be filled in
without an account that only you can create.

| Where      | Key                                    | Current placeholder                                              |
| ---------- | -------------------------------------- | ---------------------------------------------------------------- |
| `.env`     | `EXPO_PUBLIC_SUPABASE_URL`             | _(blank)_                                                        |
| `.env`     | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | _(blank)_                                                        |
| `.env`     | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`     | _(blank)_                                                        |
| `app.json` | google-signin `iosUrlScheme`           | `com.googleusercontent.apps.REPLACE_WITH_REVERSED_IOS_CLIENT_ID` |
| `app.json` | `android.config.googleMaps.apiKey`     | `REPLACE_WITH_ANDROID_GOOGLE_MAPS_API_KEY`                       |
| `app.json` | stallion `projectId`                   | `REPLACE_WITH_STALLION_PROJECT_ID`                               |
| `app.json` | stallion `appToken`                    | `spb_REPLACE_WITH_STALLION_APP_TOKEN`                            |
| `app.json` | stallion `publicSigningKey`            | `REPLACE_WITH_STALLION_PUBLIC_KEY`                               |
| `app.json` | `extra.eas.projectId`                  | _(absent — `eas init` writes it)_                                |
| `eas.json` | `submit.*.ios.appleId`                 | `REPLACE_WITH_APPLE_ID_EMAIL`                                    |
| `eas.json` | `submit.*.ios.ascAppId`                | `REPLACE_WITH_APP_STORE_CONNECT_APP_ID`                          |
| `eas.json` | `submit.*.ios.appleTeamId`             | `REPLACE_WITH_APPLE_TEAM_ID`                                     |

Two of these placeholders are deliberately _well-formed_ rather than bare strings,
because their config plugins validate the value and abort every `expo` command otherwise:

- google-signin requires `iosUrlScheme` to start with `com.googleusercontent.apps.`
- expo-stallion-plugin requires `appToken` to start with `spb_`

**The bundle identifier / package name `com.hundredanddone.app` is still the placeholder
you flagged — confirm it before the first store submission.** It is used in three places
(`ios.bundleIdentifier`, `android.package`, and the Google Cloud Android/iOS OAuth
clients) and changing it later means re-registering the OAuth clients and creating a new
app record in App Store Connect and Play Console. Each dot-separated segment starts with
a letter, as required.

> The Expo `slug`, the URL `scheme`, the npm package name and the Supabase local
> `project_id` are all `hundredanddone`. A URL scheme cannot start with a digit, so the
> template's original `100anddone` (derived from the folder name) would have broken deep
> links and the OAuth callback. The user-facing app name stays **100 and Done**.

---

## Known gaps

This is a working scaffold with the full auth + onboarding flow and functional
patient/org surfaces. Things deliberately left for later:

- **No push notifications.** The `notifications` table exists but nothing writes to it;
  wire up `expo-notifications` plus a Supabase trigger or Edge Function.
- **No payments.** `appointments.payment_status` is set to `unpaid` and never advances.
- **Live tracking is static.** The home-visit screen shows the patient's pin and an
  "on the way" banner; there is no driver-location stream yet. That needs a
  `doctor_locations` table plus a Supabase Realtime subscription.
- **No admin surface for verification.** `verification_status` has to be flipped by hand
  in the Supabase dashboard until an internal tool exists.
- **Discovery uses haversine, not PostGIS.** Fine for hundreds of providers; swap in
  `earthdistance` or PostGIS with a GiST index before it becomes thousands.
- **`react-native-maps`, not `expo-maps`.** See below.
- **Types are hand-written.** `src/types/index.ts` mirrors the migration by hand. Once
  the Supabase project exists, run `npm run types:supabase` and switch to generated types.
- **No tests.** No test runner is configured.

### Why `react-native-maps` and not `expo-maps`

Both are documented for SDK 57. `expo-maps` is Expo's own library but is still **alpha**
and warns about frequent breaking changes; `react-native-maps` is stable, and SDK 57
pins a vetted version (1.27.2, which `npx expo install` selects). The address picker
needs a draggable marker and the home-visit service area needs a radius circle — both
are long-settled APIs in `react-native-maps`. Revisit once `expo-maps` is stable.

On Android, `react-native-maps` uses Google Maps and needs the API key in
`android.config.googleMaps.apiKey` (enable **Maps SDK for Android** in the same Google
Cloud project, and restrict the key to `com.hundredanddone.app` + your SHA-1). iOS uses
Apple Maps and needs no key.
