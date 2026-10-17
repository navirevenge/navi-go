-- Identity
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE UNIQUE INDEX ux_users_email ON users (email);

CREATE TABLE learner_profiles (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    self_reported_level VARCHAR(2) NOT NULL DEFAULT 'N5',
    target_level VARCHAR(2) NOT NULL DEFAULT 'N3',
    daily_goal_minutes INT NOT NULL DEFAULT 30,
    dialect_preference VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    show_furigana BOOLEAN NOT NULL DEFAULT TRUE,
    show_romaji BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT ck_profile_level CHECK (self_reported_level IN ('N5','N4','N3','N2','N1')),
    CONSTRAINT ck_profile_target CHECK (target_level IN ('N5','N4','N3','N2','N1')),
    CONSTRAINT ck_profile_goal CHECK (daily_goal_minutes BETWEEN 5 AND 240),
    CONSTRAINT ck_profile_dialect CHECK (dialect_preference IN ('STANDARD','KANSAI'))
);

-- Learning content (shared, independent of user progress)
CREATE TABLE grammar_concepts (
    id UUID PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    jlpt_level VARCHAR(2) NOT NULL,
    explanation TEXT NOT NULL,
    usage_notes TEXT,
    CONSTRAINT ck_grammar_level CHECK (jlpt_level IN ('N5','N4','N3','N2','N1'))
);
CREATE INDEX ix_grammar_level ON grammar_concepts (jlpt_level);

CREATE TABLE vocabulary_entries (
    id UUID PRIMARY KEY,
    word VARCHAR(100) NOT NULL,
    kanji VARCHAR(100),
    reading_kana VARCHAR(200) NOT NULL,
    meaning_en VARCHAR(500) NOT NULL,
    part_of_speech VARCHAR(50),
    jlpt_level VARCHAR(2),
    CONSTRAINT ck_vocab_level CHECK (jlpt_level IS NULL OR jlpt_level IN ('N5','N4','N3','N2','N1'))
);
CREATE INDEX ix_vocab_level ON vocabulary_entries (jlpt_level);

CREATE TABLE example_sentences (
    id UUID PRIMARY KEY,
    japanese_segments TEXT NOT NULL, -- JSON array of {text, reading?} segments for ruby rendering
    japanese_plain TEXT NOT NULL,
    translation_en TEXT NOT NULL,
    register VARCHAR(20) NOT NULL DEFAULT 'POLITE',
    vocabulary_id UUID REFERENCES vocabulary_entries (id) ON DELETE CASCADE,
    grammar_concept_id UUID REFERENCES grammar_concepts (id) ON DELETE CASCADE,
    CONSTRAINT ck_sentence_register CHECK (register IN ('CASUAL','POLITE','KANSAI'))
);
CREATE INDEX ix_sentence_vocab ON example_sentences (vocabulary_id);
CREATE INDEX ix_sentence_grammar ON example_sentences (grammar_concept_id);

CREATE TABLE lessons (
    id UUID PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    lesson_type VARCHAR(30) NOT NULL,
    jlpt_level VARCHAR(2) NOT NULL,
    estimated_minutes INT NOT NULL,
    position INT NOT NULL,
    grammar_concept_id UUID REFERENCES grammar_concepts (id),
    CONSTRAINT ck_lesson_type CHECK (lesson_type IN ('VOCABULARY','GRAMMAR','SENTENCE_CONSTRUCTION','LISTENING','CONVERSATION')),
    CONSTRAINT ck_lesson_level CHECK (jlpt_level IN ('N5','N4','N3','N2','N1')),
    CONSTRAINT ck_lesson_minutes CHECK (estimated_minutes > 0)
);
CREATE INDEX ix_lessons_level_position ON lessons (jlpt_level, position);

-- User progress
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons (id),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INT,
    CONSTRAINT ck_session_duration CHECK (duration_minutes IS NULL OR duration_minutes >= 0)
);
CREATE INDEX ix_study_sessions_user_completed ON study_sessions (user_id, completed_at);

CREATE TABLE conversation_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    scenario VARCHAR(100) NOT NULL,
    register VARCHAR(20) NOT NULL DEFAULT 'POLITE',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    summary TEXT,
    CONSTRAINT ck_conv_register CHECK (register IN ('CASUAL','POLITE','KANSAI'))
);
CREATE INDEX ix_conversation_user_started ON conversation_sessions (user_id, started_at);

CREATE TABLE conversation_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversation_sessions (id) ON DELETE CASCADE,
    sender VARCHAR(10) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT ck_message_sender CHECK (sender IN ('LEARNER','TUTOR'))
);
CREATE INDEX ix_messages_conversation ON conversation_messages (conversation_id, created_at);

CREATE TABLE learner_mistakes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    grammar_concept_id UUID REFERENCES grammar_concepts (id),
    message_id UUID REFERENCES conversation_messages (id) ON DELETE SET NULL,
    original_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    explanation TEXT,
    ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX ix_mistakes_user ON learner_mistakes (user_id, created_at);

