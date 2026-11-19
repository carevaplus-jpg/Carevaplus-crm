package com.carevaplus.jarvis;

import android.graphics.Color;
import android.graphics.Typeface;
import android.text.SpannableStringBuilder;
import android.text.Spanned;
import android.text.style.BackgroundColorSpan;
import android.text.style.RelativeSizeSpan;
import android.text.style.StyleSpan;
import android.text.style.TypefaceSpan;

/** Renders the small subset of Markdown AI replies use: headings, bullets, **bold**, *italic*, `code`. */
final class Markdown {
    private Markdown() {}

    static CharSequence render(String md) {
        SpannableStringBuilder out = new SpannableStringBuilder();
        String[] lines = md.replace("\r", "").split("\n", -1);
        boolean inCode = false;
        for (int li = 0; li < lines.length; li++) {
            String line = lines[li];
            String t = line.trim();
            if (t.startsWith("```")) { inCode = !inCode; continue; }
            int lineStart = out.length();
            if (inCode) {
                out.append(line);
                out.setSpan(new TypefaceSpan("monospace"), lineStart, out.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            } else if (t.matches("^-{3,}$|^\\*{3,}$|^_{3,}$")) {
                // horizontal rule: just a blank line
            } else if (t.matches("^#{1,6}\\s+.*")) {
                inline(out, t.replaceFirst("^#{1,6}\\s+", ""));
                out.setSpan(new StyleSpan(Typeface.BOLD), lineStart, out.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                out.setSpan(new RelativeSizeSpan(1.08f), lineStart, out.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            } else if (t.matches("^[*-]\\s+\\[[ xX]\\]\\s+.*")) {
                out.append(t.matches("^[*-]\\s+\\[[xX]\\].*") ? "☑ " : "☐ ");
                inline(out, t.replaceFirst("^[*-]\\s+\\[[ xX]\\]\\s+", ""));
            } else if (t.matches("^[*•-]\\s+.*")) {
                String indent = line.startsWith("  ") || line.startsWith("\t") ? "    " : "";
                out.append(indent).append("•  ");
                inline(out, t.replaceFirst("^[*•-]\\s+", ""));
            } else {
                inline(out, line);
            }
            if (li < lines.length - 1) out.append('\n');
        }
        // Collapse runs of blank lines.
        String s = out.toString();
        for (int i = s.length() - 1; i >= 2; i--) {
            if (s.charAt(i) == '\n' && s.charAt(i - 1) == '\n' && s.charAt(i - 2) == '\n') {
                out.delete(i, i + 1);
                s = out.toString();
            }
        }
        while (out.length() > 0 && Character.isWhitespace(out.charAt(out.length() - 1))) out.delete(out.length() - 1, out.length());
        return out;
    }

    /** Appends text, turning **bold**, __bold__, *italic* and `code` into spans. */
    private static void inline(SpannableStringBuilder out, String s) {
        int i = 0;
        while (i < s.length()) {
            if (s.startsWith("**", i) || s.startsWith("__", i)) {
                String mark = s.substring(i, i + 2);
                int end = s.indexOf(mark, i + 2);
                if (end > i + 2) {
                    int st = out.length();
                    out.append(s, i + 2, end);
                    out.setSpan(new StyleSpan(Typeface.BOLD), st, out.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                    i = end + 2;
                    continue;
                }
            }
            if (s.charAt(i) == '`') {
                int end = s.indexOf('`', i + 1);
                if (end > i + 1) {
                    int st = out.length();
                    out.append(s, i + 1, end);
                    out.setSpan(new TypefaceSpan("monospace"), st, out.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                    out.setSpan(new BackgroundColorSpan(Color.parseColor("#22344A")), st, out.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                    i = end + 1;
                    continue;
                }
            }
            if (s.charAt(i) == '*' && i + 1 < s.length() && s.charAt(i + 1) != ' ') {
                int end = s.indexOf('*', i + 1);
                if (end > i + 1 && s.charAt(end - 1) != ' ') {
                    int st = out.length();
                    out.append(s, i + 1, end);
                    out.setSpan(new StyleSpan(Typeface.ITALIC), st, out.length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                    i = end + 1;
                    continue;
                }
            }
            out.append(s.charAt(i));
            i++;
        }
    }
}
