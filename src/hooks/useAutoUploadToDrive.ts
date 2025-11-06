import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to automatically upload generated documents to Google Drive or TeleDrive
 * Watches for new meeting_drive_files entries and ensures they're synced
 */
export const useAutoUploadToDrive = () => {
  const { toast } = useToast();

  useEffect(() => {
    const checkDriveSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("drive_sync_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      return data;
    };

    const uploadToGoogleDrive = async (fileId: string, fileName: string, meetingId: string) => {
      try {
        // Get the file from meeting_drive_files
        const { data: fileRecord } = await supabase
          .from("meeting_drive_files")
          .select("drive_file_url, mime_type")
          .eq("id", fileId)
          .single();

        if (!fileRecord?.drive_file_url) return;

        // Download the file content
        const response = await fetch(fileRecord.drive_file_url);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        // Upload to Google Drive
        const { data, error } = await supabase.functions.invoke("google-drive-upload", {
          body: {
            fileName,
            fileContent: base64,
            mimeType: fileRecord.mime_type,
            meetingId,
          },
        });

        if (error) throw error;

        toast({
          title: "Auto-uploaded to Google Drive",
          description: `${fileName} has been backed up to your Drive`,
        });
      } catch (error) {
        console.error("Auto-upload failed:", error);
      }
    };

    // Set up realtime subscription for new meeting files
    const channel = supabase
      .channel("auto-upload-drive")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meeting_drive_files",
          filter: "auto_generated=eq.true",
        },
        async (payload) => {
          const settings = await checkDriveSettings();
          
          if (settings?.auto_backup_enabled || settings?.auto_upload_recordings) {
            const newFile = payload.new as any;
            
            // Check if this file type should be auto-uploaded
            const shouldUpload = 
              (newFile.file_category === "minutes" && settings.auto_save_minutes_as_docs) ||
              (newFile.file_category === "recording" && settings.auto_upload_recordings);

            if (shouldUpload && settings.google_drive_enabled) {
              await uploadToGoogleDrive(
                newFile.id,
                newFile.drive_file_name,
                newFile.meeting_id
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);
};
