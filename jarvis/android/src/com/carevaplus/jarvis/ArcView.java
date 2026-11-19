package com.carevaplus.jarvis;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.Paint;
import android.graphics.RadialGradient;
import android.graphics.Shader;
import android.view.View;
import android.view.animation.LinearInterpolator;

/** Jarvis's animated core: rotating rings that spin faster while Jarvis is thinking. */
class ArcView extends View {
    private final Paint ring = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint dash = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint inner = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint core = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final ValueAnimator spin = ValueAnimator.ofFloat(0f, 360f);
    private float angle;
    private float pulse = 1f;
    private int color = Ui.ACCENT;

    ArcView(Context c) {
        super(c);
        ring.setStyle(Paint.Style.STROKE);
        dash.setStyle(Paint.Style.STROKE);
        dash.setStrokeCap(Paint.Cap.ROUND);
        inner.setStyle(Paint.Style.STROKE);
        spin.setInterpolator(new LinearInterpolator());
        spin.setRepeatCount(ValueAnimator.INFINITE);
        spin.addUpdateListener(a -> {
            angle = (float) a.getAnimatedValue();
            pulse = 0.85f + 0.15f * (float) Math.abs(Math.sin(Math.toRadians(angle * 2)));
            invalidate();
        });
        setBusy(false);
    }

    void setBusy(boolean busy) {
        spin.setDuration(busy ? 1400 : 9000);
        if (!spin.isStarted()) spin.start();
        else { float f = spin.getAnimatedFraction(); spin.cancel(); spin.start(); spin.setCurrentFraction(f); }
    }

    void setColor(int c) { color = c; invalidate(); }

    @Override protected void onDetachedFromWindow() { spin.cancel(); super.onDetachedFromWindow(); }

    @Override protected void onAttachedToWindow() { super.onAttachedToWindow(); if (!spin.isStarted()) spin.start(); }

    @Override
    protected void onDraw(Canvas canvas) {
        float w = getWidth(), h = getHeight();
        float cx = w / 2f, cy = h / 2f, r = Math.min(w, h) / 2f;
        float sw = Math.max(2f, r * 0.09f);

        ring.setStrokeWidth(sw * 0.5f);
        ring.setColor(withAlpha(color, 90));
        canvas.drawCircle(cx, cy, r - sw, ring);

        dash.setStrokeWidth(sw);
        dash.setColor(color);
        float circ = (float) (2 * Math.PI * (r * 0.78f));
        dash.setPathEffect(new DashPathEffect(new float[]{circ / 14f, circ / 28f}, 0));
        canvas.save();
        canvas.rotate(angle, cx, cy);
        canvas.drawCircle(cx, cy, r * 0.78f, dash);
        canvas.restore();

        inner.setStrokeWidth(sw * 0.4f);
        inner.setColor(withAlpha(Color.WHITE, 120));
        canvas.save();
        canvas.rotate(-angle * 1.5f, cx, cy);
        inner.setPathEffect(new DashPathEffect(new float[]{r * 0.5f, r * 0.25f}, 0));
        canvas.drawCircle(cx, cy, r * 0.56f, inner);
        canvas.restore();

        float cr = r * 0.46f * pulse;
        core.setShader(new RadialGradient(cx, cy, cr, new int[]{Color.WHITE, color, withAlpha(color, 0)},
                new float[]{0f, 0.45f, 1f}, Shader.TileMode.CLAMP));
        canvas.drawCircle(cx, cy, cr, core);
    }

    private static int withAlpha(int c, int a) { return (c & 0x00FFFFFF) | (a << 24); }
}
