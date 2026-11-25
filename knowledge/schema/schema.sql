-- AI Crop Disease & Pest Assistant: Structured Offline Knowledge Schema
-- Compliant with ICAR, ANGRAU, PJTSAU, and CIB&RC documentation standards.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS crops (
    crop_id TEXT PRIMARY KEY,
    crop_name TEXT NOT NULL,
    scientific_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS problems (
    problem_id TEXT PRIMARY KEY,
    crop_id TEXT NOT NULL REFERENCES crops(crop_id) ON DELETE CASCADE,
    problem_name TEXT NOT NULL,
    scientific_name TEXT,
    problem_type TEXT NOT NULL CHECK(problem_type IN ('disease', 'pest')),
    symptoms TEXT NOT NULL,
    causes TEXT NOT NULL,
    affected_parts TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS advisory_records (
    advisory_id TEXT PRIMARY KEY,
    problem_id TEXT NOT NULL REFERENCES problems(problem_id) ON DELETE CASCADE,
    region TEXT NOT NULL DEFAULT 'All',
    season TEXT NOT NULL DEFAULT 'All' CHECK(season IN ('kharif', 'rabi', 'All')),
    language TEXT NOT NULL CHECK(language IN ('en', 'hi', 'te')),
    immediate_actions TEXT NOT NULL,
    preventive_actions TEXT NOT NULL,
    monitoring_guidance TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS treatments (
    treatment_id TEXT PRIMARY KEY,
    problem_id TEXT NOT NULL REFERENCES problems(problem_id) ON DELETE CASCADE,
    treatment_type TEXT NOT NULL CHECK(treatment_type IN ('cultural', 'biological', 'chemical')),
    product_or_method TEXT NOT NULL,
    approved_dose TEXT,
    application_method TEXT,
    waiting_period_days INTEGER DEFAULT 0,
    safety_precautions TEXT NOT NULL,
    registration_reference TEXT,
    region TEXT NOT NULL DEFAULT 'All',
    validity_status TEXT NOT NULL DEFAULT 'verified' CHECK(validity_status IN ('verified', 'provisional', 'pending_validation'))
);

CREATE TABLE IF NOT EXISTS sources (
    source_id TEXT PRIMARY KEY,
    problem_id TEXT REFERENCES problems(problem_id) ON DELETE CASCADE,
    institution TEXT NOT NULL,
    document_title TEXT NOT NULL,
    publication_date TEXT NOT NULL,
    url TEXT,
    page_or_section TEXT,
    verification_status TEXT NOT NULL DEFAULT 'verified',
    last_reviewed TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS translations (
    translation_id TEXT PRIMARY KEY,
    record_id TEXT NOT NULL,
    language TEXT NOT NULL CHECK(language IN ('en', 'hi', 'te')),
    translated_content TEXT NOT NULL,
    reviewer_status TEXT NOT NULL DEFAULT 'expert_reviewed'
);

CREATE TABLE IF NOT EXISTS knowledge_versions (
    version_id TEXT PRIMARY KEY,
    release_version TEXT NOT NULL,
    created_at TEXT NOT NULL,
    reviewed_by TEXT NOT NULL
);

-- Indices for rapid offline retrieval
CREATE INDEX IF NOT EXISTS idx_problems_crop ON problems(crop_id);
CREATE INDEX IF NOT EXISTS idx_problems_type ON problems(problem_type);
CREATE INDEX IF NOT EXISTS idx_advisories_lookup ON advisory_records(problem_id, region, season, language);
CREATE INDEX IF NOT EXISTS idx_treatments_problem ON treatments(problem_id);

