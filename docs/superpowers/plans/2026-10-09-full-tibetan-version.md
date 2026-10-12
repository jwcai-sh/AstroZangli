# Full Tibetan Version Implementation Plan

> **For agentic workers:** Use the native Codex execution workflow task by task. Steps use checkbox syntax for tracking.

**Goal:** Provide a complete Tibetan-language experience alongside the existing Chinese AstroZangli application, with a language chooser and a return path from every localized page.

**Architecture:** Keep existing Chinese URLs working and add `/bo/...` route wrappers that reuse the same page and calculation components under a Tibetan locale provider. Store UI translations and locale-aware path/date/data helpers in `frontend/src/i18n/`; create Tibetan copies for static help articles that the app exposes, preserving the Chinese originals. Pass the selected language to chat generation so responses follow the UI language.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `node:test` via `tsx`.

**Spec:** User request in chat (2026-10-09): create a complete Tibetan version from the current Chinese application.

## Global Constraints

- Do not change Tibetan-calendar calculations, astronomy algorithms, or source datasets.
- Preserve all existing Chinese routes and all pre-existing uncommitted changes.
- Do not overwrite the Chinese article originals or the RAG source corpus.
- Add no runtime dependency for localization.
- Use established Tibetan calendar terminology where the repository already contains it; flag uncertain specialized terminology for review.

## Review Focus

- A `/bo` route must render the correct Tibetan page and keep the locale through internal links.
- Returning to `/` must always reach the language chooser from either language.
- Existing Chinese routes and links must keep their current behavior.
- Dynamic date, event, error, and chat text must not silently remain Chinese in Tibetan mode.
- Tibetan script must remain UTF-8 and display correctly in the documented article copies.

### Task 1: Locale primitives and route wrappers

**Files:**
- Create: `frontend/src/i18n/locale.ts`
- Create: `frontend/src/i18n/locale.test.ts`
- Create: `frontend/src/i18n/LocaleProvider.tsx`
- Create: `frontend/src/i18n/useLocale.ts`
- Create: `/bo` wrappers for each existing user-facing route
- Modify: `frontend/src/app/page.tsx`, `frontend/src/app/layout.tsx`

- [ ] Write tests for locale resolution and localized path building.
- [ ] Run the tests and confirm they fail because the locale helpers are missing.
- [ ] Implement the locale helpers/provider and route wrappers.
- [ ] Re-run the focused tests.

### Task 2: Shared navigation and application UI

**Files:**
- Modify: user-facing files in `frontend/src/app/` and `frontend/src/components/`
- Create: `frontend/src/i18n/bo.ts`

- [ ] Add translations for navigation, calendar, earth visualization, five-elements/five-planets pages, comparisons, range summaries, docs catalog, detail pages, chat, and user page.
- [ ] Ensure the language chooser is reachable from both locales and all shared navigation stays locale-aware.
- [ ] Preserve computation and API data semantics; translate only labels and presentation text.
- [ ] Run type checks after each logical page group.

### Task 3: Static docs and generated responses

**Files:**
- Create: Tibetan counterparts for app-linked `frontend/public/database/topic*.html` documents
- Modify: `frontend/src/app/details/topic/[id]/page.tsx`, docs catalog, and chat API/client files as required

- [ ] Add translated article files without changing the Chinese source pages.
- [ ] Verify every docs catalog entry resolves to a Tibetan article.
- [ ] Pass locale to chat and request Tibetan responses on Tibetan routes.

### Task 4: Verification and record

**Files:**
- Modify: root `提示词历史.md`

- [ ] Run focused locale tests, `npm run check`, and `npm run build` in `frontend/`.
- [ ] Manually smoke-test language selection, localized navigation, all new feature routes, docs links, and chat.
- [ ] Review `git diff --check` and path-limited status to ensure existing unrelated changes remain untouched.
- [ ] Append the request, output scope, and verification status to `提示词历史.md`.

## 2026-10-10 execution status

- Locale primitives, root chooser, `/zh` and `/bo` routes, shared locale-aware links, document language/title, navigation, visible page copy, topic titles, and documentation catalog titles/summaries are implemented.
- Chat requests now carry the locale; the backend asks the response model to answer in Tibetan for Tibetan sessions.
- The original Chinese topic HTML remains unchanged. The app exposes 26 linked articles with roughly 80,000 Chinese characters; this checkout contains no Tibetan article copies. The Tibetan detail page now states that the article body is still the Chinese source. Full article translation remains open and must be reviewed for calendar terminology before the goal can be called complete.
- Focused locale/copy tests, `npm run check`, `npm run build`, and Python syntax checks passed. Browser smoke checks confirmed `/` language selection, `/zh` return path, Tibetan home/calendar/chat/docs navigation and Tibetan docs cards. Chat generation itself was not exercised because it requires the configured external model service.
- The raw `git diff --check` reports CRLF carriage returns as trailing whitespace in the existing CRLF Python file; line endings were preserved to avoid rewriting the user's dirty file. No files were staged or committed.
