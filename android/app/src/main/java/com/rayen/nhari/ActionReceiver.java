package com.rayen.nhari;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Buttons of the "starting soon" notification: postpone or skip. */
public class ActionReceiver extends BroadcastReceiver {
    static final String ACT_POSTPONE = "com.rayen.nhari.POSTPONE";
    static final String ACT_SKIP = "com.rayen.nhari.SKIP";

    @Override
    public void onReceive(Context c, Intent intent) {
        String id = intent.getStringExtra("id");
        int nid = intent.getIntExtra("nid", 0);
        if (nid != 0) c.getSystemService(NotificationManager.class).cancel(nid);
        if (id == null) return;
        if (ACT_POSTPONE.equals(intent.getAction())) {
            int min = intent.getIntExtra("min", 30);
            long at = System.currentTimeMillis() + min * 60_000L;
            EventStore.postpone(c, id, at);
            Scheduler.scheduleNext(c);
            Notifs.info(c, "تأجّل", "يبدا على " + new SimpleDateFormat("HH:mm", Locale.US).format(new Date(at)));
        } else if (ACT_SKIP.equals(intent.getAction())) {
            EventStore.skip(c, id);
            Scheduler.scheduleNext(c);
        }
    }
}
