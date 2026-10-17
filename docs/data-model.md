# Data model

Defined in `backend/src/main/resources/db/migration/V1__core_schema.sql` (portable SQL, PostgreSQL 16 verified).

**Identity**: `users`, `learner_profiles` (1:1; level, target, daily goal, dialect, furigana/romaji prefs).

**Content (shared)**: `grammar_concepts` (by JLPT level), `vocabulary_entries` (word, kanji, kana reading, meaning, POS, level),
`example_sentences` (JSON ruby segments + plain text + translation + register; linked to vocabulary or grammar), `lessons`.
Seeded with a small hand-written N5 starter set.

**Progress (per user)**: `study_sessions`, `conversation_sessions`, `conversation_messages`, `learner_mistakes`,
`review_cards` (SRS state: due, stability, difficulty, reps, lapses; targets a vocab entry *or* grammar concept),
`review_events` (rating 1–4 history), `skill_assessments`, `learning_objectives` (unique per user/day/type).

Constraints: enum-like columns use CHECK constraints; user-owned rows cascade on user deletion; indexes cover
`(user, due_at)`, `(user, completed_at)`, `(user, skill, assessed_at)` and content lookups by level.

Phase 1 reads/writes: users, learner_profiles, lessons, study_sessions, learning_objectives (and reads the rest for the dashboard).
