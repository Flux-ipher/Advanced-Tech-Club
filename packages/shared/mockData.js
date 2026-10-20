// Initial mock data and seeds for demo mode & local testing

export const initialProfiles = [
  {
    id: 'user-ritesh-superadmin',
    full_name: 'Ritesh Mishra',
    email: 'ritesh@techclub.edu',
    role: 'super_admin',
    department: 'Computer Science & Engineering',
    student_id: 'CS2023-001',
    roll_number: 'CS2023-001',
    branch: 'CSE',
    year: '2nd Year',
    why_join: 'Co-founding and engineering platforms for Advanced Tech Club.',
    onboarding_complete: true,
    bio: 'Vice President of Advanced Tech Club. Student software engineer and builder.',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    push_token: 'ExponentPushToken[mock-ritesh-token]',
    is_verified: true,
    verification_status: 'verified',
    created_at: '2026-08-01T10:00:00Z'
  },
  {
    id: 'user-sarah-member',
    full_name: 'Sarah Chen',
    email: 'sarah@techclub.edu',
    role: 'member',
    department: 'Software Engineering',
    student_id: 'SE2024-042',
    roll_number: 'SE2024-042',
    branch: 'IT',
    year: '3rd Year',
    why_join: 'Deepen knowledge in distributed systems and cloud architecture.',
    onboarding_complete: true,
    bio: 'Software Engineering student. Passionate about distributed systems, Rust, and React Native.',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
    push_token: 'ExponentPushToken[mock-sarah-token]',
    is_verified: true,
    verification_status: 'verified',
    created_at: '2026-08-15T11:30:00Z'
  },
  {
    id: 'user-alex-member',
    full_name: 'Alex Rivera',
    email: 'alex@techclub.edu',
    role: 'member',
    department: 'Data Science & AI',
    student_id: 'DS2024-118',
    roll_number: 'DS2024-118',
    branch: 'CSE',
    year: '3rd Year',
    why_join: 'Collaborate with fellow campus developers on production AI apps.',
    onboarding_complete: true,
    bio: 'Data Science & AI student. Organizing campus developer meetups and workshops.',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    push_token: 'ExponentPushToken[mock-alex-token]',
    is_verified: true,
    verification_status: 'verified',
    created_at: '2026-09-01T09:15:00Z'
  },
  {
    id: 'user-priya-member',
    full_name: 'Priya Patel',
    email: 'priya@techclub.edu',
    role: 'member',
    department: 'Computer Science & Engineering',
    student_id: 'CS2025-204',
    roll_number: 'CS2025-204',
    branch: 'CSE',
    year: '2nd Year',
    why_join: 'Master mobile app engineering and full-stack cloud deployments.',
    onboarding_complete: true,
    bio: 'Junior Developer exploring Mobile Development and UI/UX design.',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    push_token: 'ExponentPushToken[mock-priya-token]',
    is_verified: true,
    verification_status: 'verified',
    created_at: '2026-09-10T14:20:00Z'
  },
  {
    id: 'user-jordan-member',
    full_name: 'Jordan Lee',
    email: 'jordan@techclub.edu',
    role: 'member',
    department: 'Information Technology',
    student_id: 'IT2025-089',
    roll_number: 'IT2025-089',
    branch: 'IT',
    year: '2nd Year',
    why_join: 'Contribute to club open-source repos and learn DevOps CI/CD.',
    onboarding_complete: true,
    bio: 'Interested in Cloud computing, DevOps pipelines, and open-source contributions.',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    push_token: 'ExponentPushToken[mock-jordan-token]',
    is_verified: true,
    verification_status: 'verified',
    created_at: '2026-09-12T16:45:00Z'
  },
  {
    id: 'user-tyler-pending',
    full_name: 'Tyler Smith',
    email: 'tyler.smith@techclub.edu',
    role: 'member',
    department: 'Electrical & Computer Engineering',
    student_id: 'ECE2026-077',
    roll_number: 'ECE2026-077',
    branch: 'ECE',
    year: '1st Year',
    why_join: 'Freshman eager to build IoT and robotics projects.',
    onboarding_complete: false,
    bio: 'Freshman student enthusiastic about robotics and embedded systems. Eager to join ATC!',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
    push_token: 'ExponentPushToken[mock-tyler-token]',
    is_verified: false,
    verification_status: 'pending',
    applied_at: '2026-10-18T18:00:00Z',
    created_at: '2026-10-18T18:00:00Z'
  }
];

