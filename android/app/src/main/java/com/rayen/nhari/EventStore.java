package com.rayen.nhari;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/**
 * The reminders the web app planned (prayers, adhkar, gym, sleep, thumun...), kept on the phone
 * so they ring even when the app is closed. Each event: {id, at (ms), kind, title, body, items...}.
 * Overrides remember what the user postponed or skipped, so a new plan from the app keeps them.
 */
final class EventStore {
    private static final String PREFS = "nhari_events";
    private static final String K_EVENTS = "events";
    private static final String K_OVERRIDES = "overrides";
    private static final long DAY = 24L * 3600 * 1000;

    private EventStore() { }

    private static SharedPreferences prefs(Context c) {
        return c.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static synchronized JSONArray events(Context c) {
        try { return new JSONArray(prefs(c).getString(K_EVENTS, "[]")); }
        catch (JSONException e) { return new JSONArray(); }
    }

    static synchronized void saveEvents(Context c, JSONArray a) {
        prefs(c).edit().putString(K_EVENTS, a.toString()).apply();
    }

    static synchronized JSONObject overrides(Context c) {
        try { return new JSONObject(prefs(c).getString(K_OVERRIDES, "{}")); }
        catch (JSONException e) { return new JSONObject(); }
    }

    private static void saveOverrides(Context c, JSONObject o) {
        prefs(c).edit().putString(K_OVERRIDES, o.toString()).apply();
    }

    /** An event planned by the phone itself (id "x-..."), e.g. measuring again 15 min after a low value. */
    static synchronized void addOne(Context c, JSONObject e) {
        JSONArray a = events(c);
        a.put(e);
        saveEvents(c, a);
    }

    /** Replace the whole plan with a new one from the app, keeping postponed / skipped events. */
    static synchronized void replace(Context c, JSONArray incoming) {
        long now = System.currentTimeMillis();
        JSONArray before = events(c);
        JSONObject ov = overrides(c);
        // forget overrides older than two days
        JSONObject keptOv = new JSONObject();
        Iterator<String> keys = ov.keys();
        while (keys.hasNext()) {
            String k = keys.next();
            JSONObject o = ov.optJSONObject(k);
            if (o != null && now - o.optLong("set", 0) < 2 * DAY) {
                try { keptOv.put(k, o); } catch (JSONException ignored) { }
            }
        }
        saveOverrides(c, keptOv);
        JSONArray out = new JSONArray();
        if (incoming != null) {
            for (int i = 0; i < incoming.length(); i++) {
                JSONObject e = incoming.optJSONObject(i);
                if (e == null) continue;
                JSONObject o = keptOv.optJSONObject(e.optString("id"));
                if (o != null) {
                    if (o.optBoolean("skip")) continue;
                    if (o.has("at")) { try { e.put("at", o.optLong("at")); } catch (JSONException ignored) { } }
                }
                if (e.optLong("at") < now - 60_000) continue;
                out.put(e);
            }
        }
        // the phone's own events stay, unless the app planned the same recheck
        for (int i = 0; i < before.length(); i++) {
            JSONObject e = before.optJSONObject(i);
            if (e == null || !e.optString("id").startsWith("x-") || e.optLong("at") < now) continue;
            boolean dup = false;
            for (int j = 0; incoming != null && j < incoming.length(); j++) {
                JSONObject n = incoming.optJSONObject(j);
                if (n != null && n.optString("id").startsWith("n-hypo") && Math.abs(n.optLong("at") - e.optLong("at")) < 5 * 60_000) dup = true;
            }
            if (!dup) out.put(e);
        }
        saveEvents(c, out);
    }

    static synchronized JSONObject get(Context c, String id) {
        JSONArray a = events(c);
        for (int i = 0; i < a.length(); i++) {
            JSONObject e = a.optJSONObject(i);
            if (e != null && id.equals(e.optString("id"))) return e;
        }
        return null;
    }

    /** Remove and return one event (used when the user starts it from a notification). */
    static synchronized JSONObject take(Context c, String id) {
        JSONArray a = events(c), out = new JSONArray();
        JSONObject found = null;
        for (int i = 0; i < a.length(); i++) {
            JSONObject e = a.optJSONObject(i);
            if (e == null) continue;
            if (found == null && id.equals(e.optString("id"))) found = e; else out.put(e);
        }
        saveEvents(c, out);
        if (found != null) setOverride(c, id, true, 0);
        return found;
    }

    /** Remove and return the events that are due now; very old ones (missed while off) are dropped. */
    static synchronized List<JSONObject> takeDue(Context c, long until) {
        long now = System.currentTimeMillis();
        JSONArray a = events(c), out = new JSONArray();
        List<JSONObject> due = new ArrayList<>();
        for (int i = 0; i < a.length(); i++) {
            JSONObject e = a.optJSONObject(i);
            if (e == null) continue;
            long at = e.optLong("at");
            if (at <= until) {
                if (at >= now - 10 * 60_000) due.add(e);
                setOverride(c, e.optString("id"), true, 0);
            } else out.put(e);
        }
        saveEvents(c, out);
        return due;
    }

    static synchronized void postpone(Context c, String id, long newAt) {
        JSONArray a = events(c);
        for (int i = 0; i < a.length(); i++) {
            JSONObject e = a.optJSONObject(i);
            if (e != null && id.equals(e.optString("id"))) {
                try { e.put("at", newAt); } catch (JSONException ignored) { }
            }
        }
        saveEvents(c, a);
        setOverride(c, id, false, newAt);
    }

    static synchronized void skip(Context c, String id) {
        JSONArray a = events(c), out = new JSONArray();
        for (int i = 0; i < a.length(); i++) {
            JSONObject e = a.optJSONObject(i);
            if (e != null && !id.equals(e.optString("id"))) out.put(e);
        }
        saveEvents(c, out);
        setOverride(c, id, true, 0);
    }

    private static void setOverride(Context c, String id, boolean skip, long at) {
        if (id == null || id.isEmpty()) return;
        JSONObject ov = overrides(c);
        try {
            JSONObject o = new JSONObject();
            o.put("set", System.currentTimeMillis());
            if (skip) o.put("skip", true); else o.put("at", at);
            ov.put(id, o);
        } catch (JSONException ignored) { }
        saveOverrides(c, ov);
    }

    static synchronized JSONObject next(Context c) {
        long now = System.currentTimeMillis();
        JSONArray a = events(c);
        JSONObject best = null;
        for (int i = 0; i < a.length(); i++) {
            JSONObject e = a.optJSONObject(i);
            if (e == null || e.optLong("at") < now - 5000) continue;
            if (best == null || e.optLong("at") < best.optLong("at")) best = e;
        }
        return best;
    }
}
