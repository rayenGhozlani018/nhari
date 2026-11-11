package com.rayen.nhari;

import android.content.Context;
import android.content.Intent;

import org.json.JSONObject;

/** Decides what an event does when its time comes: play, notify quietly, or warn first. */
final class Runner {
    private Runner() { }

    static void fire(Context c, JSONObject e, boolean force) {
        String kind = e.optString("kind", "notify");
        if ("warn".equals(kind)) { Notifs.warn(c, e); return; }
        boolean audio = "audio".equals(kind);
        boolean quiet = !force && (e.optBoolean("silent") || !Notifs.soundAllowed(c));
        if (audio && !quiet) {
            Intent i = new Intent(c, PlayerService.class).setAction(PlayerService.ACT_PLAY).putExtra("event", e.toString());
            try {
                c.startForegroundService(i);
                return;
            } catch (Exception ex) {
                // starting from the background was refused: fall back to a notification with a play button
            }
        }
        Notifs.simple(c, e, quiet, audio);
    }
}
