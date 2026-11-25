package org.cropcare.ai.database

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import java.io.File
import java.io.FileOutputStream

data class ProblemRecord(
    val id: String,
    val cropId: String,
    val slug: String,
    val commonName: String,
    val scientificName: String,
    val type: String,
    val symptoms: String,
    val spreadFactors: String
)

class KnowledgeDatabaseService(private val context: Context) {

    private val dbName = "crop_care.db"
    private var database: SQLiteDatabase? = null

    fun initialize(): SQLiteDatabase {
        val dbFile = context.getDatabasePath(dbName)
        if (!dbFile.exists()) {
            dbFile.parentFile?.mkdirs()
            context.assets.open(dbName).use { input ->
                FileOutputStream(dbFile).use { output ->
                    val buffer = ByteArray(4 * 1024)
                    var length: Int
                    while (input.read(buffer).also { length = it } > 0) {
                        output.write(buffer, 0, length)
                    }
                    output.flush()
                }
            }
        }
        val db = SQLiteDatabase.openDatabase(dbFile.path, null, SQLiteDatabase.OPEN_READONLY)
        database = db
        return db
    }

    fun getProblemBySlug(slug: String): ProblemRecord? {
        val db = database ?: initialize()
        val cursor = db.rawQuery(
            "SELECT id, crop_id, slug, common_name_en, scientific_name, type, symptoms_summary_en, spread_factors_en FROM problems WHERE slug = ? LIMIT 1",
            arrayOf(slug)
        )

        return cursor.use {
            if (it.moveToFirst()) {
                ProblemRecord(
                    id = it.getString(0),
                    cropId = it.getString(1),
                    slug = it.getString(2),
                    commonName = it.getString(3),
                    scientificName = it.getString(4),
                    type = it.getString(5),
                    symptoms = it.getString(6),
                    spreadFactors = it.getString(7)
                )
            } else {
                null
            }
        }
    }

    fun getTreatments(problemId: String): List<Map<String, String>> {
        val db = database ?: initialize()
        val list = mutableListOf<Map<String, String>>()
        val cursor = db.rawQuery(
            "SELECT category, title, description, timing, statutory_disclaimer FROM treatments WHERE problem_id = ? ORDER BY category ASC",
            arrayOf(problemId)
        )

        cursor.use {
            while (it.moveToNext()) {
                list.add(
                    mapOf(
                        "category" to it.getString(0),
                        "title" to it.getString(1),
                        "description" to it.getString(2),
                        "timing" to (it.getString(3) ?: ""),
                        "disclaimer" to (it.getString(4) ?: "")
                    )
                )
            }
        }
        return list
    }
}

