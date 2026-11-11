package com.rayen.nhari;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Home-screen widget: next prayer, tickets left, today's goal, last glucose, water. */
public class NhariWidget extends AppWidgetProvider {
    private static final String PREFS = "nhari_widget";

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) { render(c); }

    static void save(Context c, String json) {
        c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("state", json).apply();
        render(c);
    }

    static JSONObject state(Context c) {
        SharedPreferences p = c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try { return new JSONObject(p.getString("state", "{}")); } catch (JSONException e) { return new JSONObject(); }
    }

    /** A glucose value typed in a notification shows at once, before the app is opened. */
    static void setBg(Context c, String text) {
        JSONObject s = state(c);
        try { s.put("bg", text); s.put("bgAt", System.currentTimeMillis()); } catch (JSONException ignored) { }
        save(c, s.toString());
    }

    static void render(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, NhariWidget.class));
        if (ids == null || ids.length == 0) return;
        JSONObject s = state(c);
        long now = System.currentTimeMillis();
        SimpleDateFormat hm = new SimpleDateFormat("HH:mm", Locale.US);

        String prayer = "🕌 —";
        JSONArray pr = s.optJSONArray("prayers");
        if (pr != null) {
            for (int i = 0; i < pr.length(); i++) {
                JSONObject p = pr.optJSONObject(i);
                if (p != null && p.optLong("at") > now) {
                    prayer = "🕌 " + p.optString("n") + "  " + hm.format(new Date(p.optLong("at")));
                    break;
                }
            }
        }
        String work = s.optString("work", "");
        String bg = s.optString("bg", "");
        long bgAt = s.optLong("bgAt", 0);
        String bgLine = bg.isEmpty() ? "🩸 —" : "🩸 " + bg + (bgAt > 0 ? "  (" + hm.format(new Date(bgAt)) + ")" : "");
        String water = s.optString("water", "");
        String gym = s.optString("gym", "");

        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget);
        v.setTextViewText(R.id.w_prayer, prayer);
        v.setTextViewText(R.id.w_work, work.isEmpty() ? "🧰 —" : work);
        v.setTextViewText(R.id.w_bg, bgLine + (water.isEmpty() ? "" : "   ·   " + water));
        v.setTextViewText(R.id.w_gym, gym);
        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(c, 21, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        m.updateAppWidget(ids, v);
    }
}
