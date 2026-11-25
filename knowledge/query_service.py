"""
Knowledge Retrieval Service
Provides structured offline query access to knowledge/database/crop_care.db
with region, season, and language fallback.
"""

import os
import sqlite3
from typing import Any, Dict, List, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "database", "crop_care.db")


class KnowledgeQueryService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def get_problem(self, problem_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT * FROM problems WHERE problem_id = ?", (problem_id,)
            ).fetchone()
            return dict(row) if row else None

    def list_problems_by_crop(
        self, crop_id: str, problem_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            if problem_type:
                rows = conn.execute(
                    "SELECT * FROM problems WHERE crop_id = ? AND problem_type = ? ORDER BY problem_name",
                    (crop_id, problem_type),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM problems WHERE crop_id = ? ORDER BY problem_name",
                    (crop_id,),
                ).fetchall()
            return [dict(r) for r in rows]

    def get_advisory(
        self,
        problem_id: str,
        region: str = "All",
        season: str = "All",
        language: str = "en",
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieves advisory with hierarchical fallback:
        1. Exact (region, season, language)
        2. Regional (region, 'All', language)
        3. State/Default ('All', 'All', language)
        4. English fallback ('All', 'All', 'en')
        """
        with self._get_connection() as conn:
            # 1. Exact match
            row = conn.execute(
                """SELECT * FROM advisory_records 
                   WHERE problem_id = ? AND region = ? AND season = ? AND language = ?""",
                (problem_id, region, season, language),
            ).fetchone()
            if row:
                res = dict(row)
                res["fallback_level"] = "exact"
                return res

            # 2. Regional with any season
            row = conn.execute(
                """SELECT * FROM advisory_records 
                   WHERE problem_id = ? AND region = ? AND language = ?""",
                (problem_id, region, language),
            ).fetchone()
            if row:
                res = dict(row)
                res["fallback_level"] = "regional_season_fallback"
                return res

            # 3. State/Default region in requested language
            row = conn.execute(
                """SELECT * FROM advisory_records 
                   WHERE problem_id = ? AND region = 'All' AND language = ?""",
                (problem_id, language),
            ).fetchone()
            if row:
                res = dict(row)
                res["fallback_level"] = "state_level_fallback"
                return res

            # 3.5 Any regional record matching the requested language
            row = conn.execute(
                """SELECT * FROM advisory_records 
                   WHERE problem_id = ? AND language = ?""",
                (problem_id, language),
            ).fetchone()
            if row:
                res = dict(row)
                res["fallback_level"] = "language_match_fallback"
                return res

            # 4. English fallback
            row = conn.execute(
                """SELECT * FROM advisory_records 
                   WHERE problem_id = ? AND language = 'en'""",
                (problem_id,),
            ).fetchone()
            if row:
                res = dict(row)
                res["fallback_level"] = "english_universal_fallback"
                return res

            return None

    def get_treatments(self, problem_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM treatments WHERE problem_id = ? ORDER BY treatment_type",
                (problem_id,),
            ).fetchall()
            return [dict(r) for r in rows]

    def get_sources(self, problem_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM sources WHERE problem_id = ?", (problem_id,)
            ).fetchall()
            return [dict(r) for r in rows]

    def search_knowledge(self, query: str, crop_id: Optional[str] = None) -> List[Dict[str, Any]]:
        stopwords = {"what", "should", "i", "do", "about", "how", "to", "treat", "cure", "for", "the", "in", "my", "is", "a", "an", "on"}
        words = [w.strip("?,.!") for w in query.lower().split() if w.strip("?,.!") not in stopwords and len(w.strip("?,.!")) >= 3]
        if not words:
            words = [query.strip().lower()]

        with self._get_connection() as conn:
            # Query all problems for crop or all crops
            if crop_id:
                rows = conn.execute("SELECT * FROM problems WHERE crop_id = ?", (crop_id,)).fetchall()
            else:
                rows = conn.execute("SELECT * FROM problems").fetchall()

            scored = []
            for r in rows:
                p = dict(r)
                text = f"{p['problem_name']} {p['scientific_name']} {p['symptoms']} {p['problem_id']}".lower()
                score = sum(1 for w in words if w in text)
                if score > 0:
                    scored.append((score, p))

            scored.sort(key=lambda x: x[0], reverse=True)
            return [item[1] for item in scored]


if __name__ == "__main__":
    qs = KnowledgeQueryService()
    adv = qs.get_advisory("rice-blast", region="Andhra Pradesh", season="kharif", language="en")
    print("Test Rice Blast Advisory:", adv)
    treatments = qs.get_treatments("rice-blast")
    print(f"Retrieved {len(treatments)} treatments for rice-blast.")
