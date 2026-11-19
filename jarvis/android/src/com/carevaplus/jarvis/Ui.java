package com.carevaplus.jarvis;

import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.util.TypedValue;

/** Shared colours and drawable helpers for the Jarvis look. */
final class Ui {
    private Ui() {}

    static final int BG_TOP = Color.parseColor("#04080E");
    static final int BG_BOTTOM = Color.parseColor("#0A1622");
    static final int PANEL = Color.parseColor("#0E1823");
    static final int CARD = Color.parseColor("#121E2B");
    static final int CARD_STROKE = Color.parseColor("#1F3547");
    static final int ACCENT = Color.parseColor("#29C5F6");
    static final int ACCENT_2 = Color.parseColor("#1B8FD8");
    static final int TEXT = Color.parseColor("#E8F4FA");
    static final int MUTED = Color.parseColor("#7F93A3");
    static final int OK = Color.parseColor("#3DDC97");
    static final int WARN = Color.parseColor("#FFC857");
    static final int ERROR = Color.parseColor("#FF8A80");

    static int dp(Context c, float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, c.getResources().getDisplayMetrics());
    }

    static GradientDrawable rounded(Context c, int color, float radiusDp) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        d.setCornerRadius(dp(c, radiusDp));
        return d;
    }

    static GradientDrawable card(Context c, int color, int stroke, float radiusDp) {
        GradientDrawable d = rounded(c, color, radiusDp);
        d.setStroke(dp(c, 1), stroke);
        return d;
    }

    /** Rounded rectangle with individual corner radii (tl, tr, br, bl) in dp. */
    static GradientDrawable corners(Context c, int color, float tl, float tr, float br, float bl) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(color);
        float a = dp(c, tl), b = dp(c, tr), e = dp(c, br), f = dp(c, bl);
        d.setCornerRadii(new float[]{a, a, b, b, e, e, f, f});
        return d;
    }

    static GradientDrawable gradient(int top, int bottom) {
        return new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{top, bottom});
    }

    static GradientDrawable pill(Context c, int fill, int stroke) {
        GradientDrawable d = rounded(c, fill, 100);
        if (stroke != 0) d.setStroke(dp(c, 1), stroke);
        return d;
    }

    static int badgeColor(String badge) {
        switch (badge) {
            case "FREE": return OK;
            case "FAST": return WARN;
            case "HEAVY": return Color.parseColor("#B794F6");
            case "PRIVATE": case "OFFLINE": return Color.parseColor("#63B3ED");
            case "BEST": return ACCENT;
            default: return MUTED;
        }
    }
}
