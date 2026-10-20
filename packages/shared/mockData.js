// Initial mock data and seeds for demo mode & local testing

export const initialProfiles = [
  {
    id: 'user-ritesh-superadmin',
    full_name: 'Ritesh Mishra',
    email: 'fluxipher@gmail.com',
    role: 'super_admin',
    department: 'Computer Science & Engineering',
    student_id: 'ADMIN-001',
    roll_number: 'ADMIN-001',
    branch: 'CSE',
    year: '2nd Year',
    why_join: 'Co-founding and engineering platforms for Advanced Tech Club.',
    onboarding_complete: true,
    bio: 'Software engineer and builder at Advanced Tech Club.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    push_token: 'ExponentPushToken[mock-ritesh-token]',
    is_verified: true,
    verification_status: 'verified',
    created_at: '2026-08-01T10:00:00Z'
  }
];

export const initialAnnouncements = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    title: '👋 Welcome to the Advanced Tech Club Platform',
    body: 'Welcome to the official Advanced Tech Club portal and mobile application! Access upcoming workshops, technical hackathons, open-source resources, and verify your event attendance with digital campus passes. Earn XP through contributions and GitHub PRs.',
    category: 'general',
    pinned: true,
    author_id: 'Zp2JThOUCAbl7aF1TT4DQHUH0Dk2',
    author_name: 'Ritesh Mishra',
    author_role: 'Admin',
    author_avatar: 'https://lh3.googleusercontent.com/a/ACg8ocKjbs6-ZocAWk3Qo5-TiXz_EQDbbYVftpiPOSXMPA2dIKx3Ffc=s96-c',
    media_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    created_at: '2026-10-20T00:00:00Z'
  }
];

export const initialEvents = [
  {
    id: '3d6d2d58-ef35-4f1e-8027-88a6f0e51399',
    slug: 'the-cyber-heist',
    title: 'The Cyber Heist (CTF Event)',
    description: 'An immersive, team-based Capture The Flag (CTF) cybersecurity event. Form your fireteam, breach the target network, and decrypt the override codes before time runs out.',
    date: '2026-03-24T16:30:00Z',
    start_at: '2026-03-24T16:30:00Z',
    end_at: '2026-03-24T19:30:00Z',
    location: 'Room 416, Academic Block',
    capacity: 120,
    category: 'hackathon',
    banner_url: 'https://cjmviumwfzxkxtorzyvk.supabase.co/storage/v1/object/public/event-images/1772085185188-jggj8y620bh.jpg',
    image: 'https://cjmviumwfzxkxtorzyvk.supabase.co/storage/v1/object/public/event-images/1772085185188-jggj8y620bh.jpg',
    tags: ['Competetion', 'CyberAttack'],
    registration_link: 'https://forms.gle/ZH4oZNjgLxkxYfoq6',
    feedback_link: 'https://forms.gle/nPAHQDSWGvnTUSBg9',
    author_id: 'Zp2JThOUCAbl7aF1TT4DQHUH0Dk2',
    author_name: 'Ritesh Mishra',
    registrations_count: 0,
    created_at: '2026-02-26T04:57:08.162Z'
  },
  {
    id: '7f4edf24-6236-417c-a545-6131576e33f5',
    slug: 'jugaad-a-thon-the-useless-tech-hackathon',
    title: 'The "Jugaad-a-thon" (The Useless Tech Hackathon)',
    description: 'The "Jugaad-a-thon" is a 1.5-hour, stress-free hackathon where the primary objective is to build the most functionally useless, inconvenient, or hilariously pointless technology possible. Eliminates performance anxiety, encourages risk-taking, and builds full-stack skills.',
    date: '2026-04-17T16:20:00Z',
    start_at: '2026-04-17T16:20:00Z',
    end_at: '2026-04-17T18:00:00Z',
    location: 'Room 416, Academic Block',
    capacity: 80,
    category: 'hackathon',
    banner_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    tags: ['Hackathon'],
    registration_link: 'https://forms.gle/fk7mRNvaNdfHbBZd9',
    feedback_link: 'https://forms.gle/fki7hA555XPDzyL28',
    author_id: 'Zp2JThOUCAbl7aF1TT4DQHUH0Dk2',
    author_name: 'Ritesh Mishra',
    registrations_count: 0,
    created_at: '2026-04-10T07:22:45.654Z'
  }
];

