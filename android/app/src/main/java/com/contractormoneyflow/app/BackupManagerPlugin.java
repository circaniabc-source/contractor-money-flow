package com.contractormoneyflow.app;

import android.app.Activity;
import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "BackupManager", permissions = {
    @Permission(alias = "storage", strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE })
})
public class BackupManagerPlugin extends Plugin {

    @PluginMethod
    public void exportToDownloads(PluginCall call) {
        String fileName = call.getString("fileName");
        if (fileName == null || fileName.trim().isEmpty()) {
            fileName = "ContractorMoneyFlow_Backup_" + System.currentTimeMillis() + ".json";
        }

        String content = call.getString("content");
        if (content == null) {
            call.reject("Backup content cannot be null");
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("storage") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "onStoragePermissionResult");
            return;
        }
        writeBackup(call, fileName, content);
    }

    @PermissionCallback
    private void onStoragePermissionResult(PluginCall call) {
        if (call == null) return;
        if (getPermissionState("storage") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("Storage permission is required to save the backup in Downloads");
            return;
        }
        String fileName = call.getString("fileName");
        String content = call.getString("content");
        if (fileName == null || content == null) {
            call.reject("Backup details were missing");
            return;
        }
        writeBackup(call, fileName, content);
    }

    private void writeBackup(PluginCall call, String fileName, String content) {
        Uri createdUri = null;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = getContext().getContentResolver();
                ContentValues values = new ContentValues();
                values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                values.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
                values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                createdUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (createdUri == null) {
                    call.reject("Failed to create file entry in MediaStore Downloads");
                    return;
                }

                try (OutputStream os = resolver.openOutputStream(createdUri)) {
                    if (os == null) {
                        call.reject("Failed to open output stream for Downloads file");
                        return;
                    }
                    os.write(content.getBytes(StandardCharsets.UTF_8));
                    os.flush();
                }

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("fileName", fileName);
                ret.put("path", "Downloads/" + fileName);
                ret.put("uri", createdUri.toString());
                call.resolve(ret);
            } else {
                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!downloadsDir.exists()) {
                    downloadsDir.mkdirs();
                }
                File targetFile = new File(downloadsDir, fileName);
                try (FileOutputStream fos = new FileOutputStream(targetFile)) {
                    fos.write(content.getBytes(StandardCharsets.UTF_8));
                    fos.flush();
                }

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("fileName", fileName);
                ret.put("path", targetFile.getAbsolutePath());
                call.resolve(ret);
            }
        } catch (Exception e) {
            if (createdUri != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                try { getContext().getContentResolver().delete(createdUri, null, null); } catch (Exception ignored) { }
            }
            call.reject("Export to Downloads failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void pickAndRestoreBackup(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/json");
        String[] mimeTypes = new String[]{"application/json", "text/plain", "application/octet-stream"};
        intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);

        startActivityForResult(call, intent, "onFilePicked");
    }

    @ActivityCallback
    private void onFilePicked(PluginCall call, ActivityResult result) {
        if (call == null) return;

        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject ret = new JSObject();
            ret.put("cancelled", true);
            call.resolve(ret);
            return;
        }

        Uri uri = result.getData().getData();
        if (uri == null) {
            JSObject ret = new JSObject();
            ret.put("cancelled", true);
            call.resolve(ret);
            return;
        }

        try (InputStream in = getContext().getContentResolver().openInputStream(uri);
             BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("content", sb.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to read selected file: " + e.getMessage());
        }
    }
}