export const initialAnnouncements = [
  {
    id: 'ann-1',
    title: '🚀 ATC Annual Hackathon 2026 Announced: $5,000 in Prizes!',
    body: 'Registration is now officially open for our flagship hackathon of the semester. 36 hours of non-stop building, mentoring from industry engineers, free food, and exclusive swag. Form teams of 2 to 4 members. Check out the Events tab for registration details and rulebooks.',
    category: 'hackathon',
    pinned: true,
    author_id: 'user-ritesh-superadmin',
    author_name: 'Ritesh Mishra',
    author_role: 'Admin',
    author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    media_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    created_at: '2026-10-18T14:00:00Z'
  },
  {
    id: 'ann-2',
    title: '⚡ React Native + Supabase Monorepo Masterclass this Friday',
    body: 'Join us in Innovation Lab Room 304 for a hands-on coding sprint where we build a cross-platform mobile app connected to a live Postgres database with Realtime subscriptions and Auth. Bring your laptops with Node.js and Expo installed!',
    category: 'workshop',
    pinned: false,
    author_id: 'user-ritesh-superadmin',
    author_name: 'Ritesh Mishra',
    author_role: 'Admin',
    author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    media_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    created_at: '2026-10-17T09:30:00Z'
  },
  {
    id: 'ann-3',
    title: '📦 New Open Source Learning Resources Added to Library',
    body: 'We have updated our Resources directory with the latest slide decks, system design blueprints, and production-ready React starter boilerplates. All files are downloadable directly from the Resources section.',
    category: 'opportunity',
    pinned: false,
    author_id: 'user-ritesh-superadmin',
    author_name: 'Ritesh Mishra',
    author_role: 'Admin',
    author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    media_url: null,
    created_at: '2026-10-16T16:15:00Z'
  }
];

export const initialEvents = [
  {
    id: 'evt-1',
    title: 'ATC Annual Hackathon 2026: Build with AI',
    description: '36-hour sprint where student teams build real-world AI applications, mobile tools, and autonomous web platforms. Includes meals, cloud credits, and judging by alumni founders.',
    start_at: '2026-11-06T18:00:00Z',
    end_at: '2026-11-08T12:00:00Z',
    location: 'Student Innovation Center · Main Hall',
    capacity: 150,
    category: 'hackathon',
    banner_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    author_id: 'user-ritesh-superadmin',
    author_name: 'Ritesh Mishra',
    registrations_count: 84,
    created_at: '2026-10-15T10:00:00Z'
  },
  {
    id: 'evt-2',
    title: 'Cross-Platform React Native & Expo Deep Dive',
    description: 'Learn how to architect single codebase React + React Native apps, compile standalone APKs, handle native device permissions, and wire real-time WebSockets.',
    start_at: '2026-10-23T17:30:00Z',
    end_at: '2026-10-23T20:00:00Z',
    location: 'Turing Auditorium · Room 302',
    capacity: 75,
    category: 'workshop',
    banner_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
    author_id: 'user-ritesh-superadmin',
    author_name: 'Ritesh Mishra',
    registrations_count: 52,
    created_at: '2026-10-16T12:00:00Z'
  },
  {
    id: 'evt-3',
    title: 'System Design: Scalable Architecture from 10k to 10M Users',
    description: 'Interactive case studies on database sharding, caching tiers (Redis), asynchronous queues (RabbitMQ/Kafka), and global CDN routing.',
    start_at: '2026-10-30T18:00:00Z',
    end_at: '2026-10-30T20:30:00Z',
    location: 'Engineering Tower · Room 410 & Virtual Zoom',
    capacity: 100,
    category: 'technical',
    banner_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    author_id: 'user-ritesh-superadmin',
    author_name: 'Ritesh Mishra',
    registrations_count: 67,
    created_at: '2026-10-17T15:00:00Z'
  },
  {
    id: 'evt-4',
    title: 'ATC Fall Mixer & Project Pitch Night',
    description: 'Social networking evening for members to pitch ideas, find project teammates, demo side projects, and connect with club leads.',
    start_at: '2026-11-14T19:00:00Z',
    end_at: '2026-11-14T21:30:00Z',
    location: 'Student Union Lounge · Terrace',
    capacity: 120,
    category: 'social',
    banner_url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
    author_id: 'user-ritesh-superadmin',
    author_name: 'Ritesh Mishra',
    registrations_count: 39,
    created_at: '2026-10-18T10:00:00Z'
  }
];