export const initialRegistrations = [];

export const initialResources = [
  {
    id: '359b698b-12b0-4943-8317-44b235e5622d',
    title: 'Metaflow (Netflix AI/ML Framework)',
    description: 'Metaflow is a human-centric framework designed to help scientists and engineers build and manage real-life AI and ML systems. Serving teams of all sizes and scales, Metaflow streamlines the entire development lifecycle.',
    file_url: 'https://metaflow.org/',
    url: 'https://metaflow.org/',
    file_size: 'Web App',
    category: 'Tools',
    tags: ['Build', 'Manage', 'Deploy AI/Ml Systems'],
    author_id: 'Zp2JThOUCAbl7aF1TT4DQHUH0Dk2',
    author_name: 'Ritesh Mishra',
    download_count: 42,
    created_at: '2026-04-11T02:02:15.367Z'
  },
  {
    id: '58dbee59-5fe9-4a7d-8281-0b70012a4cd5',
    title: 'The Open Source AI Engineering Platform for Agents, LLMs & Models',
    description: 'MLflow is the largest open source AI engineering platform for agents, LLMs, and ML models. Enables teams of all sizes to debug, evaluate, monitor, and optimize production-quality AI applications.',
    file_url: 'https://mlflow.org/',
    url: 'https://mlflow.org/',
    file_size: 'Web Platform',
    category: 'Code Samples',
    tags: ['LLMs', 'Ai Agents'],
    author_id: 'Zp2JThOUCAbl7aF1TT4DQHUH0Dk2',
    author_name: 'Ritesh Mishra',
    download_count: 67,
    created_at: '2026-04-11T01:59:13.469Z'
  },
  {
    id: '5ea69654-49cc-445e-bc38-7d6d931bb399',
    title: 'Feast (Feature Store for Machine Learning)',
    description: 'Feast is an open source feature store for machine learning. Feast is the fastest path to manage existing infrastructure to productionize analytic data for model training and online inference.',
    file_url: 'https://feast.dev/',
    url: 'https://feast.dev/',
    file_size: 'Documentation',
    category: 'Documentation',
    tags: ['Machine Learning'],
    author_id: 'Zp2JThOUCAbl7aF1TT4DQHUH0Dk2',
    author_name: 'Ritesh Mishra',
    download_count: 38,
    created_at: '2026-04-11T02:04:37.602Z'
  }
];

export const initialNotifications = [
  {
    id: 'notif-1',
    user_id: 'user-ritesh-superadmin',
    title: 'Registration Confirmed',
    message: 'You are registered for ATC Annual Hackathon 2026.',
    type: 'event',
    link_url: '/events/evt-1',
    read: false,
    created_at: '2026-10-18T10:00:00Z'
  },
  {
    id: 'notif-2',
    user_id: 'user-ritesh-superadmin',
    title: 'New Announcement Posted',
    message: 'React Native + Supabase Monorepo Masterclass this Friday.',
    type: 'announcement',
    link_url: '/',
    read: true,
    created_at: '2026-10-17T09:30:00Z'
  },
  {
    id: 'notif-3',
    user_id: 'user-ritesh-superadmin',
    title: 'Welcome to Advanced Tech Club',
    message: 'Your account is active. Explore announcements, register for workshops, and download resources.',
    type: 'system',
    link_url: '/',
    read: true,
    created_at: '2026-10-15T08:00:00Z'
  }
];

// =========================================================================
// GAMIFICATION & QR SEED DATA
// =========================================================================

