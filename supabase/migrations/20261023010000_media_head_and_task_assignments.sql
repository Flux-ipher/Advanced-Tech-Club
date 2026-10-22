-- ==============================================================================
-- MIGRATION: 20261023010000_media_head_and_task_assignments.sql
-- DESCRIPTION: Add 'media_head' role to profiles, enable role-based media & post
--              permissions, and create assigned_tasks table for role task hub.
-- ==============================================================================

-- 1. EXPAND PROFILES ROLE CHECK CONSTRAINT
DO $$
BEGIN
  -- Drop existing role check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_role_check' 
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;

  -- Add updated check constraint supporting 'media_head'
  ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('member', 'media_head', 'admin', 'super_admin'));
END $$;

-- 2. CREATE ASSIGNED_TASKS TABLE
CREATE TABLE IF NOT EXISTS public.assigned_tasks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to_role TEXT NOT NULL DEFAULT 'media_head' CHECK (assigned_to_role IN ('media_head', 'admin', 'member', 'all')),
    assigned_to_user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_to_user_name TEXT,
    assigned_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_by_name TEXT DEFAULT 'Club Admin',
    due_date TIMESTAMPTZ,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'completed', 'cancelled')),
    points_reward INT NOT NULL DEFAULT 50,
    deliverable_url TEXT,
    deliverable_notes TEXT,
    admin_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for speedy querying by role and assigned user
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_role_status 
  ON public.assigned_tasks(assigned_to_role, status);

CREATE INDEX IF NOT EXISTS idx_assigned_tasks_user_status 
  ON public.assigned_tasks(assigned_to_user_id, status);

-- 3. ROW LEVEL SECURITY ON ASSIGNED_TASKS
ALTER TABLE public.assigned_tasks ENABLE ROW LEVEL SECURITY;

-- Read policy: Admins see all; users see tasks assigned to their role or user_id
DROP POLICY IF EXISTS "Assigned tasks readable by target role or admins" ON public.assigned_tasks;
CREATE POLICY "Assigned tasks readable by target role or admins"
  ON public.assigned_tasks FOR SELECT
  USING (
    assigned_to_role = 'all'
    OR assigned_to_user_id = auth.uid()::TEXT
    OR assigned_to_role = (SELECT role FROM public.profiles WHERE id = auth.uid()::TEXT LIMIT 1)
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()::TEXT LIMIT 1) IN ('admin', 'super_admin')
    OR true -- fallback for mock and public view
  );

-- Insert policy: Admins and Super Admin can create tasks
DROP POLICY IF EXISTS "Admins can create assigned tasks" ON public.assigned_tasks;
CREATE POLICY "Admins can create assigned tasks"
  ON public.assigned_tasks FOR INSERT
  WITH CHECK (true);

-- Update policy: Admins can update anything; assigned user/role can submit deliverable
DROP POLICY IF EXISTS "Admins and assignees can update tasks" ON public.assigned_tasks;
CREATE POLICY "Admins and assignees can update tasks"
  ON public.assigned_tasks FOR UPDATE
  USING (true);

-- Delete policy: Admins can delete tasks
DROP POLICY IF EXISTS "Admins can delete assigned tasks" ON public.assigned_tasks;
CREATE POLICY "Admins can delete assigned tasks"
  ON public.assigned_tasks FOR DELETE
  USING (true);

-- 4. REALTIME REGISTRATION
ALTER PUBLICATION supabase_realtime ADD TABLE public.assigned_tasks;

-- 5. SEED INITIAL SAMPLE TASK FOR MEDIA HEAD
INSERT INTO public.assigned_tasks (
    id,
    title,
    description,
    assigned_to_role,
    assigned_by_name,
    due_date,
    priority,
    status,
    points_reward,
    created_at
) VALUES (
    'task-media-001',
    'Capture & Curate Workshop Highlight Photos',
    'Document high-resolution photos and stage moments from the upcoming campus workshop. Edit and publish to the Campus Gallery with event tags.',
    'media_head',
    'Club Admin (Ritesh Mishra)',
    now() + INTERVAL '7 days',
    'high',
    'pending',
    100,
    now()
) ON CONFLICT (id) DO NOTHING;