export const initialRegistrations = [
  { event_id: 'evt-1', user_id: 'user-ritesh-superadmin', registered_at: '2026-10-15T10:05:00Z', status: 'confirmed' },
  { event_id: 'evt-1', user_id: 'user-sarah-member', registered_at: '2026-10-15T10:10:00Z', status: 'confirmed' },
  { event_id: 'evt-1', user_id: 'user-priya-member', registered_at: '2026-10-15T11:00:00Z', status: 'confirmed' },
  { event_id: 'evt-2', user_id: 'user-priya-member', registered_at: '2026-10-16T13:00:00Z', status: 'confirmed' },
  { event_id: 'evt-2', user_id: 'user-jordan-member', registered_at: '2026-10-16T14:30:00Z', status: 'confirmed' },
  { event_id: 'evt-3', user_id: 'user-ritesh-superadmin', registered_at: '2026-10-17T16:00:00Z', status: 'confirmed' }
];

export const initialResources = [
  {
    id: 'res-1',
    title: 'React Native & Expo Architecture Slide Deck',
    description: 'Complete lecture slides detailing the monorepo structure, NativeWind setup, and APK build process with EAS.',
    file_url: 'https://github.com/advanced-tech-club/resources/raw/main/react-native-expo-deck.pdf',
    file_size: '14.2 MB',
    category: 'Slides',
    author_id: 'user-ritesh-superadmin',
    author_name: 'Ritesh Mishra',
    download_count: 148,
    created_at: '2026-10-12T10:00:00Z'
  },
  {
    id: 'res-2',
    title: 'High-Throughput System Design Cheat Sheet',
    description: 'Condensed quick-reference guide covering SQL vs NoSQL, CAP theorem, cache eviction policies, and load balancing algorithms.',
    file_url: 'https://github.com/advanced-tech-club/resources/raw/main/system-design-cheatsheet.pdf',
    file_size: '4.8 MB',
    category: 'Cheat Sheets',
    author_id: 'user-ritesh-superadmin',
    author_name: 'Ritesh Mishra',
    download_count: 312,
    created_at: '2026-10-14T11:20:00Z'
  },
  {
    id: 'res-3',
    title: 'ATC Full-Stack Starter Template (React + Supabase)',
    description: 'Clean repository template pre-configured with auth, RLS policies, Tailwind CSS, and Zustand stores.',
    file_url: 'https://github.com/advanced-tech-club/starter-template.zip',
    file_size: '2.4 MB',
    category: 'Code Samples',
    author_id: 'user-ritesh-superadmin',
    author_name: 'Ritesh Mishra',
    download_count: 220,
    created_at: '2026-10-15T09:00:00Z'
  },
  {
    id: 'res-4',
    title: 'Campus Developer Career & Internship Roadmap 2026',
    description: 'Step-by-step roadmap for software engineering interviews, open source contributions, and building stand-out portfolios.',
    file_url: 'https://github.com/advanced-tech-club/resources/raw/main/career-roadmap.pdf',
    file_size: '6.1 MB',
    category: 'Roadmaps',
    author_id: 'user-ritesh-superadmin',
    author_name: 'Ritesh Mishra',
    download_count: 185,
    created_at: '2026-10-16T14:30:00Z'
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
    total_points: 620,
    checkin_streak: 4,
    last_checkin_date: '2026-10-18',
    updated_at: '2026-10-18T12:00:00Z'
  },
  {
    user_id: 'user-sarah-member',
    total_points: 480,
    checkin_streak: 3,
    last_checkin_date: '2026-10-18',
    updated_at: '2026-10-18T12:00:00Z'
  },
  {
    user_id: 'user-alex-member',
    total_points: 340,
    checkin_streak: 2,
    last_checkin_date: '2026-10-17',
    updated_at: '2026-10-17T11:00:00Z'
  },
  {
    user_id: 'user-priya-member',
    total_points: 210,
    checkin_streak: 1,
    last_checkin_date: '2026-10-16',
    updated_at: '2026-10-16T14:00:00Z'
  },
  {
    user_id: 'user-jordan-member',
    total_points: 135,
    checkin_streak: 1,
    last_checkin_date: '2026-10-15',
    updated_at: '2026-10-15T10:00:00Z'
  }
];

