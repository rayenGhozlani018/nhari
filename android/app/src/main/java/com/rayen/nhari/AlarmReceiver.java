package com.rayen.nhari;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** The exact alarm rang: run the due events and arm the next one. */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Scheduler.onAlarm(context);
    }
}