CREATE TABLE review_cards (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    vocabulary_id UUID REFERENCES vocabulary_entries (id) ON DELETE CASCADE,
    grammar_concept_id UUID REFERENCES grammar_concepts (id) ON DELETE CASCADE,
    state VARCHAR(20) NOT NULL DEFAULT 'NEW',
    due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    stability DOUBLE PRECISION NOT NULL DEFAULT 0,
    difficulty DOUBLE PRECISION NOT NULL DEFAULT 0,
    reps INT NOT NULL DEFAULT 0,
    lapses INT NOT NULL DEFAULT 0,
    last_reviewed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT ck_card_state CHECK (state IN ('NEW','LEARNING','REVIEW','RELEARNING')),
    CONSTRAINT ck_card_target CHECK ((vocabulary_id IS NOT NULL) <> (grammar_concept_id IS NOT NULL))
);
CREATE INDEX ix_cards_user_due ON review_cards (user_id, due_at);

CREATE TABLE review_events (
    id UUID PRIMARY KEY,
    card_id UUID NOT NULL REFERENCES review_cards (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    rating INT NOT NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    elapsed_days DOUBLE PRECISION,
    scheduled_days DOUBLE PRECISION,
    CONSTRAINT ck_event_rating CHECK (rating BETWEEN 1 AND 4)
);
CREATE INDEX ix_events_user_reviewed ON review_events (user_id, reviewed_at);
CREATE INDEX ix_events_card ON review_events (card_id);

CREATE TABLE skill_assessments (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    skill VARCHAR(30) NOT NULL,
    score DOUBLE PRECISION NOT NULL,
    estimated_level VARCHAR(2),
    assessed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT ck_skill CHECK (skill IN ('VOCABULARY','GRAMMAR','READING','LISTENING','SPEAKING','SENTENCE_CONSTRUCTION')),
    CONSTRAINT ck_skill_score CHECK (score BETWEEN 0 AND 1),
    CONSTRAINT ck_skill_level CHECK (estimated_level IS NULL OR estimated_level IN ('N5','N4','N3','N2','N1'))
);
CREATE INDEX ix_skill_user_skill ON skill_assessments (user_id, skill, assessed_at);

CREATE TABLE learning_objectives (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    objective_date DATE NOT NULL,
    objective_type VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    target_count INT NOT NULL,
    CONSTRAINT ck_objective_target CHECK (target_count > 0),
    CONSTRAINT ck_objective_type CHECK (objective_type IN ('STUDY_MINUTES','GRAMMAR_LESSON','CONVERSATION')),
    CONSTRAINT ux_objective UNIQUE (user_id, objective_date, objective_type)
);

-- Seed content (original, hand-written N5 starter material)
INSERT INTO grammar_concepts (id, slug, title, jlpt_level, explanation, usage_notes) VALUES
 ('00000000-0000-0000-0000-0000000000a1', 'wa-desu', 'A は B です', 'N5',
  'は marks the topic of the sentence and です makes it polite. "A は B です" means "As for A, it is B".',
  'は is read "wa" when it is a particle. です is the polite copula; casual speech uses だ or drops it.'),
 ('00000000-0000-0000-0000-0000000000a2', 'masu-form', 'Polite verbs: ～ます', 'N5',
  'Verbs in ～ます form are polite non-past forms and are used with people you do not know well.',
  'Use ～ません for the negative. Casual speech uses the dictionary form.'),
 ('00000000-0000-0000-0000-0000000000a3', 'te-form-request', '～てください', 'N5',
  'Attach ください to the て-form of a verb to politely ask someone to do something.',
  'Fine for everyday requests; for strangers or favours, ～ていただけませんか is softer.');

INSERT INTO lessons (id, slug, title, summary, lesson_type, jlpt_level, estimated_minutes, position, grammar_concept_id) VALUES
 ('00000000-0000-0000-0000-0000000000b1', 'n5-greetings-vocab', 'Greetings and introductions', 'Core vocabulary for meeting people.', 'VOCABULARY', 'N5', 10, 1, NULL),
 ('00000000-0000-0000-0000-0000000000b2', 'n5-wa-desu', 'A は B です', 'Introduce yourself with the topic particle and copula.', 'GRAMMAR', 'N5', 12, 2, '00000000-0000-0000-0000-0000000000a1'),
 ('00000000-0000-0000-0000-0000000000b3', 'n5-masu-form', 'Polite verbs: ～ます', 'Conjugate and use polite verbs.', 'GRAMMAR', 'N5', 15, 3, '00000000-0000-0000-0000-0000000000a2'),
 ('00000000-0000-0000-0000-0000000000b4', 'n5-te-request', 'Making requests with ～てください', 'Ask politely using the て-form.', 'GRAMMAR', 'N5', 15, 4, '00000000-0000-0000-0000-0000000000a3');
