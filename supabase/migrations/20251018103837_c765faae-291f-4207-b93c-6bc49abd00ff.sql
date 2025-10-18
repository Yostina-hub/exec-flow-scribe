-- Make meeting-audio bucket public for playback
UPDATE storage.buckets 
SET public = true 
WHERE id = 'meeting-audio';