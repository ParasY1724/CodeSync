-- Create rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create room_participants table
CREATE TABLE public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Rooms policies
CREATE POLICY "Anyone authenticated can view rooms"
ON public.rooms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anyone authenticated can create rooms"
ON public.rooms FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creator can delete room"
ON public.rooms FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Room participants policies
CREATE POLICY "Participants can view room participants"
ON public.room_participants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can join rooms"
ON public.room_participants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
ON public.room_participants FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms"
ON public.room_participants FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Participants can view messages"
ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.room_participants rp 
    WHERE rp.room_id = messages.room_id AND rp.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.room_participants rp 
    WHERE rp.room_id = messages.room_id AND rp.user_id = auth.uid()
  )
);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;

-- Timestamp trigger for rooms
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();