export const initialBadges = [
  {
    id: 'badge-1',
    name: 'First Step',
    description: 'Attended your first club workshop or hackathon',
    icon_url: '🏁',
    points_required: 50,
    trigger: 'checkin_count',
    threshold: 1
  },
  {
    id: 'badge-2',
    name: 'Regular',
    description: 'Attended 5 club events or technical deep-dives',
    icon_url: '📅',
    points_required: 250,
    trigger: 'checkin_count',
    threshold: 5
  },
  {
    id: 'badge-3',
    name: 'Dedicated',
    description: 'Attended 10 campus engineering events',
    icon_url: '⭐',
    points_required: 500,
    trigger: 'checkin_count',
    threshold: 10
  },
  {
    id: 'badge-4',
    name: 'Centurion',
    description: 'Earned 100 points across platform activities',
    icon_url: '💯',
    points_required: 100,
    trigger: 'points_threshold',
    threshold: 100
  },
  {
    id: 'badge-5',
    name: 'Rising Star',
    description: 'Earned 300 points in campus workshops & challenges',
    icon_url: '🚀',
    points_required: 300,
    trigger: 'points_threshold',
    threshold: 300
  },
  {
    id: 'badge-6',
    name: 'Club Legend',
    description: 'Achieved 1,000 engineering contribution points',
    icon_url: '🏆',
    points_required: 1000,
    trigger: 'points_threshold',
    threshold: 1000
  },
  {
    id: 'badge-7',
    name: 'Resource Hunter',
    description: 'Downloaded 10 curriculum guides from the Vault',
    icon_url: '📚',
    points_required: 50,
    trigger: 'resource_download',
    threshold: 10
  },
  {
    id: 'badge-8',
    name: 'On Fire',
    description: 'Maintained a 3-event consecutive check-in streak',
    icon_url: '🔥',
    points_required: 150,
    trigger: 'streak',
    threshold: 3
  },
  {
    id: 'badge-9',
    name: 'Unstoppable',
    description: 'Maintained a 5-event consecutive check-in streak',
    icon_url: '⚡',
    points_required: 250,
    trigger: 'streak',
    threshold: 5
  },
  {
    id: 'badge-10',
    name: 'Admin Contributor',
    description: 'Awarded to core student coordinators and builders',
    icon_url: '🛠️',
    points_required: 0,
    trigger: 'manual',
    threshold: 0
  }
];

export const initialMemberPoints = [
  {
    user_id: 'user-ritesh-superadmin',
    total_points: 1250,
    checkin_streak: 12,
    last_checkin_date: '2026-10-18',
    updated_at: '2026-10-18T12:00:00Z'
  }
];

export const initialMemberBadges = [
  { user_id: 'user-ritesh-superadmin', badge_id: 'badge-1', earned_at: '2026-08-10T10:00:00Z' },
  { user_id: 'user-ritesh-superadmin', badge_id: 'badge-2', earned_at: '2026-08-15T10:00:00Z' },
  { user_id: 'user-ritesh-superadmin', badge_id: 'badge-3', earned_at: '2026-08-20T10:00:00Z' },
  { user_id: 'user-ritesh-superadmin', badge_id: 'badge-4', earned_at: '2026-08-25T10:00:00Z' },
  { user_id: 'user-ritesh-superadmin', badge_id: 'badge-5', earned_at: '2026-09-01T10:00:00Z' },
  { user_id: 'user-ritesh-superadmin', badge_id: 'badge-6', earned_at: '2026-09-10T10:00:00Z' },
  { user_id: 'user-ritesh-superadmin', badge_id: 'badge-7', earned_at: '2026-09-15T10:00:00Z' },
  { user_id: 'user-ritesh-superadmin', badge_id: 'badge-8', earned_at: '2026-09-20T10:00:00Z' },
  { user_id: 'user-ritesh-superadmin', badge_id: 'badge-9', earned_at: '2026-09-25T10:00:00Z' },
  { user_id: 'user-ritesh-superadmin', badge_id: 'badge-10', earned_at: '2026-08-01T10:00:00Z' }
];

export const initialPointsLog = [
  { id: 'log-1', user_id: 'user-ritesh-superadmin', points: 50, reason: 'event_checkin', reference_id: 'evt-1', awarded_at: '2026-10-18T10:00:00Z' },
  { id: 'log-2', user_id: 'user-ritesh-superadmin', points: 30, reason: 'event_created', reference_id: 'evt-1', awarded_at: '2026-10-15T10:00:00Z' },
  { id: 'log-3', user_id: 'user-ritesh-superadmin', points: 20, reason: 'announcement_posted', reference_id: 'ann-1', awarded_at: '2026-10-18T14:00:00Z' }
];

