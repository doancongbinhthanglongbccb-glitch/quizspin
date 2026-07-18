package com.quizspin.app;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "BackupSaver")
public class BackupSaverPlugin extends Plugin {

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        String filename = call.getString("filename");
        String content = call.getString("content");

        if (filename == null || filename.isEmpty() || content == null) {
            call.reject("Thiếu filename hoặc content");
            return;
        }

        filename = new File(filename).getName();
        if (!filename.toLowerCase().endsWith(".json")) {
            filename = filename + ".json";
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                values.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                values.put(MediaStore.Downloads.IS_PENDING, 1);

                Uri uri = getContext()
                    .getContentResolver()
                    .insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);

                if (uri == null) {
                    call.reject("Không tạo được file trong Downloads");
                    return;
                }

                try (OutputStream out = getContext().getContentResolver().openOutputStream(uri)) {
                    if (out == null) {
                        call.reject("Không ghi được file trong Downloads");
                        return;
                    }
                    out.write(content.getBytes(StandardCharsets.UTF_8));
                }

                values.clear();
                values.put(MediaStore.Downloads.IS_PENDING, 0);
                getContext().getContentResolver().update(uri, values, null, null);

                JSObject result = new JSObject();
                result.put("path", "Download/" + filename);
                result.put("uri", uri.toString());
                call.resolve(result);
                return;
            }

            File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            if (!dir.exists() && !dir.mkdirs()) {
                call.reject("Không mở được thư mục Downloads");
                return;
            }

            File file = new File(dir, filename);
            try (FileOutputStream out = new FileOutputStream(file)) {
                out.write(content.getBytes(StandardCharsets.UTF_8));
            }

            JSObject result = new JSObject();
            result.put("path", file.getAbsolutePath());
            call.resolve(result);
        } catch (Exception error) {
            call.reject("Lưu Downloads thất bại: " + error.getMessage(), error);
        }
    }
}
