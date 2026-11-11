package com.rayen.nhari;

import android.content.Context;
import android.content.pm.PackageManager;
import android.speech.tts.TextToSpeech;

import java.util.Locale;

/** Arabic text-to-speech: which engine, which locale, and whether the phone has the voice. */
final class Voice {
    static final String GOOGLE = "com.google.android.tts";
    /** "ok", "missing" (engine without Arabic voice data) or "none" (no engine); null until checked. */
    static volatile String status = null;
    private static TextToSpeech probe;

    private Voice() { }

    static boolean hasGoogle(Context c) {
        try { c.getPackageManager().getPackageInfo(GOOGLE, 0); return true; }
        catch (PackageManager.NameNotFoundException e) { return false; }
    }

    /** Pick the first Arabic locale this engine can speak. */
    static boolean useArabic(TextToSpeech t) {
        Locale[] tries = { new Locale("ar"), new Locale("ar", "SA"), new Locale("ar", "EG"), new Locale("ar", "TN"), new Locale("ar", "MA") };
        for (Locale l : tries) {
            int r = t.setLanguage(l);
            if (r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED) return true;
        }
        return false;
    }

    static void check(Context c) {
        if (probe != null) return;
        final Context app = c.getApplicationContext();
        TextToSpeech.OnInitListener l = s -> {
            if (s != TextToSpeech.SUCCESS || probe == null) status = "none";
            else status = useArabic(probe) ? "ok" : "missing";
            if (probe != null) { probe.shutdown(); probe = null; }
        };
        probe = hasGoogle(app) ? new TextToSpeech(app, l, GOOGLE) : new TextToSpeech(app, l);
    }
}
