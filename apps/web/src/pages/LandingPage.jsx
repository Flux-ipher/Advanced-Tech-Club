import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@atc/shared/hooks/useAuth';
import { initialEvents, initialProfiles } from '@atc/shared/mockData';
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
  Award
} from 'lucide-react';

export function LandingPage() {
  const { user, isVerified, isSuperAdmin } = useAuth();
  const publicEvents = initialEvents.slice(0, 3);

  return (
    <div className="space-y-20 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 md:py-24 bg-gradient-to-b from-white via-neutral-50/50 to-neutral-50 border-b border-neutral-200">
        <div className="absolute inset-0 bg-[radial-gradient(#0597ff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.04] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-semibold uppercase tracking-wider mb-8 animate-in fade-in duration-300">
            <Sparkles className="w-3.5 h-3.5 text-primary-500" />
            <span>Official Student Innovation Platform</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
            <span>Spring 2026</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-extrabold text-neutral-900 tracking-tight max-w-4xl mx-auto leading-[1.1] mb-6">
            Where Campus Engineers Build the <span className="text-primary-500">Next Generation</span> of Tech.
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed mb-10">
            The premier campus developer organization. Build production-grade software, compete in annual hackathons, and learn directly from top industry mentors.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              to="/apply"
              className="w-full sm:w-auto btn-primary px-7 py-3 text-sm font-bold shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
            >
              Apply for Membership
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <Link
              to="/portal"
              className="w-full sm:w-auto px-7 py-3 text-sm font-bold rounded-lg bg-white border border-neutral-300 text-neutral-800 hover:bg-neutral-50 hover:border-neutral-400 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              Launch Club Portal
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            </Link>
          </div>

          <p className="text-xs text-neutral-400 mt-4 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-warning-600" />
            Club portal access is role-gated & verified by Club Admin (Ritesh Mishra)
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-16 pt-10 border-t border-neutral-200 text-left">
            <div className="voodoo-card p-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900">380+</p>
              <p className="text-xs font-semibold text-neutral-500 mt-1 uppercase tracking-wider">Active Students</p>
            </div>
            <div className="voodoo-card p-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-primary-600">$5,000</p>
              <p className="text-xs font-semibold text-neutral-500 mt-1 uppercase tracking-wider">Hackathon Prizes</p>
            </div>
            <div className="voodoo-card p-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900">25+</p>
              <p className="text-xs font-semibold text-neutral-500 mt-1 uppercase tracking-wider">Annual Sprints</p>
            </div>
            <div className="voodoo-card p-4">
              <p className="text-2xl sm:text-3xl font-extrabold text-success-600">100%</p>
              <p className="text-xs font-semibold text-neutral-500 mt-1 uppercase tracking-wider">Student Driven</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ABOUT & TECHNICAL DIVISIONS */}
      <section id="divisions" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 block mb-2">
            Engineering Tracks
          </span>
          <h2 className="text-3xl font-bold text-neutral-900 tracking-tight">
            Specialized Development Divisions
          </h2>
          <p className="text-sm text-neutral-500 mt-2">
            Every club member collaborates within one or more hands-on divisions led by senior engineering leads.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="voodoo-card p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4 border border-primary-200">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-2">AI & Machine Learning</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                PyTorch pipelines, deep learning models, LLM agents, and computer vision algorithms running on campus GPU servers.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-100 text-[11px] font-semibold text-primary-600">
              Focus: PyTorch · Agents · HuggingFace
            </div>
          </div>

          <div className="voodoo-card p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-success-50 text-success-600 flex items-center justify-center mb-4 border border-success-200">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-2">Full-Stack & Mobile</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Monorepo architectures with React, React Native, Vite, Expo APK compiling, and Supabase Postgres backends.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-100 text-[11px] font-semibold text-success-600">
              Focus: React · React Native · Supabase
            </div>
          </div>

          <div className="voodoo-card p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-warning-50 text-warning-700 flex items-center justify-center mb-4 border border-warning-200">
                <Cloud className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-2">Cloud & DevOps</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Container orchestration, Kubernetes clusters, Dockerized microservices, and automated GitHub CI/CD workflows.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-100 text-[11px] font-semibold text-warning-700">
              Focus: Docker · K8s · CI/CD · Terraform
            </div>
          </div>

          <div className="voodoo-card p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-info-50 text-info-600 flex items-center justify-center mb-4 border border-info-200">
                <Terminal className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 mb-2">Systems & Security</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                High-throughput distributed systems, Rust concurrency, low-level Linux kernel optimizations, and network security.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-neutral-100 text-[11px] font-semibold text-info-600">
              Focus: Rust · Linux · Distributed Systems
            </div>
          </div>
        </div>
      </section>

      {/* 3. VERIFICATION & MEMBERSHIP PIPELINE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="voodoo-card p-8 sm:p-12 bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 text-white rounded-3xl border-neutral-800 relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-400 block mb-2">
                Curated Membership Process
              </span>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                How Student Verification Works
              </h2>
              <p className="text-sm text-neutral-300 mt-2">
                To preserve high-quality project teams and campus trust, portal access is restricted to verified students.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-neutral-800/80 border border-neutral-700 p-6 rounded-2xl relative">
                <span className="w-8 h-8 rounded-full bg-primary-500 text-white font-bold text-sm flex items-center justify-center mb-4">
                  1
                </span>
                <h3 className="text-lg font-bold text-white mb-2">Submit Student Application</h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Provide your University student ID, department, and GitHub handle via the public application form.
                </p>
              </div>

              <div className="bg-neutral-800/80 border border-neutral-700 p-6 rounded-2xl relative">
                <span className="w-8 h-8 rounded-full bg-warning-500 text-white font-bold text-sm flex items-center justify-center mb-4">
                  2
                </span>
                <h3 className="text-lg font-bold text-white mb-2">Verification by Admin</h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Club Admin (Ritesh Mishra, Vice President) reviews student applications to verify university enrollment and approve access.
                </p>
              </div>

              <div className="bg-neutral-800/80 border border-neutral-700 p-6 rounded-2xl relative">
                <span className="w-8 h-8 rounded-full bg-success-500 text-white font-bold text-sm flex items-center justify-center mb-4">
                  3
                </span>
                <h3 className="text-lg font-bold text-white mb-2">Club Portal & APK Unlocked</h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Access the Subdomain Hub (<code className="text-primary-300 font-mono">/portal</code>), install the distributed Android APK, and RSVP with 1-tap.
                </p>
              </div>
            </div>

            <div className="mt-12 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/apply"
                className="btn-primary text-sm px-6 py-2.5 font-bold"
              >
                Apply for Membership Now
              </Link>
              <Link
                to="/verification-status"
                className="text-xs font-semibold text-neutral-300 hover:text-white underline"
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
            <div key={evt.id} className="voodoo-card-hover overflow-hidden flex flex-col justify-between">
              <div>
                <img
                  src={evt.banner_url}
                  alt={evt.title}
                  className="w-full h-44 object-cover"
                />
                <div className="p-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-200">
                    {evt.category}
                  </span>
                  <h3 className="text-base font-bold text-neutral-900 mt-2 mb-2 line-clamp-1">
                    {evt.title}
                  </h3>
                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed mb-4">
                    {evt.description}
                  </p>
                  <div className="space-y-1 text-xs text-neutral-600">
                    <p>📅 {formatDateTime(evt.start_at)}</p>
                    <p>📍 {evt.location}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <Link
                  to={`/events/${evt.id}`}
                  className="w-full btn-outline text-xs py-2 flex items-center justify-center gap-1 font-semibold"
                >
                  View Event Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. CLUB ADMINISTRATION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="voodoo-card p-6 sm:p-8 max-w-xl mx-auto flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
            alt="Ritesh Mishra"
            className="w-20 h-20 rounded-2xl object-cover border-2 border-neutral-200 shadow-sm shrink-0"
          />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="font-bold text-neutral-900 text-lg">Ritesh Mishra</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-primary-50 text-primary-700 border border-primary-200">
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
        <div className="voodoo-card p-8 sm:p-12 text-center bg-gradient-to-r from-primary-500 to-primary-600 text-white border-primary-500 rounded-3xl shadow-lg">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">
            Ready to Build With Advanced Tech Club?
          </h2>
          <p className="text-sm text-primary-100 max-w-xl mx-auto mb-8">
            Applications are reviewed on a rolling basis. Submit your details today to get verified by Club Admin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/apply"
              className="px-8 py-3 rounded-xl bg-white text-primary-700 font-bold text-sm hover:bg-neutral-50 transition-colors shadow-md"
            >
              Start Application
            </Link>
            <Link
              to="/portal"
              className="px-8 py-3 rounded-xl bg-primary-700 text-white font-bold text-sm hover:bg-primary-800 transition-colors border border-primary-400"
            >
              Member Portal Login
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
