-- Create files table for room file persistence
CREATE TABLE public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  extension TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(room_id, path)
);

-- Create folders table for room folder structure
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  parent_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(room_id, path)
);

-- Enable RLS
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Files policies
CREATE POLICY "Participants can view files"
  ON public.files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = files.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can create files"
  ON public.files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = files.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update files"
  ON public.files
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = files.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can delete files"
  ON public.files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = files.room_id AND rp.user_id = auth.uid()
    )
  );

-- Folders policies
CREATE POLICY "Participants can view folders"
  ON public.folders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = folders.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can create folders"
  ON public.folders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = folders.room_id AND rp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can delete folders"
  ON public.folders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM room_participants rp
      WHERE rp.room_id = folders.room_id AND rp.user_id = auth.uid()
    )
  );

-- Enable realtime for files
ALTER PUBLICATION supabase_realtime ADD TABLE public.files;

-- Create trigger for updated_at on files
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();