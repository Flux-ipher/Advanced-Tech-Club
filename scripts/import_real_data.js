// scripts/import_real_data.js
// Imports real events from events_rows.sql and resources from resources_rows.sql into Supabase

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('apps/web/.env', 'utf8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

if (!urlMatch || !keyMatch) {
  console.error('Missing Supabase credentials in apps/web/.env');
  process.exit(1);
}

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

// Author ID: Ritesh Kumar Mishra (Super Admin)
const ADMIN_ID = 'Zp2JThOUCAbl7aF1TT4DQHUH0Dk2';

const realEvents = [
  {
    id: '3d6d2d58-ef35-4f1e-8027-88a6f0e51399',
    title: 'The Cyber Heist (CTF Event)',
    description: 'An immersive, team-based Capture The Flag (CTF) cybersecurity event. Form your fireteam, breach the target network, and decrypt the override codes before time runs out.',
    banner_url: 'https://cjmviumwfzxkxtorzyvk.supabase.co/storage/v1/object/public/event-images/1772085185188-jggj8y620bh.jpg',
    start_at: '2026-03-24T16:30:00Z',
    end_at: '2026-03-24T19:30:00Z',
    location: 'Room 416, Academic Block',
    capacity: 120,
    category: 'hackathon',
    author_id: ADMIN_ID,
    created_at: '2026-02-26T04:57:08.162Z',
    updated_at: '2026-02-26T04:57:08.162Z'
  },
  {
    id: '7f4edf24-6236-417c-a545-6131576e33f5',
    title: 'The Jugaad-a-thon (The Useless Tech Hackathon)',
    description: 'The Jugaad-a-thon is a 1.5-hour, stress-free hackathon where the primary objective is to build the most functionally useless, inconvenient, or hilariously pointless technology possible. Eliminates performance anxiety, encourages risk-taking, and builds full-stack skills.',
    banner_url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    start_at: '2026-04-17T16:20:00Z',
    end_at: '2026-04-17T18:00:00Z',
    location: 'Room 416, Academic Block',
    capacity: 80,
    category: 'hackathon',
    author_id: ADMIN_ID,
    created_at: '2026-04-10T07:22:45.654Z',
    updated_at: '2026-04-10T07:22:45.654Z'
  }
];

const realResources = [
  {
    id: '359b698b-12b0-4943-8317-44b235e5622d',
    title: 'Metaflow (Netflix AI/ML Framework)',
    description: 'Metaflow is a human-centric framework designed to help scientists and engineers build and manage real-life AI and ML systems. Serving teams of all sizes and scales, Metaflow streamlines the entire development lifecycle.',
    file_url: 'https://metaflow.org/',
    file_size: 'Web App',
    category: 'Tools',
    author_id: ADMIN_ID,
    download_count: 42,
    created_at: '2026-04-11T02:02:15.367Z'
  },
  {
    id: '58dbee59-5fe9-4a7d-8281-0b70012a4cd5',
    title: 'The Open Source AI Engineering Platform for Agents, LLMs & Models',
    description: 'MLflow is the largest open source AI engineering platform for agents, LLMs, and ML models. Enables teams of all sizes to debug, evaluate, monitor, and optimize production-quality AI applications.',
    file_url: 'https://mlflow.org/',
    file_size: 'Web Platform',
    category: 'Code Samples',
    author_id: ADMIN_ID,
    download_count: 67,
    created_at: '2026-04-11T01:59:13.469Z'
  },
  {
    id: '5ea69654-49cc-445e-bc38-7d6d931bb399',
    title: 'Feast (Feature Store for Machine Learning)',
    description: 'Feast is an open source feature store for machine learning. Feast is the fastest path to manage existing infrastructure to productionize analytic data for model training and online inference.',
    file_url: 'https://feast.dev/',
    file_size: 'Documentation',
    category: 'Documentation',
    author_id: ADMIN_ID,
    download_count: 38,
    created_at: '2026-04-11T02:04:37.602Z'
  }
];

// Clean Welcome Announcement by Club Admin
const realAnnouncements = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    title: '👋 Welcome to the Advanced Tech Club Platform',
    body: 'Welcome to the official Advanced Tech Club portal and mobile application! Access upcoming workshops, technical hackathons, open-source resources, and verify your event attendance with digital campus passes. Earn XP through contributions and GitHub PRs.',
    category: 'general',
    pinned: true,
    author_id: ADMIN_ID,
    media_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80',
    created_at: new Date().toISOString()
  }
];

async function run() {
  console.log('Ingesting Real Events...');
  const { data: evData, error: evErr } = await supabase
    .from('events')
    .upsert(realEvents, { onConflict: 'id' })
    .select();

  if (evErr) {
    console.error('Events Upsert Error:', evErr);
  } else {
    console.log(`✓ Inserted ${evData.length} Real Events!`);
  }

  console.log('Ingesting Real Resources...');
  const { data: resData, error: resErr } = await supabase
    .from('resources')
    .upsert(realResources, { onConflict: 'id' })
    .select();

  if (resErr) {
    console.error('Resources Upsert Error:', resErr);
  } else {
    console.log(`✓ Inserted ${resData.length} Real Resources!`);
  }

  console.log('Ingesting Club Announcement...');
  const { data: annData, error: annErr } = await supabase
    .from('announcements')
    .upsert(realAnnouncements, { onConflict: 'id' })
    .select();

  if (annErr) {
    console.error('Announcements Upsert Error:', annErr);
  } else {
    console.log(`✓ Inserted ${annData.length} Club Announcement!`);
  }

  console.log('Data ingestion complete!');
}

run().catch(console.error);
