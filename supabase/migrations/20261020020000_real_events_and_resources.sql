-- =========================================================================
-- ADVANCED TECH CLUB (ATC) — MIGRATION 20261020020000
-- REAL EVENTS AND RESOURCES INGESTION FROM CLUB ARCHIVES
-- =========================================================================

-- 1. Ensure events table supports legacy and new columns
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS registration_link TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS feedback_link TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;

-- 2. Ensure resources table supports legacy and new columns
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS url TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS event_slug TEXT;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS created_by TEXT;

-- 3. Ingest Real Club Events (Cyber Heist CTF, Jugaad-a-thon)
INSERT INTO public.events (
  id, title, description, banner_url, start_at, end_at, location, capacity, category, author_id
) VALUES
(
  '3d6d2d58-ef35-4f1e-8027-88a6f0e51399',
  'The Cyber Heist (CTF Event)',
  'An immersive, team-based Capture The Flag (CTF) cybersecurity event. Form your fireteam, breach the target network, and decrypt the override codes before time runs out.',
  'https://cjmviumwfzxkxtorzyvk.supabase.co/storage/v1/object/public/event-images/1772085185188-jggj8y620bh.jpg',
  '2026-03-24 16:30:00+00',
  '2026-03-24 19:30:00+00',
  'Room 416, Academic Block',
  120,
  'hackathon',
  'Zp2JThOUCAbl7aF1TT4DQHUH0Dk2'
),
(
  '7f4edf24-6236-417c-a545-6131576e33f5',
  'The "Jugaad-a-thon" (The Useless Tech Hackathon)',
  'The "Jugaad-a-thon" is a 1.5-hour, stress-free hackathon where the primary objective is to build the most functionally useless, inconvenient, or hilariously pointless technology possible.',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
  '2026-04-17 16:20:00+00',
  '2026-04-17 18:00:00+00',
  'Room 416, Academic Block',
  80,
  'hackathon',
  'Zp2JThOUCAbl7aF1TT4DQHUH0Dk2'
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  banner_url = EXCLUDED.banner_url,
  start_at = EXCLUDED.start_at,
  location = EXCLUDED.location;

-- 4. Ingest Real Club Resources (Metaflow, MLflow, Feast)
INSERT INTO public.resources (
  id, title, description, file_url, file_size, category, author_id, download_count
) VALUES
(
  '359b698b-12b0-4943-8317-44b235e5622d',
  'Metaflow (Netflix AI/ML Framework)',
  'Metaflow is a human-centric framework designed to help scientists and engineers build and manage real-life AI and ML systems. Serving teams of all sizes and scales, Metaflow streamlines the entire development lifecycle.',
  'https://metaflow.org/',
  'Web App',
  'Tools',
  'Zp2JThOUCAbl7aF1TT4DQHUH0Dk2',
  42
),
(
  '58dbee59-5fe9-4a7d-8281-0b70012a4cd5',
  'The Open Source AI Engineering Platform for Agents, LLMs & Models',
  'MLflow is the largest open source AI engineering platform for agents, LLMs, and ML models. Enables teams of all sizes to debug, evaluate, monitor, and optimize production-quality AI applications.',
  'https://mlflow.org/',
  'Web Platform',
  'Code Samples',
  'Zp2JThOUCAbl7aF1TT4DQHUH0Dk2',
  67
),
(
  '5ea69654-49cc-445e-bc38-7d6d931bb399',
  'Feast (Feature Store for Machine Learning)',
  'Feast is an open source feature store for machine learning. Feast is the fastest path to manage existing infrastructure to productionize analytic data for model training and online inference.',
  'https://feast.dev/',
  'Documentation',
  'Documentation',
  'Zp2JThOUCAbl7aF1TT4DQHUH0Dk2',
  38
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  file_url = EXCLUDED.file_url,
  category = EXCLUDED.category;
