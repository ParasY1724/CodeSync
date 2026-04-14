-- Enable full replica identity for files table to capture complete row data on DELETE
ALTER TABLE public.files REPLICA IDENTITY FULL;