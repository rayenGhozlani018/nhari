package com.rayen.nhari;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * What the user confirmed from a notification while the app was closed (applied when it opens),
 * and which "done?" notifications are showing (so the app can clear them once done in the app).
 */
final class Actions {
    private static final String PREFS = "nhari_actions";
    private static final String K_QUEUE = "queue";
    private static final String K_POSTED = "posted";
    private static final long DAY = 24L * 3600 * 1000;

    private Actions() { }

    private static SharedPreferences p(Context c) { return c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    private static JSONArray arr(Context c, String k) {
        try { return new JSONArray(p(c).getString(k, "[]")); } catch (JSONException e) { return new JSONArray(); }
    }

    static synchronized void add(Context c, JSONObject a) {
        JSONArray q = arr(c, K_QUEUE);
        q.put(a);
        p(c).edit().putString(K_QUEUE, q.toString()).apply();
    }

    static synchronized String take(Context c) {
        String s = arr(c, K_QUEUE).toString();
        p(c).edit().putString(K_QUEUE, "[]").apply();
        return s;
    }

    static synchronized void posted(Context c, JSONObject a, long at) {
        String key = a.optString("key");
        if (key.isEmpty()) return;
        long now = System.currentTimeMillis();
        JSONArray old = arr(c, K_POSTED), out = new JSONArray();
        for (int i = 0; i < old.length(); i++) {
            JSONObject o = old.optJSONObject(i);
            if (o == null || now - o.optLong("posted") > DAY || key.equals(o.optString("key"))) continue;
            out.put(o);
        }
        try {
            out.put(new JSONObject().put("key", key).put("t", a.optString("t")).put("k", a.optString("k"))
                    .put("dk", a.optString("dk")).put("at", at).put("posted", now));
        } catch (JSONException ignored) { }
        p(c).edit().putString(K_POSTED, out.toString()).apply();
    }

    static synchronized void unpost(Context c, String key) {
        if (key == null) return;
        JSONArray old = arr(c, K_POSTED), out = new JSONArray();
        for (int i = 0; i < old.length(); i++) {
            JSONObject o = old.optJSONObject(i);
            if (o != null && !key.equals(o.optString("key"))) out.put(o);
        }
        p(c).edit().putString(K_POSTED, out.toString()).apply();
    }

    static synchronized String postedList(Context c) {
        long now = System.currentTimeMillis();
        JSONArray old = arr(c, K_POSTED), out = new JSONArray();
        for (int i = 0; i < old.length(); i++) {
            JSONObject o = old.optJSONObject(i);
            if (o != null && now - o.optLong("posted") <= DAY) out.put(o);
        }
        return out.toString();
    }
}
