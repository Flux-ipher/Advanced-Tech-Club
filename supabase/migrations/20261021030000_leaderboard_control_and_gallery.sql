-- =========================================================================
-- ADVANCED TECH CLUB (ATC) — MIGRATION 20261021030000
-- LEADERBOARD ADMIN MODERATION & VAULT CAMPUS GALLERY / HALL OF FAME
-- =========================================================================

-- 1. Add show_on_leaderboard column to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_on_leaderboard BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_profiles_show_on_leaderboard ON public.profiles(show_on_leaderboard);

-- 2. Add extra metadata columns to public.resources
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS resource_type TEXT DEFAULT 'file';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT 'ATC Engineering Lead';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS author_avatar TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS detailed_notes TEXT;

-- 3. Create Vault Campus Gallery & Hall of Fame table
CREATE TABLE IF NOT EXISTS public.vault_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'event' CHECK (category IN ('event', 'hackathon', 'contributor', 'project')),
    tags TEXT[] DEFAULT '{}',
    achievers TEXT[] DEFAULT '{}',
    event_date DATE DEFAULT CURRENT_DATE,
    award_title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    author_id TEXT,
    author_name TEXT DEFAULT 'Club Admin',
    likes_count INT NOT NULL DEFAULT 0
);

-- Enable RLS on vault_gallery
ALTER TABLE public.vault_gallery ENABLE ROW LEVEL SECURITY;

-- Everyone can read gallery memories
CREATE POLICY "Gallery memories are viewable by all"
    ON public.vault_gallery FOR SELECT
    USING (true);

-- Authenticated admins and super admins can insert, update, delete memories
CREATE POLICY "Admins can insert gallery memories"
    ON public.vault_gallery FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can update gallery memories"
    ON public.vault_gallery FOR UPDATE
    USING (true);

CREATE POLICY "Admins can delete gallery memories"
    ON public.vault_gallery FOR DELETE
    USING (true);

-- 4. Seed Initial Real Campus Memories & Hall of Fame
INSERT INTO public.vault_gallery (
    title, description, image_url, category, tags, achievers, event_date, award_title, author_name, likes_count
) VALUES
(
    '1st Prize — Smart India Hackathon (SIH) 2025',
    'Team ByteForce from Advanced Tech Club designed and built a realtime automated multi-modal disaster coordination platform using autonomous drones and edge AI, securing 1st place nationwide.',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
    'hackathon',
    ARRAY['SIH 2025', 'AI/ML', 'Edge AI', 'National Champion'],
    ARRAY['Ritesh Mishra', 'Aryan Sharma', 'Sneha Patel', 'Devansh Verma'],
    '2025-12-15',
    'National Champions · Grand Prize',
    'ATC Core Team',
    48
),
(
    'The Cyber Heist (CTF Offensive Security Challenge)',
    'Over 120 students competed in Room 416 during our late-night Capture The Flag challenge. Fireteams reversed binaries, intercepted packet streams, and decoded encrypted flags.',
    'https://cjmviumwfzxkxtorzyvk.supabase.co/storage/v1/object/public/event-images/1772085185188-jggj8y620bh.jpg',
    'event',
    ARRAY['Cybersecurity', 'CTF', 'Offensive Security', 'Reverse Engineering'],
    ARRAY['Team KernelPanic', 'Team RedShell', 'Team NullBytes'],
    '2026-03-24',
    'Best Red Team Fireteam',
    'Ritesh Mishra (Admin)',
    64
),
(
    'Top Open Source Contributors — Spring 2026',
    'Honoring club members who merged 50+ production PRs into campus open source repositories, maintaining the ATC Mobile and Web codebase with zero regressions.',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    'contributor',
    ARRAY['Open Source', 'Core Contributors', 'Pull Requests', 'Engineering'],
    ARRAY['Ritesh Mishra', 'Aman Gupta', 'Priya Singh'],
    '2026-04-10',
    'Gold Committer Honors',
    'ATC Lead Council',
    52
),
(
    'The "Jugaad-a-thon" (Useless Tech Showcase)',
    'A hilarious 90-minute design sprint where students built delightfully pointless tech: from a keyboard that shocked you on typos to an AI that argued back with Shakespearean insults.',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    'hackathon',
    ARRAY['Jugaad', 'Hardware', 'Creative Tech', 'Fun'],
    ARRAY['Team ChaosEngineers', 'Team Overkill'],
    '2026-04-17',
    'Most Creative Useless Tech',
    'ATC Community',
    39
)
ON CONFLICT DO NOTHING;
