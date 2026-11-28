package com.carevaplus.jarvis.brain

import org.json.JSONArray
import org.json.JSONObject

/** Pulls the first balanced JSON object out of model output (models wrap JSON in prose or fences). */
fun extractJson(text: String): JSONObject? {
    val s = text.replace(Regex("<think>[\\s\\S]*?</think>"), "")
    var start = s.indexOf('{')
    while (start >= 0) {
        var depth = 0
        var inStr = false
        var esc = false
        for (i in start until s.length) {
            val c = s[i]
            if (inStr) {
                if (esc) esc = false else if (c == '\\') esc = true else if (c == '"') inStr = false
            } else when (c) {
                '"' -> inStr = true
                '{' -> depth++
                '}' -> { depth--; if (depth == 0) {
                    runCatching { return JSONObject(s.substring(start, i + 1)) }
                    break
                } }
            }
        }
        start = s.indexOf('{', start + 1)
    }
    return null
}

fun JSONArray.strings(): List<String> = (0 until length()).mapNotNull { optString(it).takeIf { s -> s.isNotBlank() } }
fun JSONArray.objects(): List<JSONObject> = (0 until length()).mapNotNull { optJSONObject(it) }
