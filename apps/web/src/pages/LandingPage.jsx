import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { initialEvents } from '@atc/shared/mockData';
import { formatDateTime } from '@atc/shared/utils/formatters';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Code2,
  Cpu,
  Cloud,
  Terminal,
  Calendar,
  CheckCircle2,
  Lock,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Smartphone,
  Layers,
  Award,
  Download,
  Activity,
  Users,
  Compass,
  ArrowUpRight,
  Zap
} from 'lucide-react';

export function LandingPage() {
  const { user, isVerified, isSuperAdmin } = useAuth();
  const publicEvents = initialEvents.slice(0, 3);

  return (
    <div className="space-y-24 pb-24">
      {/* 1. HERO SECTION WITH AMBIENT LIGHTING & DYNAMIC PREVIEW */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-white via-primary-50/20 to-neutral-50/60 border-b border-neutral-200/80">
        {/* Ambient Radial Glow Orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-tr from-primary-400/15 via-primary-500/10 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute top-1/4 -right-24 w-96 h-96 bg-primary-300/10 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Top Status Capsule */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full voodoo-glass border-primary-200/80 shadow-sm text-primary-700 text-xs font-semibold mb-8 animate-in fade-in duration-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            <span>Official Student Innovation Platform</span>
            <span className="text-neutral-300">·</span>
            <span className="text-primary-800 font-bold">Spring 2026</span>
          </div>

          {/* Headline with Rich Typography */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-neutral-900 tracking-tight max-w-4xl mx-auto leading-[1.12] mb-6">
            Where Campus Engineers Build the{' '}
            <span className="text-gradient-primary">Next Generation</span> of Tech.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed mb-10">
            The premier university developer organization. Build production-grade software, compete in annual hackathons, and learn directly from top industry mentors.
          </p>

          {/* Main Action Trays */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              to="/apply"
              className="w-full sm:w-auto btn-primary px-8 py-3.5 text-sm font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
            >
              Apply for Membership
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              to={user ? '/portal' : '/login?mode=register'}
              className="w-full sm:w-auto btn-outline px-7 py-3.5 text-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:border-neutral-300"
            >
              {user ? 'Open Club Portal' : 'Sign Up for Portal'}
              <ArrowUpRight className="w-4 h-4 text-neutral-400" />
            </Link>
          </div>

          {/* Security & Access Guard Note */}
          <p className="text-xs text-neutral-500 mt-5 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-warning-600" />
            Portal access is role-gated & verified by Club Admin (Ritesh Mishra)
          </p>

          {/* Interactive Live Telemetry / Terminal Widget */}
          <div className="mt-12 max-w-2xl mx-auto rounded-2xl bg-neutral-900 border border-neutral-800/90 shadow-2xl overflow-hidden text-left font-mono text-xs text-neutral-300">
            <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-950 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <span className="text-[11px] text-neutral-400 ml-2 font-sans font-medium">
                  terminal — atc-cluster-v2
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-sans">
                <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
                Online
              </div>
            </div>
            <div className="p-4 space-y-2">
              <div className="text-neutral-500">$ atc monorepo --verify-environment</div>
              <div className="flex items-center gap-2 text-primary-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-success-400" />
                <span>Supabase Realtime Postgres: CONNECTED (Spring 2026 Schema)</span>
              </div>
              <div className="flex items-center gap-2 text-primary-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-success-400" />
                <span>Standalone Android APK: READY (v1.2.0 · Gradle Release · 64MB)</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-200">
                <Zap className="w-3.5 h-3.5 text-warning-400" />
                <span>Active Student Engineers: 380+ Verified campus members</span>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto mt-14 pt-8 border-t border-neutral-200/80 text-left">
            <div className="voodoo-card-hover p-5 bg-white/90">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <Users className="w-5 h-5 text-primary-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-2 py-0.5 rounded">Active</span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">380+</p>
              <p className="text-xs font-semibold text-neutral-500 mt-1 uppercase tracking-wider">Campus Students</p>
            </div>

            <div className="voodoo-card-hover p-5 bg-white/90">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <Award className="w-5 h-5 text-warning-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-warning-700 bg-warning-50 px-2 py-0.5 rounded">Flagship</span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-primary-600 tracking-tight">$5,000</p>
              <p className="text-xs font-semibold text-neutral-500 mt-1 uppercase tracking-wider">Hackathon Pool</p>
            </div>

            <div className="voodoo-card-hover p-5 bg-white/90">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <Calendar className="w-5 h-5 text-info-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-info-700 bg-info-50 px-2 py-0.5 rounded">Weekly</span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">25+</p>
              <p className="text-xs font-semibold text-neutral-500 mt-1 uppercase tracking-wider">Annual Sprints</p>
            </div>

            <div className="voodoo-card-hover p-5 bg-white/90">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <Sparkles className="w-5 h-5 text-success-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-success-700 bg-success-50 px-2 py-0.5 rounded">Peer Led</span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-success-600 tracking-tight">100%</p>
              <p className="text-xs font-semibold text-neutral-500 mt-1 uppercase tracking-wider">Student Driven</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TECHNICAL DIVISIONS WITH ELEVATED CARDS */}
      <section id="divisions" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 bg-primary-50 px-3 py-1 rounded-full border border-primary-200/80 inline-block mb-3">
            Engineering Tracks
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
            Specialized Development Divisions
          </h2>
          <p className="text-sm text-neutral-500 mt-2">
            Every club member collaborates within one or more hands-on divisions led by senior engineering leads.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="voodoo-card-hover p-6 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-5 border border-primary-200 group-hover:scale-105 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-2">AI & Machine Learning</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                PyTorch pipelines, deep learning models, LLM agents, and computer vision algorithms running on campus GPU clusters.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-100 flex flex-wrap gap-1.5 text-[11px] font-semibold text-primary-600">
              <span className="px-2 py-0.5 rounded bg-primary-50">PyTorch</span>
              <span className="px-2 py-0.5 rounded bg-primary-50">Agents</span>
              <span className="px-2 py-0.5 rounded bg-primary-50">HuggingFace</span>
            </div>
          </div>

          <div className="voodoo-card-hover p-6 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-success-50 text-success-600 flex items-center justify-center mb-5 border border-success-200 group-hover:scale-105 transition-transform">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-2">Full-Stack & Mobile</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Monorepo architectures with React, React Native, Vite, Expo APK compiling, and Supabase Postgres backends.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-100 flex flex-wrap gap-1.5 text-[11px] font-semibold text-success-600">
              <span className="px-2 py-0.5 rounded bg-success-50">React 18</span>
              <span className="px-2 py-0.5 rounded bg-success-50">React Native</span>
              <span className="px-2 py-0.5 rounded bg-success-50">Supabase</span>
            </div>
          </div>

          <div className="voodoo-card-hover p-6 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-warning-50 text-warning-700 flex items-center justify-center mb-5 border border-warning-200 group-hover:scale-105 transition-transform">
                <Cloud className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-2">Cloud & DevOps</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Container orchestration, Kubernetes clusters, Dockerized microservices, and automated GitHub CI/CD workflows.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-100 flex flex-wrap gap-1.5 text-[11px] font-semibold text-warning-700">
              <span className="px-2 py-0.5 rounded bg-warning-50">Docker</span>
              <span className="px-2 py-0.5 rounded bg-warning-50">K8s</span>
              <span className="px-2 py-0.5 rounded bg-warning-50">Terraform</span>
            </div>
          </div>

          <div className="voodoo-card-hover p-6 flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-info-50 text-info-600 flex items-center justify-center mb-5 border border-info-200 group-hover:scale-105 transition-transform">
                <Terminal className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-2">Systems & Security</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                High-throughput distributed systems, Rust concurrency, low-level Linux kernel optimizations, and network security.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-100 flex flex-wrap gap-1.5 text-[11px] font-semibold text-info-600">
              <span className="px-2 py-0.5 rounded bg-info-50">Rust</span>
              <span className="px-2 py-0.5 rounded bg-info-50">Linux</span>
              <span className="px-2 py-0.5 rounded bg-info-50">Security</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. VERIFICATION & MEMBERSHIP PIPELINE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="voodoo-card p-8 sm:p-14 bg-gradient-to-br from-neutral-900 via-neutral-900 to-primary-950 text-white rounded-3xl border-neutral-800 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-primary-500/10 to-transparent pointer-events-none" />

          <div className="relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-400 bg-primary-500/20 px-3 py-1 rounded-full border border-primary-500/30 inline-block mb-3">
                Curated Membership Process
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                How Student Verification Works
              </h2>
              <p className="text-sm text-neutral-300 mt-2">
                To preserve high-quality project teams and campus trust, portal access is restricted to verified students.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-neutral-800/70 backdrop-blur-sm border border-neutral-700/80 p-6 rounded-2xl relative hover:border-primary-500/50 transition-colors">
                <span className="w-9 h-9 rounded-xl bg-primary-500 text-white font-bold text-sm flex items-center justify-center mb-4 shadow-sm shadow-primary-500/30">
                  1
                </span>
                <h3 className="text-lg font-bold text-white mb-2">Submit Student Application</h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Provide your University student ID, department, and GitHub handle via the public application form.
                </p>
              </div>

              <div className="bg-neutral-800/70 backdrop-blur-sm border border-neutral-700/80 p-6 rounded-2xl relative hover:border-warning-500/50 transition-colors">
                <span className="w-9 h-9 rounded-xl bg-warning-500 text-white font-bold text-sm flex items-center justify-center mb-4 shadow-sm shadow-warning-500/30">
                  2
                </span>
                <h3 className="text-lg font-bold text-white mb-2">Verification by Admin</h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Club Admin (Ritesh Mishra, Vice President) reviews student applications to verify university enrollment and approve access.
                </p>
              </div>

              <div className="bg-neutral-800/70 backdrop-blur-sm border border-neutral-700/80 p-6 rounded-2xl relative hover:border-success-500/50 transition-colors">
                <span className="w-9 h-9 rounded-xl bg-success-500 text-white font-bold text-sm flex items-center justify-center mb-4 shadow-sm shadow-success-500/30">
                  3
                </span>
                <h3 className="text-lg font-bold text-white mb-2">Club Portal & APK Unlocked</h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Access the Member Portal (<code className="text-primary-300 font-mono">/portal</code>), install the companion Android APK, and RSVP with 1-tap.
                </p>
              </div>
            </div>

            <div className="mt-12 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/apply"
                className="btn-primary text-sm px-7 py-3 font-bold"
              >
                Apply for Membership Now
              </Link>
              <Link
                to="/verification-status"
                className="text-xs font-semibold text-neutral-300 hover:text-white underline underline-offset-4"
              >
                Already applied? Check Verification Status →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PUBLIC UPCOMING EVENTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-primary-600 block mb-1">
              Campus Calendar
            </span>
            <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">
              Featured Public Events
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              Open workshops and technical sessions that all campus students can view and attend.
            </p>
          </div>
          <Link
            to="/events"
            className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1.5 self-start sm:self-auto"
          >
            View All Events <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {publicEvents.map((evt) => (
            <div key={evt.id} className="voodoo-card-hover overflow-hidden flex flex-col justify-between group">
              <div>
                <div className="relative overflow-hidden h-44 bg-neutral-100">
                  <img
                    src={evt.banner_url}
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/90 backdrop-blur-sm text-primary-700 border border-white/60 shadow-sm">
                      {evt.category}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-base font-bold text-neutral-900 mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed mb-4">
                    {evt.description}
                  </p>
                  <div className="space-y-1 text-xs text-neutral-600">
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                      {formatDateTime(evt.start_at)}
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-neutral-400" />
                      {evt.location}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <Link
                  to={`/events/${evt.id}`}
                  className="w-full btn-outline text-xs py-2.5 flex items-center justify-center gap-1.5 font-semibold"
                >
                  View Event Details
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CLUB ADMINISTRATION CARD (RULE 4 COMPLIANT) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="voodoo-card-hover p-6 sm:p-8 max-w-xl mx-auto flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left bg-gradient-to-r from-white via-primary-50/10 to-white">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
            alt="Ritesh Mishra"
            className="w-20 h-20 rounded-2xl object-cover border-2 border-primary-200/80 shadow-sm shrink-0"
          />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="font-bold text-neutral-900 text-lg">Ritesh Mishra</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-primary-50 text-primary-700 border border-primary-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-primary-600" />
                Admin
              </span>
            </div>
            <p className="text-xs font-semibold text-neutral-600">
              Vice President · Advanced Tech Club
            </p>
            <p className="text-xs text-neutral-500 leading-relaxed pt-1">
              Coordinating campus engineering workshops, technical divisions, and student membership verifications.
            </p>
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION FOOTER BANNER */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="voodoo-card p-8 sm:p-12 text-center bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 text-white border-primary-400 rounded-3xl shadow-xl shadow-primary-500/10 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">
              Ready to Build With Advanced Tech Club?
            </h2>
            <p className="text-sm text-primary-100 max-w-xl mx-auto mb-8 leading-relaxed">
              Applications are reviewed on a rolling basis. Submit your details today to get verified by Club Admin.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/apply"
                className="px-8 py-3.5 rounded-xl bg-white text-primary-700 font-bold text-sm hover:bg-neutral-50 transition-all shadow-md active:scale-95"
              >
                Start Application
              </Link>
              <Link
                to={user ? '/portal' : '/login?mode=register'}
                className="px-8 py-3.5 rounded-xl bg-primary-800/80 text-white font-bold text-sm hover:bg-primary-900 transition-all border border-primary-400/60 active:scale-95"
              >
                {user ? 'Open Member Portal' : 'Member Portal Sign Up'}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
