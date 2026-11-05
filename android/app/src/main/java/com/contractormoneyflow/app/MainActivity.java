package com.contractormoneyflow.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackupManagerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