export const initialMemberBadges = [
  { user_id: 'user-ritesh-superadmin', badge_id: 'badge-1', earned_at: '2026-08-10T10:00:00Z' },
  { user_id: 'user-ritesh-superadmin', badge_id: 'badge-4', earned_at: '2026-08-20T10:00:00Z' },
  { user_id: 'user-ritesh-superadmin', badge_id: 'badge-5', earned_at: '2026-09-01T10:00:00Z' },
  { user_id: 'user-ritesh-superadmin', badge_id: 'badge-8', earned_at: '2026-09-15T10:00:00Z' },
  { user_id: 'user-ritesh-superadmin', badge_id: 'badge-10', earned_at: '2026-08-01T10:00:00Z' },

  { user_id: 'user-sarah-member', badge_id: 'badge-1', earned_at: '2026-08-15T10:00:00Z' },
  { user_id: 'user-sarah-member', badge_id: 'badge-4', earned_at: '2026-09-02T10:00:00Z' },
  { user_id: 'user-sarah-member', badge_id: 'badge-5', earned_at: '2026-09-20T10:00:00Z' },
  { user_id: 'user-sarah-member', badge_id: 'badge-8', earned_at: '2026-10-01T10:00:00Z' },

  { user_id: 'user-alex-member', badge_id: 'badge-1', earned_at: '2026-09-05T10:00:00Z' },
  { user_id: 'user-alex-member', badge_id: 'badge-4', earned_at: '2026-09-25T10:00:00Z' },
  { user_id: 'user-alex-member', badge_id: 'badge-5', earned_at: '2026-10-10T10:00:00Z' },

  { user_id: 'user-priya-member', badge_id: 'badge-1', earned_at: '2026-09-12T10:00:00Z' },
  { user_id: 'user-priya-member', badge_id: 'badge-4', earned_at: '2026-10-05T10:00:00Z' },

  { user_id: 'user-jordan-member', badge_id: 'badge-1', earned_at: '2026-09-15T10:00:00Z' },
  { user_id: 'user-jordan-member', badge_id: 'badge-4', earned_at: '2026-10-08T10:00:00Z' }
];

export const initialPointsLog = [
  { id: 'log-1', user_id: 'user-ritesh-superadmin', points: 50, reason: 'event_checkin', reference_id: 'evt-1', awarded_at: '2026-10-18T10:00:00Z' },
  { id: 'log-2', user_id: 'user-ritesh-superadmin', points: 30, reason: 'event_created', reference_id: 'evt-1', awarded_at: '2026-10-15T10:00:00Z' },
  { id: 'log-3', user_id: 'user-ritesh-superadmin', points: 20, reason: 'announcement_posted', reference_id: 'ann-1', awarded_at: '2026-10-18T14:00:00Z' },
  { id: 'log-4', user_id: 'user-sarah-member', points: 50, reason: 'event_checkin', reference_id: 'evt-2', awarded_at: '2026-10-17T11:00:00Z' },
  { id: 'log-5', user_id: 'user-alex-member', points: 10, reason: 'event_registration', reference_id: 'evt-1', awarded_at: '2026-10-16T12:00:00Z' }
];

