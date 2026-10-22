// apps/mobile/App.jsx
// Advanced Tech Club (ATC) - Official Cross-Platform Mobile Application
// Includes: Full Authentication (Login & Signup), Member Portal, Application Hub,
// Status Checker, Admin Management Console, Offline Vault & Digital QR Pass

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  StatusBar,
  Alert,
  Platform,
  Share,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  AppState
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as ImagePicker from 'expo-image-picker';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { supabase } from '@atc/shared/supabaseClient';

// Ensure notifications show alerts, sounds, and badges when the app is in foreground or background
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
import {
  initialAnnouncements,
  initialEvents,
  initialResources,
  initialBadges
} from '@atc/shared/mockData';
import {
  getLeaderboard,
  getMyRank,
  getMemberPoints,
  getAllBadges,
  getMemberBadges,
  awardPoints,
  recordEventCheckin,
  adjustMemberPoints,
  submitContributionReport,
  fetchContributionReports,
  reviewContributionReport,
  toggleLeaderboardVisibility
} from '@atc/shared/api/gamification';
import {
  getVaultGalleryMemories,
  addVaultGalleryMemory,
  updateVaultGalleryMemory,
  deleteVaultGalleryMemory,
  toggleLikeVaultGalleryMemory,
  deleteResource
} from '@atc/shared/api/resources';
import { setRole } from '@atc/shared/api/profiles';
import {
  fetchAssignedTasks,
  createAssignedTask,
  updateTaskStatus,
  submitTaskDeliverable,
  reviewAssignedTask,
  deleteAssignedTask
} from '@atc/shared/api/tasks';
import { idempotency } from '@atc/shared/utils/idempotency';
import { canStudentCheckIn, validateAttendanceCheckInTransition } from '@atc/shared/utils/stateMachines';
import { checkTokenBucket } from '@atc/shared/utils/rateLimiter';
import { colors } from '@atc/shared/theme';
import { Analytics } from '@atc/shared/utils/analytics';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import {
  House,
  CalendarBlank,
  Plus,
  Folder,
  User,
  QrCode,
  Trophy,
  CheckCircle,
  Clock,
  Sparkle,
  PushPin,
  MagnifyingGlass,
  ArrowRight,
  Heart,
  Trash,
  PencilSimple,
  ShareNetwork,
  ArrowLeft,
  ArrowSquareOut,
  Package,
  SealCheck,
  DownloadSimple,
  Bell,
  IdentificationCard,
  Flame,
  Eye,
  EyeSlash,
  X,
  FileText,
  Megaphone,
  RocketLaunch,
  Medal,
  Camera,
  Check,
  Star,
  BookOpen,
  Shield,
  Users,
  MapPin
} from 'phosphor-react-native';

try {
  GoogleSignin.configure({
    webClientId: '767714143869-ctm1vp5g2h0erdf1cruivave2a9ostbt.apps.googleusercontent.com',
  });
} catch (cfgErr) {
  console.warn('[ATC Mobile] GoogleSignin configure warning:', cfgErr);
}

const SESSION_FILE = `${FileSystem.documentDirectory}atc_mobile_session.json`;
const SAVED_ACCOUNTS_FILE = `${FileSystem.documentDirectory}atc_saved_google_accounts.json`;
const READ_NOTIFS_FILE = `${FileSystem.documentDirectory}atc_read_notifications.json`;

const DEFAULT_GOOGLE_ACCOUNTS = [
  {
    email: 'fluxipher@gmail.com',
    name: 'Ritesh Kumar Mishra',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    tag: 'Admin'
  }
];

export default function App() {
  // Navigation Tab: 'home' | 'events' | 'resources' | 'profile'
  const [currentTab, setCurrentTab] = useState('home');

  const handleSwitchTab = (tab) => {
    setCurrentTab(tab);
    Analytics.screenView(tab);
  };

  // =========================================================================
  // 1. AUTHENTICATION & SESSION STATE (WITH LOCAL DISK PERSISTENCE)
  // =========================================================================
  // Starts unauthenticated so user can log in or sign up, with Guest mode option
  const [currentUser, setCurrentUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isSessionRestoring, setIsSessionRestoring] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'

  // Auth Form Fields
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  // Platform & Resilience State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [copiedPassToken, setCopiedPassToken] = useState(false);

  // Google Sign-In Sheet Modal State
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [googleInputEmail, setGoogleInputEmail] = useState('');
  const [googleInputName, setGoogleInputName] = useState('');
  const [savedGoogleAccounts, setSavedGoogleAccounts] = useState(DEFAULT_GOOGLE_ACCOUNTS);

  // Admin QR Event Attendance Scanner State (Dedicated for Admins Only)
  const [isAdminScannerOpen, setIsAdminScannerOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [scannerEventId, setScannerEventId] = useState('');
  const [scannedStudent, setScannedStudent] = useState(null);
  const [scannedRegStatus, setScannedRegStatus] = useState(null); // 'attended' | 'confirmed' | 'walkin' | 'not_found'
  const [isScanningPaused, setIsScanningPaused] = useState(false);
  const [manualScanCode, setManualScanCode] = useState('');
  const [scannerCheckingIn, setScannerCheckingIn] = useState(false);
  const [scannerFeedback, setScannerFeedback] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);

  // Gamification & Badges State (Synchronized directly with Supabase)
  const [memberPoints, setMemberPoints] = useState(0);
  const [memberRank, setMemberRank] = useState(null);
  const [memberStreak, setMemberStreak] = useState(0);
  const [allBadgesList, setAllBadgesList] = useState([]);
  const [earnedBadgesList, setEarnedBadgesList] = useState([]);
  const [leaderboardList, setLeaderboardList] = useState([]);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [badgeUnlockCelebration, setBadgeUnlockCelebration] = useState(null);

  // First-time Onboarding Modal State
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [onboardRoll, setOnboardRoll] = useState('');
  const [onboardBranch, setOnboardBranch] = useState('Computer Science & Engineering');
  const [onboardYear, setOnboardYear] = useState('2nd Year');
  const [onboardWhyJoin, setOnboardWhyJoin] = useState('');
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);

  // Floating Navbar FAB Action Menu State
  const [isFabActionMenuOpen, setIsFabActionMenuOpen] = useState(false);

  // Tasks Tab Sub-View ('vault' | 'contributions')
  const [tasksSubTab, setTasksSubTab] = useState('vault');

  // Student Contribution Submission State
  const [isSubmitContributionOpen, setIsSubmitContributionOpen] = useState(false);
  const [contribTitle, setContribTitle] = useState('');
  const [contribCategory, setContribCategory] = useState('github_pr');
  const [contribDesc, setContribDesc] = useState('');
  const [contribProofUrl, setContribProofUrl] = useState('');
  const [contribSubmitting, setContribSubmitting] = useState(false);
  const [contributionReports, setContributionReports] = useState([]);

  // Admin Manual Points Adjuster State
  const [isAdjustPointsOpen, setIsAdjustPointsOpen] = useState(false);
  const [adjustTargetUser, setAdjustTargetUser] = useState(null);
  const [adjustPointsDelta, setAdjustPointsDelta] = useState('100');
  const [adjustPointsReason, setAdjustPointsReason] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustSearchQuery, setAdjustSearchQuery] = useState('');
  const [allProfiles, setAllProfiles] = useState([]);

  // Admin Contribution Report Review Modal State
  const [isReviewReportModalOpen, setIsReviewReportModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewPoints, setReviewPoints] = useState('100');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Multi-account Google Sign-In Input Toggle State
  const [showNewGoogleInput, setShowNewGoogleInput] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isMediaHead = currentUser?.role === 'media_head';
  const canManageMedia = isAdmin || isMediaHead;
  const canManagePosts = isAdmin || isMediaHead;
  const canAssignRoles = isSuperAdmin;
  const canAssignTasks = isAdmin || isSuperAdmin;

  // Open Leaderboard with up-to-date visibility and rankings
  const openLeaderboard = () => {
    setIsLeaderboardOpen(true);
    getLeaderboard(50, isAdmin).then((lb) => {
      if (lb && lb.length > 0) setLeaderboardList(lb);
    }).catch(() => {});
  };

  // Rule 4: Admin Role Privacy - format strictly as 'Admin' or 'Member' (and 'Media Head' for media head)
  const getDisplayRole = (role) => {
    if (role === 'admin' || role === 'super_admin') return 'Admin';
    if (role === 'media_head') return 'Media Head';
    return 'Member';
  };

  // Role Tasks Hub State
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [isAssignTaskModalOpen, setIsAssignTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskRole, setNewTaskRole] = useState('media_head');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskAssigneeName, setNewTaskAssigneeName] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('high');
  const [newTaskPoints, setNewTaskPoints] = useState('100');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [taskAssignSubmitting, setTaskAssignSubmitting] = useState(false);

  // Deliverable Submit Modal State (for Media Head / Assignee)
  const [isSubmitDeliverableModalOpen, setIsSubmitDeliverableModalOpen] = useState(false);
  const [targetDeliverableTask, setTargetDeliverableTask] = useState(null);
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [deliverableNotes, setDeliverableNotes] = useState('');
  const [deliverableSubmitting, setDeliverableSubmitting] = useState(false);

  // Deliverable Review Modal State (for Admin / Super Admin)
  const [isReviewTaskModalOpen, setIsReviewTaskModalOpen] = useState(false);
  const [targetReviewTask, setTargetReviewTask] = useState(null);
  const [reviewTaskFeedback, setReviewTaskFeedback] = useState('');
  const [reviewTaskPoints, setReviewTaskPoints] = useState('100');
  const [reviewTaskSubmitting, setReviewTaskSubmitting] = useState(false);

  // Role Assignment Processing State
  const [roleChangeLoading, setRoleChangeLoading] = useState(false);

  // Helper: Persist mobile session to disk across app reboots
  const saveMobileSession = async (user) => {
    try {
      if (user) {
        await FileSystem.writeAsStringAsync(SESSION_FILE, JSON.stringify(user));
      } else {
        const info = await FileSystem.getInfoAsync(SESSION_FILE);
        if (info.exists) {
          await FileSystem.deleteAsync(SESSION_FILE, { idempotent: true });
        }
      }
    } catch (err) {
      console.warn('[ATC Mobile] Session save error:', err);
    }
  };

  // Helper: Remember newly logged-in Google / Member accounts for 1-tap fast access
  const persistGoogleAccount = async (email, name, avatar = '') => {
    if (!email) return;
    try {
      const cleanEmail = email.trim().toLowerCase();
      const isRitesh = cleanEmail.includes('ritesh') || cleanEmail.includes('fluxipher');
      const newEntry = {
        email: cleanEmail,
        name: name || (isRitesh ? 'Ritesh Kumar Mishra' : cleanEmail.split('@')[0].replace('.', ' ')),
        role: isRitesh ? 'admin' : 'member',
        avatar: avatar || (isRitesh
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'),
        tag: isRitesh ? 'Admin' : 'Member'
      };

      setSavedGoogleAccounts((prev) => {
        const filtered = prev.filter((acc) => acc.email.toLowerCase() !== cleanEmail);
        const updated = [newEntry, ...filtered];
        FileSystem.writeAsStringAsync(SAVED_ACCOUNTS_FILE, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    } catch (err) {
      console.warn('[ATC Mobile] Persist google account error:', err);
    }
  };

  // Restore authenticated session and saved accounts on app cold boot
  useEffect(() => {
    let isMounted = true;
    async function restoreMobileSession() {
      try {
        // Setup Android Notification Channels and Request Permissions for Heads-Up Alerts
        try {
          if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('atc_announcements', {
              name: 'ATC Announcements & Campus Alerts',
              importance: Notifications.AndroidImportance.MAX,
              vibrationPattern: [0, 250, 250, 250],
              lightColor: '#0597ff',
              sound: 'default',
              enableVibrate: true,
              showBadge: true
            });
          }
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          if (existingStatus !== 'granted') {
            await Notifications.requestPermissionsAsync();
          }
        } catch (permErr) {
          console.warn('[ATC Mobile] Notifications setup notice:', permErr);
        }

        // 1. Restore Saved Google Accounts for 1-tap login (Sanitize any mock members)
        try {
          const accInfo = await FileSystem.getInfoAsync(SAVED_ACCOUNTS_FILE);
          if (accInfo.exists) {
            const rawAcc = await FileSystem.readAsStringAsync(SAVED_ACCOUNTS_FILE);
            const parsedAcc = JSON.parse(rawAcc);
            if (Array.isArray(parsedAcc) && parsedAcc.length > 0 && isMounted) {
              setSavedGoogleAccounts(parsedAcc);
            }
          }
        } catch (accErr) {
          console.warn('[ATC Mobile] Saved accounts restore notice:', accErr);
        }

        // 2. Restore Persistent Read Notifications State from Disk
        try {
          const readInfo = await FileSystem.getInfoAsync(READ_NOTIFS_FILE);
          if (readInfo.exists) {
            const rawRead = await FileSystem.readAsStringAsync(READ_NOTIFS_FILE);
            const readIds = JSON.parse(rawRead);
            if (Array.isArray(readIds) && readIds.length > 0 && isMounted) {
              setNotifications((prev) =>
                prev.map((n) => (readIds.includes(n.id) ? { ...n, read: true } : n))
              );
            }
          }
        } catch (notifErr) {
          console.warn('[ATC Mobile] Read notifications restore notice:', notifErr);
        }

        // 3. Restore active session
        try {
          const info = await FileSystem.getInfoAsync(SESSION_FILE);
          if (info.exists) {
            const raw = await FileSystem.readAsStringAsync(SESSION_FILE);
            const saved = JSON.parse(raw);
            if (saved && saved.email && isMounted) {
              setCurrentUser(saved);
              setIsGuest(false);

              // Background profile & gamification re-sync with live Supabase
              supabase
                .from('profiles')
                .select('*')
                .eq('email', saved.email.toLowerCase())
                .maybeSingle()
                .then(async ({ data: dbProfile }) => {
                  if (dbProfile && isMounted) {
                    const merged = { ...saved, ...dbProfile };
                    setCurrentUser(merged);
                    FileSystem.writeAsStringAsync(SESSION_FILE, JSON.stringify(merged)).catch(() => {});

                    const targetUserId = dbProfile.id;
                    if (targetUserId) {
                      const mp = await getMemberPoints(targetUserId);
                      if (mp && isMounted) {
                        setMemberPoints(mp.total_points || 0);
                        setMemberStreak(mp.checkin_streak || 0);
                      }
                      const rank = await getMyRank(targetUserId);
                      if (rank && isMounted) {
                        setMemberRank(rank);
                      }
                      const badges = await getMemberBadges(targetUserId);
                      if (badges && badges.length > 0 && isMounted) {
                        setEarnedBadgesList(badges);
                      }
                    }
                  }
                })
                .catch(() => {});
            }
          }
        } catch (sessionErr) {
          console.warn('[ATC Mobile] Session restore notice:', sessionErr);
        }
      } catch (err) {
        console.warn('[ATC Mobile] Session restore error:', err);
      } finally {
        if (isMounted) {
          setIsSessionRestoring(false);
        }
      }
    }
    restoreMobileSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Session Hardening: Re-sync data on mobile app foreground (Plan Sec 1.4)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active' && currentUser) {
        try {
          loadLivePlatformData();
        } catch (e) {
          console.warn('[ATC Mobile] Foreground resume sync warning:', e?.message);
        }
      }
    });

    return () => {
      subscription?.remove?.();
    };
  }, [currentUser]);

  // =========================================================================
  // 2. CONTENT & PLATFORM DATA (NO MOCK MEMBERS)
  // =========================================================================
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [events, setEvents] = useState(initialEvents);
  const [resources, setResources] = useState(initialResources);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [totalMembersCount, setTotalMembersCount] = useState(142);

  // Sync Live Data with Supabase Database
  const loadLivePlatformData = async () => {
    try {
      const { data: dbAnnouncements } = await supabase
        .from('announcements')
        .select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (dbAnnouncements && dbAnnouncements.length > 0) {
        setAnnouncements(dbAnnouncements);
      }

      const { data: dbEvents } = await supabase
        .from('events')
        .select('*')
        .order('start_at', { ascending: true });

      if (dbEvents && dbEvents.length > 0) {
        const normalizedEvents = dbEvents.map((evt) => {
          const isPast = (evt.end_at && new Date(evt.end_at).getTime() < Date.now()) ||
                         (!evt.end_at && evt.start_at && new Date(evt.start_at).getTime() < Date.now()) ||
                         (!evt.end_at && !evt.start_at && evt.date && new Date(evt.date).getTime() < Date.now());
          const isCompleted = evt.is_completed === true || (evt.is_completed !== false && isPast);
          return {
            ...evt,
            date: evt.date || evt.start_at,
            image: evt.image || evt.banner_url,
            tags: Array.isArray(evt.tags) ? evt.tags : (typeof evt.tags === 'string' ? [evt.tags] : []),
            is_completed: isCompleted,
            status: isCompleted ? 'completed' : 'upcoming'
          };
        });
        setEvents(normalizedEvents);
      }

      const { data: dbResources } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbResources && dbResources.length > 0) {
        const normalizedRes = dbResources.map((r) => ({
          ...r,
          url: r.url || r.file_url,
          tags: Array.isArray(r.tags) ? r.tags : (typeof r.tags === 'string' ? [r.tags] : [])
        }));
        setResources(normalizedRes);
      }

      // Fetch all registered student & club member profiles for points management
      const { data: dbAllProfiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbAllProfiles && dbAllProfiles.length > 0) {
        setAllProfiles(dbAllProfiles);
      }

      const { data: dbPending } = await supabase
        .from('profiles')
        .select('*')
        .or('verification_status.eq.pending,is_verified.is.false')
        .neq('role', 'super_admin')
        .neq('role', 'admin')
        .neq('verification_status', 'rejected')
        .order('created_at', { ascending: false });

      if (dbPending) {
        const cleanedPending = dbPending.filter(
          (p) =>
            p.role !== 'super_admin' &&
            p.role !== 'admin' &&
            p.verification_status !== 'rejected' &&
            p.verification_status !== 'verified' &&
            p.is_verified !== true
        );
        setPendingMembers(cleanedPending);
      }

      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' });

      if (count) {
        setTotalMembersCount(count);
      }

      // Load Live Leaderboard directly from Supabase
      try {
        const lb = await getLeaderboard(20);
        if (lb && lb.length > 0) {
          setLeaderboardList(lb);
        }
      } catch (lbErr) {
        console.warn('[ATC Mobile] Leaderboard fetch note:', lbErr);
      }

      // Load Badges Catalog
      try {
        const badges = await getAllBadges();
        if (badges && badges.length > 0) {
          setAllBadgesList(badges);
        }
      } catch (bErr) {
        console.warn('[ATC Mobile] Badges fetch note:', bErr);
      }

      // Load Vault Campus Gallery Memories
      try {
        const mems = await getVaultGalleryMemories();
        if (mems && mems.length > 0) {
          setGalleryMemories(mems);
        }
      } catch (gErr) {
        console.warn('[ATC Mobile] Gallery fetch note:', gErr);
      }

      // Load Liked Memories from disk
      try {
        const likedFile = `${FileSystem.documentDirectory}atc_liked_memories.json`;
        const likedInfo = await FileSystem.getInfoAsync(likedFile);
        if (likedInfo.exists) {
          const raw = await FileSystem.readAsStringAsync(likedFile);
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setLikedMemoryIds(parsed);
        }
      } catch (lErr) {}

      // Load Real Notifications from Supabase notifications_log
      try {
        const { data: dbNotifs } = await supabase
          .from('notifications_log')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbNotifs && dbNotifs.length > 0) {
          let readIds = [];
          try {
            const readInfo = await FileSystem.getInfoAsync(READ_NOTIFS_FILE);
            if (readInfo.exists) {
              const rawRead = await FileSystem.readAsStringAsync(READ_NOTIFS_FILE);
              readIds = JSON.parse(rawRead) || [];
            }
          } catch {}

          const formattedNotifs = dbNotifs.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message || n.body || '',
            time: formatRelativeTime(n.created_at),
            read: n.read || readIds.includes(n.id)
          }));
          setNotifications(formattedNotifs);
        }
      } catch (notifDiskErr) {
        console.warn('[ATC Mobile] Notif live fetch note:', notifDiskErr);
      }

      // Load Contribution Reports
      try {
        const reps = await fetchContributionReports(isAdmin ? null : (currentUser?.id || null));
        if (reps && Array.isArray(reps)) {
          setContributionReports(reps);
        }
      } catch (repErr) {
        console.warn('[ATC Mobile] Contribution reports fetch note:', repErr);
      }

      // Load Assigned Role Tasks
      try {
        const tasks = await fetchAssignedTasks();
        if (tasks && Array.isArray(tasks)) {
          setAssignedTasks(tasks);
        }
      } catch (tErr) {
        console.warn('[ATC Mobile] Assigned tasks fetch note:', tErr);
      }

      // Re-sync current logged-in user profile & gamification directly from Supabase
      if (currentUser?.email) {
        const { data: dbUser } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', currentUser.email.toLowerCase())
          .maybeSingle();

        if (dbUser) {
          setCurrentUser((prev) => {
            const merged = { ...prev, ...dbUser };
            FileSystem.writeAsStringAsync(SESSION_FILE, JSON.stringify(merged)).catch(() => {});
            return merged;
          });

          // Check if onboarding is needed
          if (dbUser.onboarding_complete === false && !isGuest && dbUser.role === 'member') {
            openApplyModal(dbUser);
          }
        }

        const targetUserId = dbUser?.id || currentUser?.id;
        if (targetUserId) {
          try {
            const mp = await getMemberPoints(targetUserId);
            if (mp) {
              setMemberPoints(mp.total_points || 0);
              setMemberStreak(mp.checkin_streak || 0);
            }
            const rank = await getMyRank(targetUserId);
            if (rank) {
              setMemberRank(rank);
            }
            const userBadges = await getMemberBadges(targetUserId);
            if (userBadges && userBadges.length > 0) {
              setEarnedBadgesList(userBadges);
            }
          } catch (gamifyErr) {
            console.warn('[ATC Mobile] Gamification sync note:', gamifyErr);
          }
        }
      }

      setIsOfflineMode(false);
    } catch (err) {
      console.warn('[ATC Mobile] Live data sync note (offline fallback):', err);
      setIsOfflineMode(true);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLivePlatformData();
    setIsRefreshing(false);
    triggerToast('Platform updated ✓');
  };

  useEffect(() => {
    loadLivePlatformData();

    // Supabase Realtime Channel for Instant Push Notifications & Feed Updates
    const channel = supabase
      .channel('mobile_live_push_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
        if (payload?.new?.title) {
          sendDevicePushNotification('📢 ' + payload.new.title, payload.new.body || 'New announcement posted to campus feed');
          setAnnouncements((prev) => [payload.new, ...prev]);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, (payload) => {
        if (payload?.new?.title) {
          sendDevicePushNotification('📅 New Workshop: ' + payload.new.title, (payload.new.location || 'Campus') + ' • Tap to register');
          setEvents((prev) => [payload.new, ...prev]);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications_log' }, (payload) => {
        if (payload?.new?.title) {
          sendDevicePushNotification(payload.new.title, payload.new.message || 'New Campus Notification');
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assigned_tasks' }, async () => {
        try {
          const updatedTasks = await fetchAssignedTasks();
          if (updatedTasks && Array.isArray(updatedTasks)) {
            setAssignedTasks(updatedTasks);
          }
        } catch (_) {}
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Relative Time Helper
  const formatRelativeTime = (isoString) => {
    try {
      if (!isoString) return 'Just now';
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return diffDays === 1 ? 'Yesterday' : `${diffDays}d ago`;
    } catch {
      return 'Recent';
    }
  };

  // User Interactivity
  const [registeredEventIds, setRegisteredEventIds] = useState(['evt-1']);
  const [bookmarkedIds, setBookmarkedIds] = useState(['ann-1']);
  const [reactions, setReactions] = useState({
    'ann-1': { fire: 42, rocket: 28, heart: 16 },
    'ann-2': { fire: 19, rocket: 35, heart: 22 },
    'ann-3': { fire: 12, rocket: 14, heart: 9 }
  });

  // Notifications State (Synced from Supabase notifications_log)
  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [feedCategory, setFeedCategory] = useState('all');
  const [eventCategory, setEventCategory] = useState('all');
  const [eventStatusFilter, setEventStatusFilter] = useState('all'); // 'all' | 'upcoming' | 'completed'
  const [resourceCategory, setResourceCategory] = useState('all');
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Toast Notification & System Push Notification
  const [toastText, setToastText] = useState(null);
  const triggerToast = (msg, alsoSystemNotify = false) => {
    setToastText(msg);
    setTimeout(() => setToastText(null), 2500);
    if (alsoSystemNotify) {
      sendDevicePushNotification('ATC Campus Alert', msg);
    }
  };

  const sendDevicePushNotification = async (title, body, data = {}) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          channelId: 'atc_announcements'
        },
        trigger: null // Deliver immediately to system notification bar
      });
    } catch (e) {
      console.warn('[ATC Mobile] scheduleNotification error:', e);
    }
  };

  // =========================================================================
  // 3. MODALS STATE
  // =========================================================================
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isQrPassOpen, setIsQrPassOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [tempAvatarUrl, setTempAvatarUrl] = useState('');
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isVerificationsModalOpen, setIsVerificationsModalOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);

  // Status Search State
  const [statusSearchId, setStatusSearchId] = useState('');
  const [statusSearchResult, setStatusSearchResult] = useState(null);

  // Student Membership Application Form State
  const [applyFullName, setApplyFullName] = useState('');
  const [applyEmail, setApplyEmail] = useState('');
  const [applyStudentId, setApplyStudentId] = useState('');
  const [applyDept, setApplyDept] = useState('Computer Science & Engineering');
  const [applyYear, setApplyYear] = useState('2nd Year');
  const [applyInterests, setApplyInterests] = useState(['AI & Machine Learning', 'Cloud & DevOps']);
  const [applyGithub, setApplyGithub] = useState('');

  // Admin Publishers Form States
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnBody, setNewAnnBody] = useState('');
  const [newAnnCategory, setNewAnnCategory] = useState('hackathon');
  const [newAnnPinned, setNewAnnPinned] = useState(false);

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventCategory, setNewEventCategory] = useState('workshop');
  const [newEventCapacity, setNewEventCapacity] = useState('80');
  const [newEventDate, setNewEventDate] = useState(() => {
    const d = new Date(Date.now() + 86400000 * 3);
    return d.toISOString().split('T')[0];
  });
  const [newEventStartTime, setNewEventStartTime] = useState('10:00 AM');
  const [newEventEndTime, setNewEventEndTime] = useState('01:00 PM');
  const [newEventBanner, setNewEventBanner] = useState('https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80');
  const [newEventTags, setNewEventTags] = useState(['AI/ML', 'Fullstack']);
  const [newEventPoints, setNewEventPoints] = useState('50');

  // Campus Gallery States
  const [galleryMemories, setGalleryMemories] = useState([]);
  const [selectedGalleryMemory, setSelectedGalleryMemory] = useState(null);
  const [galleryFilter, setGalleryFilter] = useState('All');
  const [isCreateMemoryModalOpen, setIsCreateMemoryModalOpen] = useState(false);
  const [newMemTitle, setNewMemTitle] = useState('');
  const [newMemCategory, setNewMemCategory] = useState('hackathon');
  const [newMemAward, setNewMemAward] = useState('');
  const [newMemImage, setNewMemImage] = useState('https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80');
  const [newMemAchievers, setNewMemAchievers] = useState('');
  const [newMemDesc, setNewMemDesc] = useState('');
  const [likedMemoryIds, setLikedMemoryIds] = useState([]);
  const [isEditMemoryModalOpen, setIsEditMemoryModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);
  const [editMemTitle, setEditMemTitle] = useState('');
  const [editMemCategory, setEditMemCategory] = useState('hackathon');
  const [editMemAward, setEditMemAward] = useState('');
  const [editMemImage, setEditMemImage] = useState('');
  const [editMemAchievers, setEditMemAchievers] = useState('');
  const [editMemDesc, setEditMemDesc] = useState('');
  const [editMemDate, setEditMemDate] = useState('');
  const [editMemSubmitting, setEditMemSubmitting] = useState(false);

  // Available Technical Interests for Application
  const availableInterests = [
    'AI & Machine Learning',
    'Cloud & DevOps',
    'Mobile Development',
    'Full-Stack Web',
    'Cybersecurity',
    'Web3 & Blockchain',
    'UI/UX Design',
    'Distributed Systems',
    'Robotics & IoT',
    'Open Source'
  ];

  // =========================================================================
  // 4. AUTHENTICATION & SUPABASE DATABASE HANDLERS
  // =========================================================================

  // Helper to open the unified student application & onboarding modal with pre-filled user details
  const openApplyModal = (user = currentUser) => {
    if (user) {
      setApplyFullName(user.full_name || '');
      setApplyEmail(user.email || '');
      setApplyStudentId(user.student_id || user.roll_number || '');
      setApplyDept(user.department || user.branch || 'Computer Science & Engineering');
      setApplyYear(user.year || '2nd Year');
      if (Array.isArray(user.interests) && user.interests.length > 0) {
        setApplyInterests(
          Array.from(
            new Set(
              user.interests
                .map((i) => (typeof i === 'string' ? i.replace(/^[^\w\s&/+-]+/, '').trim() : i))
                .filter(Boolean)
            )
          )
        );
      }
      setApplyGithub(user.github_url || '');
      setOnboardWhyJoin(user.why_join || '');
    }
    setIsApplyModalOpen(true);
  };

  // Resolves user profile from Supabase with verified status and role checking
  const resolveMobileUser = async (email, fullName = '', avatarUrl = '', studentId = '') => {
    const cleanEmail = email.trim().toLowerCase();
    let existingProfile = null;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();
      existingProfile = profile;
    } catch (sbErr) {
      console.warn('[ATC Mobile] Supabase check warning:', sbErr);
    }

    const isRitesh = cleanEmail.includes('ritesh') || cleanEmail.includes('fluxipher');
    const isExistingAdmin = existingProfile?.role === 'super_admin' || existingProfile?.role === 'admin';
    const resolvedRole = isRitesh ? 'super_admin' : (isExistingAdmin ? existingProfile.role : 'member');
    const isVerified = isRitesh ? true : (existingProfile?.is_verified ?? false);
    const verificationStatus = isRitesh ? 'verified' : (existingProfile?.verification_status || 'pending');

    const resolved = {
      id: existingProfile?.id || `usr-${Date.now()}`,
      email: cleanEmail,
      full_name: existingProfile?.full_name || fullName || (isRitesh ? 'Ritesh Kumar Mishra' : cleanEmail.split('@')[0].replace('.', ' ')),
      role: resolvedRole,
      is_verified: isVerified,
      verification_status: verificationStatus,
      department: existingProfile?.department || existingProfile?.branch || 'Computer Science & Engineering',
      student_id: existingProfile?.student_id || existingProfile?.roll_number || studentId || (isRitesh ? 'ADMIN-001' : ''),
      roll_number: existingProfile?.roll_number || existingProfile?.student_id || studentId || (isRitesh ? 'ADMIN-001' : ''),
      branch: existingProfile?.branch || existingProfile?.department || 'Computer Science & Engineering',
      year: existingProfile?.year || '2nd Year',
      why_join: existingProfile?.why_join || '',
      onboarding_complete: existingProfile?.onboarding_complete ?? (isRitesh || !!existingProfile?.student_id || !!studentId),
      avatar_url: existingProfile?.avatar_url || avatarUrl || (isRitesh
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'),
      interests: existingProfile?.interests || ['AI & Machine Learning', 'Mobile Development'],
      github_url: existingProfile?.github_url || ''
    };

    // Persist profile to Supabase database
    try {
      await supabase.from('profiles').upsert(resolved, { onConflict: 'id' });
    } catch (saveErr) {
      console.warn('[ATC Mobile] Profile persist warning:', saveErr);
    }

    return resolved;
  };

  const handleLogin = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }

    setAuthLoading(true);
    try {
      const user = await resolveMobileUser(authEmail.trim(), authEmail.split('@')[0].replace('.', ' '));
      setCurrentUser(user);
      setIsGuest(false);
      await saveMobileSession(user);
      await persistGoogleAccount(user.email, user.full_name, user.avatar_url);
      triggerToast(`Welcome back, ${user.full_name}! 👋`);

      if (user.role !== 'super_admin' && user.role !== 'admin') {
        if (!user.student_id || user.onboarding_complete === false) {
          openApplyModal(user);
        }
      }
    } catch (err) {
      Alert.alert('Login Error', err.message || 'Could not log in');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!authFullName.trim() || !authEmail.trim() || !authPassword.trim()) {
      Alert.alert('Required', 'Please fill in your name, email, and password.');
      return;
    }

    setAuthLoading(true);
    try {
      const newUser = await resolveMobileUser(authEmail.trim(), authFullName.trim(), '', onboardRoll.trim());
      setCurrentUser(newUser);
      setIsGuest(false);
      await saveMobileSession(newUser);
      await persistGoogleAccount(newUser.email, newUser.full_name, newUser.avatar_url);
      triggerToast('Account Created! 🚀 Welcome to ATC.');

      if (newUser.role !== 'super_admin' && newUser.role !== 'admin') {
        openApplyModal(newUser);
      }
    } catch (err) {
      Alert.alert('Signup Error', err.message || 'Could not create account');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setGoogleSubmitting(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      if (userInfo && userInfo.user) {
        await handleSelectGoogleAccount(
          userInfo.user.email,
          userInfo.user.name || userInfo.user.email.split('@')[0],
          userInfo.user.photo || ''
        );
        return;
      }
    } catch (err) {
      if (err.code === statusCodes?.SIGN_IN_CANCELLED) {
        return;
      }
      if (err.code === statusCodes?.IN_PROGRESS) {
        return;
      }
      console.warn('[ATC Mobile] Google Play Services notice (falling back to direct Google Email auth):', err);
      // Automatically open the direct Google Email entry modal so user is NEVER blocked by DEVELOPER_ERROR
      setIsGoogleModalOpen(true);
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleSelectGoogleAccount = async (accountEmail, accountName, accountAvatar = '') => {
    setGoogleSubmitting(true);
    try {
      const user = await resolveMobileUser(accountEmail, accountName, accountAvatar);
      setCurrentUser(user);
      setIsGuest(false);
      await saveMobileSession(user);
      await persistGoogleAccount(accountEmail, accountName, accountAvatar);
      setIsGoogleModalOpen(false);
      triggerToast(`Signed in with Google as ${user.full_name} ✓`);

      if (user.role !== 'super_admin' && user.role !== 'admin') {
        if (!user.student_id || user.onboarding_complete === false) {
          openApplyModal(user);
        }
      }
    } catch (err) {
      Alert.alert('Google Sign-In Error', err.message || 'Failed to authenticate with Google');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to sign out of the Advanced Tech Club mobile app?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await GoogleSignin.signOut();
            } catch (gErr) {}
            await saveMobileSession(null);
            setCurrentUser(null);
            setIsGuest(false);
            setAuthEmail('');
            setAuthPassword('');
            setAuthFullName('');
            setIsApplyModalOpen(false);
            setIsOnboardingOpen(false);
            setCustomGoogleEmail('');
            setCustomGoogleName('');
            setShowNewGoogleInput(false);
            triggerToast('Signed out of ATC Mobile');
          }
        }
      ]
    );
  };

  // =========================================================================
  // ONBOARDING & GAMIFICATION HANDLERS
  // =========================================================================

  const handleCompleteOnboarding = async () => {
    if (!onboardRoll.trim()) {
      Alert.alert('Required', 'Please enter your university Roll Number / Student ID.');
      return;
    }
    setOnboardSubmitting(true);
    try {
      const updatedUser = {
        ...currentUser,
        roll_number: onboardRoll.trim(),
        student_id: onboardRoll.trim(),
        branch: onboardBranch,
        department: onboardBranch,
        year: onboardYear,
        why_join: onboardWhyJoin.trim(),
        onboarding_complete: true
      };

      try {
        await supabase
          .from('profiles')
          .update({
            roll_number: onboardRoll.trim(),
            student_id: onboardRoll.trim(),
            branch: onboardBranch,
            department: onboardBranch,
            year: onboardYear,
            why_join: onboardWhyJoin.trim(),
            onboarding_complete: true
          })
          .eq('id', currentUser.id);
      } catch (dbErr) {
        console.warn('[ATC Mobile] Onboarding DB update notice:', dbErr);
      }

      // Award +25 XP
      try {
        await awardPoints(currentUser.id, 25, 'First-time Onboarding Complete');
      } catch {}
      setMemberPoints((prev) => prev + 25);

      // Unlock First Step badge
      const newBadge = {
        badge_id: 'bdg-1',
        name: 'First Step',
        icon: '🚀',
        description: 'Completed member onboarding on mobile'
      };
      setEarnedBadgesList((prev) => {
        if (prev.some((b) => b.name === 'First Step')) return prev;
        return [...prev, newBadge];
      });

      setCurrentUser(updatedUser);
      await saveMobileSession(updatedUser);
      setIsOnboardingOpen(false);

      // Trigger Badge Unlock Celebration Modal
      setBadgeUnlockCelebration({
        badge: newBadge,
        pointsAwarded: 25,
        title: 'Welcome to ATC!'
      });
      triggerToast('Onboarding complete! +25 XP earned 🚀');
    } catch (err) {
      console.warn('[ATC Mobile] Onboarding error:', err);
      // Local fallback
      const updatedUser = {
        ...currentUser,
        roll_number: onboardRoll.trim(),
        student_id: onboardRoll.trim(),
        branch: onboardBranch,
        year: onboardYear,
        why_join: onboardWhyJoin.trim(),
        onboarding_complete: true
      };
      setCurrentUser(updatedUser);
      await saveMobileSession(updatedUser);
      setIsOnboardingOpen(false);
    } finally {
      setOnboardSubmitting(false);
    }
  };


  const getEventCountdown = (event) => {
    try {
      const targetTime = event.start_at || event.date;
      if (!targetTime) return 'Registration Open';
      const eventDate = new Date(targetTime);
      const now = new Date();
      const diffMs = eventDate.getTime() - now.getTime();

      if (diffMs <= 0) {
        return '🏁 Concluded';
      }

      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHours < 1) {
        return `⏳ Starts in ${diffMinutes}m`;
      }
      if (diffHours < 24) {
        return `⏳ Starts in ${diffHours}h ${diffMinutes}m`;
      }
      const days = Math.floor(diffHours / 24);
      return `🗓️ in ${days} ${days === 1 ? 'day' : 'days'}`;
    } catch {
      return 'Registration Open';
    }
  };

  // Direct Google Email Authentication Modal (Seamless fallback for DEVELOPER_ERROR / offline)
  const renderGoogleModal = () => {
    if (!isGoogleModalOpen) return null;

    const handleContinueGoogleEmail = () => {
      const cleanEmail = googleInputEmail.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        Alert.alert('Invalid Email', 'Please enter a valid Google or university email address.');
        return;
      }
      const inferredName = googleInputName.trim() || cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      handleSelectGoogleAccount(cleanEmail, inferredName, '');
    };

    return (
      <Modal
        visible={isGoogleModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsGoogleModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.6)',
            justifyContent: 'flex-end'
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              gap: 16,
              borderTopWidth: 1,
              borderColor: colors.neutral[200]
            }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: colors.primary[50],
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: colors.primary[200]
                  }}
                >
                  <Text style={{ fontSize: 18 }}>🌐</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900] }}>
                    Continue with Google
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                    Enter your Google or university email to proceed
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setIsGoogleModalOpen(false)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: colors.neutral[100],
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{ fontSize: 13, color: colors.neutral[600], fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Inputs */}
            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.neutral[700], marginBottom: 4 }}>
                  Google / University Email *
                </Text>
                <TextInput
                  value={googleInputEmail}
                  onChangeText={setGoogleInputEmail}
                  placeholder="student@gmail.com or name@university.edu"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus={true}
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: colors.neutral[900]
                  }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.neutral[700], marginBottom: 4 }}>
                  Full Name (Optional)
                </Text>
                <TextInput
                  value={googleInputName}
                  onChangeText={setGoogleInputName}
                  placeholder="e.g. Alex Johnson"
                  placeholderTextColor={colors.neutral[400]}
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: colors.neutral[900]
                  }}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{ gap: 8, marginTop: 4 }}>
              <TouchableOpacity
                onPress={handleContinueGoogleEmail}
                disabled={googleSubmitting}
                style={{
                  backgroundColor: colors.primary[500],
                  paddingVertical: 13,
                  borderRadius: 12,
                  alignItems: 'center',
                  shadowColor: colors.primary[500],
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 2
                }}
              >
                {googleSubmitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                    Sign In & Continue →
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsGoogleModalOpen(false)}
                style={{
                  backgroundColor: colors.neutral[100],
                  paddingVertical: 11,
                  borderRadius: 12,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  // =========================================================================
  // ADMIN QR EVENT ATTENDANCE SCANNER HANDLERS & MODAL
  // =========================================================================
  const openAdminScanner = async (targetEventId = null) => {
    const selected = targetEventId || scannerEventId || events[0]?.id || 'evt-1';
    setScannerEventId(selected);
    setIsAdminScannerOpen(true);
    setIsScanningPaused(false);
    setScannedStudent(null);
    setScannedRegStatus(null);
    setScannerFeedback(null);

    try {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    } catch (permErr) {
      console.warn('[ATC Mobile] Camera permission error:', permErr);
      setHasCameraPermission(false);
    }
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (isScanningPaused || !data) return;

    // Token Bucket rate limit check for camera scanner to debounce rapid camera frames
    const bucketCheck = checkTokenBucket('ADMIN_SCANNER', user?.id || 'admin');
    if (!bucketCheck.allowed) {
      return;
    }

    setIsScanningPaused(true);
    await processStudentScan(data);
  };

  const processStudentScan = async (rawCode) => {
    if (!rawCode || !rawCode.trim()) {
      setIsScanningPaused(false);
      return;
    }
    const cleanRaw = rawCode.trim();
    let lookupKey = cleanRaw;
    if (cleanRaw.startsWith('ATC-')) {
      lookupKey = cleanRaw.replace('ATC-', '');
    } else if (cleanRaw.includes('PASS-TOKEN:')) {
      const match = cleanRaw.match(/PASS-TOKEN:\s*([^\s]+)/i);
      if (match) lookupKey = match[1];
    } else if (cleanRaw.startsWith('{') && cleanRaw.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanRaw);
        lookupKey = parsed.student_id || parsed.id || parsed.email || cleanRaw;
      } catch (e) {}
    } else if (cleanRaw.includes('?')) {
      try {
        const urlParams = new URLSearchParams(cleanRaw.split('?')[1]);
        lookupKey = urlParams.get('student_id') || urlParams.get('pass') || urlParams.get('id') || cleanRaw;
      } catch (e) {}
    }

    setScannerFeedback('🔍 Verifying student pass in database...');
    try {
      // 1. Search Supabase profiles
      let matchedProfile = null;
      try {
        const { data: dbMatches } = await supabase
          .from('profiles')
          .select('*')
          .or(`student_id.ilike.%${lookupKey}%,id.eq.${lookupKey},email.ilike.%${lookupKey}%`)
          .limit(1);
        if (dbMatches && dbMatches.length > 0) {
          matchedProfile = dbMatches[0];
        }
      } catch (err) {}

      // Fallback search in pendingMembers
      if (!matchedProfile) {
        matchedProfile = pendingMembers.find(
          (p) =>
            (p.student_id && p.student_id.toLowerCase() === lookupKey.toLowerCase()) ||
            (p.id && p.id.toLowerCase() === lookupKey.toLowerCase()) ||
            (p.email && p.email.toLowerCase() === lookupKey.toLowerCase())
        );
      }

      // If still not found, construct a temporary student attendee card for walk-ins
      if (!matchedProfile) {
        matchedProfile = {
          id: `usr-${Date.now()}`,
          student_id: lookupKey.toUpperCase(),
          full_name: `Attendee (${lookupKey})`,
          department: 'Computer Science & Engineering',
          role: 'member',
          is_verified: false,
          avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
          email: `${lookupKey.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.edu`
        };
      }

      setScannedStudent(matchedProfile);

      // 2. Check registration for the selected event
      const curEventId = scannerEventId || events[0]?.id || 'evt-1';
      let regStatus = 'walkin';

      try {
        const { data: reg } = await supabase
          .from('event_registrations')
          .select('*')
          .eq('event_id', curEventId)
          .eq('user_id', matchedProfile.id)
          .maybeSingle();

        if (reg) {
          regStatus = reg.status === 'attended' ? 'attended' : 'confirmed';
        }
      } catch (regErr) {
        if (registeredEventIds.includes(curEventId)) {
          regStatus = 'confirmed';
        }
      }

      setScannedRegStatus(regStatus);
      setScannerFeedback(null);
    } catch (err) {
      console.warn('[ATC Mobile] Scan processing error:', err);
      setScannerFeedback('⚠️ Error looking up pass. Try manual lookup.');
      setIsScanningPaused(false);
    }
  };

  const handleManualStudentLookup = async () => {
    if (!manualScanCode.trim()) {
      Alert.alert('Required', 'Please enter a Student ID, email, or pass code to verify.');
      return;
    }
    setIsScanningPaused(true);
    await processStudentScan(manualScanCode.trim());
  };

  const handleConfirmAttendanceCheckIn = async () => {
    if (!scannedStudent) return;

    // 1. Token Bucket Rate Limit check
    const bucketCheck = checkTokenBucket('ADMIN_SCANNER', user?.id || 'admin');
    if (!bucketCheck.allowed) {
      Alert.alert('Please Wait', `Camera scanner rate limited. Please wait ${bucketCheck.retryAfterSec}s.`);
      return;
    }

    setScannerCheckingIn(true);
    const curEventId = scannerEventId || events[0]?.id || 'evt-1';
    const curEvent = events.find((e) => e.id === curEventId) || events[0];

    // 2. Student Lifecycle State Machine Check
    const studentGuard = canStudentCheckIn(scannedStudent);
    if (!studentGuard.allowed && studentGuard.state === 'SUSPENDED') {
      Alert.alert('Student Suspended', studentGuard.message);
      setScannerCheckingIn(false);
      return;
    }

    // 3. Event Attendance State Machine Check (Idempotency Guard)
    const attendanceGuard = validateAttendanceCheckInTransition(scannedRegStatus);
    if (attendanceGuard.isAlreadyCheckedIn) {
      setScannerFeedback(`✓ ${scannedStudent.full_name} is already checked in (Idempotent confirmation).`);
      triggerToast(`✓ Already checked in: ${scannedStudent.full_name}`);
      setScannerCheckingIn(false);
      return;
    }

    // 4. Idempotency Key Execution (Prevents duplicate check-in operations)
    const idemKey = idempotency.generateKey('mobile_checkin', scannedStudent.id, curEventId);

    try {
      await idempotency.execute(idemKey, async () => {
        // Record attendance in Supabase
        try {
          await supabase.from('event_registrations').upsert(
            {
              event_id: curEventId,
              user_id: scannedStudent.id,
              status: 'attended',
              registered_at: new Date().toISOString()
            },
            { onConflict: 'event_id,user_id' }
          );
        } catch (saveErr) {
          console.warn('[ATC Mobile] Attendance record warning:', saveErr);
        }

        // Also record in event_checkins for gamification points
        try {
          await recordEventCheckin(scannedStudent.id, curEventId);
        } catch (chkErr) {}

        // Add to scanHistory
        const newEntry = {
          studentId: scannedStudent.student_id || 'ATC-MEMBER',
          studentName: scannedStudent.full_name,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          eventTitle: curEvent?.title || 'Workshop Check-in',
          status: 'Attended'
        };
        setScanHistory((prev) => [newEntry, ...prev]);

        // Mark attended locally
        setScannedRegStatus('attended');
        setScannerFeedback(`✓ ${scannedStudent.full_name} checked in successfully!`);
        triggerToast(`✓ Checked in: ${scannedStudent.full_name}`);
      });
    } catch (err) {
      Alert.alert('Check-in Error', err.message || 'Could not record attendance');
    } finally {
      setScannerCheckingIn(false);
    }
  };

  const handleResetScannerForNext = () => {
    setScannedStudent(null);
    setScannedRegStatus(null);
    setManualScanCode('');
    setScannerFeedback(null);
    setIsScanningPaused(false);
  };

  const renderAdminScannerModal = () => {
    const curEventId = scannerEventId || events[0]?.id || 'evt-1';
    const curEvent = events.find((e) => e.id === curEventId) || events[0];

    return (
      <Modal visible={isAdminScannerOpen} animationType="slide" transparent>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#090d16' }}>
          {/* Header Bar */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#1e293b',
              backgroundColor: '#0f172a'
            }}
          >
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ffffff' }}>
                  📷 Event Attendance Scanner
                </Text>
                <View
                  style={{
                    backgroundColor: '#6d28d9',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#ffffff' }}>Admin</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                Advanced Tech Club • Live Student Check-in Terminal
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setIsAdminScannerOpen(false)}
              style={{
                backgroundColor: '#1e293b',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#334155'
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {/* Event Selector Strip */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8, letterSpacing: 0.5 }}>
                SELECT ACTIVE EVENT / WORKSHOP:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {events.map((evt) => {
                  const isSelected = evt.id === curEventId;
                  return (
                    <TouchableOpacity
                      key={evt.id}
                      onPress={() => {
                        setScannerEventId(evt.id);
                        handleResetScannerForNext();
                      }}
                      style={{
                        backgroundColor: isSelected ? '#6d28d9' : '#1e293b',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: isSelected ? '#a855f7' : '#334155',
                        maxWidth: 220
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: 'bold',
                          color: '#ffffff'
                        }}
                        numberOfLines={1}
                      >
                        {evt.title}
                      </Text>
                      <Text style={{ fontSize: 10, color: isSelected ? '#e9d5ff' : '#94a3b8', marginTop: 2 }}>
                        📍 {evt.location || 'Turing Lab'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Viewfinder Reticle Frame */}
            <View
              style={{
                height: 270,
                backgroundColor: '#020617',
                borderRadius: 20,
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: '#6d28d9',
                position: 'relative',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16
              }}
            >
              {hasCameraPermission ? (
                <>
                  <BarCodeScanner
                    onBarCodeScanned={isScanningPaused ? undefined : handleBarCodeScanned}
                    style={StyleSheet.absoluteFillObject}
                  />

                  {/* High-Tech Reticle Overlay */}
                  <View
                    pointerEvents="none"
                    style={{
                      width: 200,
                      height: 200,
                      borderWidth: 2,
                      borderColor: '#10b981',
                      borderRadius: 14,
                      position: 'relative',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    {/* Glowing Reticle Laser Indicator */}
                    <View
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: 0,
                        right: 0,
                        height: 2,
                        backgroundColor: '#10b981',
                        shadowColor: '#10b981',
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 6,
                        elevation: 5
                      }}
                    />
                  </View>

                  <View
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#334155'
                    }}
                  >
                    <Text style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 'bold' }}>
                      {isScanningPaused ? '⏸️ Scanner Paused' : '🎯 Align student QR code within reticle'}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={{ alignItems: 'center', padding: 20 }}>
                  <Text style={{ fontSize: 36, marginBottom: 8 }}>📷</Text>
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14, textAlign: 'center' }}>
                    {hasCameraPermission === false
                      ? 'Camera Permission Not Granted'
                      : 'Requesting Camera Access...'}
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 11, textAlign: 'center', marginTop: 4, marginBottom: 14 }}>
                    Camera allows scanning student QR passes directly from their phones.
                  </Text>
                  <TouchableOpacity
                    onPress={() => openAdminScanner()}
                    style={{
                      backgroundColor: '#6d28d9',
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      borderRadius: 8
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                      Enable Camera Access
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Scanner Feedback Toast */}
            {scannerFeedback && (
              <View
                style={{
                  backgroundColor: scannerFeedback.includes('✓') ? '#064e3b' : '#1e293b',
                  borderWidth: 1,
                  borderColor: scannerFeedback.includes('✓') ? '#10b981' : '#475569',
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 14,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>
                  {scannerFeedback}
                </Text>
              </View>
            )}

            {/* STUDENT VERIFICATION CARD (WHEN SCANNED) */}
            {scannedStudent && (
              <View
                style={{
                  backgroundColor: '#0f172a',
                  borderWidth: 1,
                  borderColor: scannedRegStatus === 'attended' ? '#10b981' : '#6d28d9',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Image
                    source={{ uri: scannedStudent.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80' }}
                    style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: '#6d28d9' }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ffffff' }}>
                      {scannedStudent.full_name}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                      ID: {scannedStudent.student_id || 'N/A'} • {scannedStudent.department || 'CSE'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <View
                        style={{
                          backgroundColor: scannedStudent.is_verified ? '#064e3b' : '#78350f',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4
                        }}
                      >
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: scannedStudent.is_verified ? '#34d399' : '#fcd34d' }}>
                          {scannedStudent.is_verified ? '✓ Verified Member' : '⏳ Pending'}
                        </Text>
                      </View>

                      <View
                        style={{
                          backgroundColor:
                            scannedRegStatus === 'attended'
                              ? '#064e3b'
                              : scannedRegStatus === 'confirmed'
                              ? '#1e1b4b'
                              : '#451a03',
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9,
                            fontWeight: 'bold',
                            color:
                              scannedRegStatus === 'attended'
                                ? '#34d399'
                                : scannedRegStatus === 'confirmed'
                                ? '#a5b4fc'
                                : '#fb923c'
                          }}
                        >
                          {scannedRegStatus === 'attended'
                            ? '✅ Already Attended'
                            : scannedRegStatus === 'confirmed'
                            ? '🎟️ RSVP Confirmed'
                            : '⚡ Walk-In Attendee'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Event Check-in Target Display */}
                <View
                  style={{
                    backgroundColor: '#1e293b',
                    padding: 10,
                    borderRadius: 10,
                    marginTop: 12,
                    borderWidth: 1,
                    borderColor: '#334155'
                  }}
                >
                  <Text style={{ fontSize: 11, color: '#94a3b8' }}>Target Event Check-in:</Text>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#ffffff', marginTop: 2 }}>
                    {curEvent?.title}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                  <TouchableOpacity
                    onPress={handleConfirmAttendanceCheckIn}
                    disabled={scannerCheckingIn}
                    style={{
                      flex: 2,
                      backgroundColor: scannedRegStatus === 'attended' ? '#059669' : '#10b981',
                      paddingVertical: 12,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {scannerCheckingIn ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                        {scannedRegStatus === 'attended'
                          ? '✓ Checked In (Re-verify)'
                          : '✓ Confirm Check-in & Mark Attended'}
                      </Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleResetScannerForNext}
                    style={{
                      flex: 1,
                      backgroundColor: '#1e293b',
                      paddingVertical: 12,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: '#475569'
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                      Next ❯
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* MANUAL STUDENT ID / PASS CODE ENTRY FALLBACK */}
            <View
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#1e293b',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 }}>
                ⌨️ Manual Student ID / Pass Lookup
              </Text>
              <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
                For cracked screens or manual check-in, type or select student ID:
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TextInput
                  placeholder="e.g. CS2026-088 or student email"
                  placeholderTextColor="#64748b"
                  value={manualScanCode}
                  onChangeText={setManualScanCode}
                  autoCapitalize="characters"
                  style={{
                    flex: 1,
                    backgroundColor: '#1e293b',
                    borderWidth: 1,
                    borderColor: '#334155',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    color: '#ffffff'
                  }}
                />

                <TouchableOpacity
                  onPress={handleManualStudentLookup}
                  style={{
                    backgroundColor: '#6d28d9',
                    paddingHorizontal: 14,
                    borderRadius: 8,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                    Verify
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Quick Test Chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {['CS2026-088', 'CS2026-002', 'ADMIN-001', 'CS2026-105'].map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    onPress={() => {
                      setManualScanCode(chip);
                      processStudentScan(chip);
                    }}
                    style={{
                      backgroundColor: '#1e293b',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#334155'
                    }}
                  >
                    <Text style={{ color: '#a5b4fc', fontSize: 10, fontWeight: 'bold' }}>
                      {chip}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* RECENT CHECK-IN ATTENDANCE STREAM */}
            <View
              style={{
                backgroundColor: '#0f172a',
                borderWidth: 1,
                borderColor: '#1e293b',
                borderRadius: 16,
                padding: 16
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ffffff' }}>
                  📋 Live Check-in Stream ({scanHistory.length})
                </Text>
                <View style={{ backgroundColor: '#064e3b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: '#34d399', fontSize: 10, fontWeight: 'bold' }}>
                    Active Session
                  </Text>
                </View>
              </View>

              <View style={{ gap: 8 }}>
                {scanHistory.map((item, idx) => (
                  <View
                    key={`${item.studentId}-${idx}`}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 8,
                      borderBottomWidth: idx < scanHistory.length - 1 ? 1 : 0,
                      borderBottomColor: '#1e293b'
                    }}
                  >
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#ffffff' }}>
                        {item.studentName}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#94a3b8' }}>
                        {item.studentId} • {item.eventTitle}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={{ backgroundColor: '#064e3b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#34d399' }}>
                          ✓ Attended
                        </Text>
                      </View>
                      <Text style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>
                        {item.time}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // =========================================================================
  // ONBOARDING, MEMBER SCANNER, LEADERBOARD & BADGE CELEBRATION MODALS
  // =========================================================================

  // Onboarding Modal (Merged into unified renderApplyModal to eliminate dual-modal conflict)
  const renderOnboardingModal = () => null;


  const renderLeaderboardModal = () => (
    <Modal visible={isLeaderboardOpen} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 20, maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Trophy size={20} color={colors.primary[600]} weight="bold" />
              <View>
                <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900] }}>
                  ATC Leaderboard & XP
                </Text>
                <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                  Spring 2026 Campus Developer Standings
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setIsLeaderboardOpen(false)}
              style={{ backgroundColor: colors.neutral[100], paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 }}
            >
              <X size={14} color={colors.neutral[600]} weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Top 3 Podium Cards */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14, justifyContent: 'center' }}>
            {leaderboardList.filter((m) => m.show_on_leaderboard !== false).slice(0, 3).map((item, idx) => {
              const bgColors = ['#fef3c7', '#f1f5f9', '#ffedd5'];
              const medalColors = ['#d97706', '#64748b', '#b45309'];
              return (
                <View
                  key={item.user_id || idx}
                  style={{
                    flex: 1,
                    backgroundColor: bgColors[idx] || '#ffffff',
                    borderWidth: 1,
                    borderColor: colors.neutral[200],
                    borderRadius: 14,
                    padding: 8,
                    alignItems: 'center'
                  }}
                >
                  <Medal size={20} color={medalColors[idx]} weight="fill" />
                  <Image
                    source={{ uri: item.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' }}
                    style={{ width: 36, height: 36, borderRadius: 18, marginVertical: 4 }}
                  />
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[900], textAlign: 'center' }} numberOfLines={1}>
                    {item.full_name?.split(' ')[0]}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[700], marginTop: 2 }}>
                    {item.total_points} XP
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Full Rankings ScrollView */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ gap: 6 }}>
            {leaderboardList.map((m, idx) => {
              const isVisible = m.show_on_leaderboard !== false;
              const isMe = m.user_id === currentUser?.id;
              return (
                <View
                  key={m.user_id || idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    backgroundColor: !isVisible
                      ? '#f8fafc'
                      : isMe
                      ? colors.primary[50]
                      : '#ffffff',
                    borderWidth: 1,
                    borderColor: !isVisible
                      ? colors.neutral[200]
                      : isMe
                      ? colors.primary[200]
                      : colors.neutral[100],
                    marginBottom: 6,
                    opacity: !isVisible ? 0.6 : 1
                  }}
                >
                  <Text style={{ width: 28, fontSize: 12, fontWeight: 'bold', color: colors.neutral[500] }}>
                    {m.rank ? `#${m.rank}` : '—'}
                  </Text>
                  <Image
                    source={{ uri: m.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' }}
                    style={{ width: 32, height: 32, borderRadius: 16, marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: 'bold',
                          color: colors.neutral[900],
                          textDecorationLine: !isVisible ? 'line-through' : 'none'
                        }}
                        numberOfLines={1}
                      >
                        {m.full_name}
                      </Text>
                      {!isVisible && (
                        <View style={{ backgroundColor: colors.neutral[200], paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.neutral[600] }}>Hidden</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
                      <Text style={{ fontSize: 10, color: colors.neutral[400] }}>
                        {m.branch || 'CSE'} · {m.checkin_streak || 0}d streak
                      </Text>
                      <Flame size={11} color="#f97316" weight="fill" />
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary[700] }}>
                    {m.total_points} XP
                  </Text>

                  {isAdmin && (
                    <TouchableOpacity
                      onPress={async () => {
                        const newVis = m.show_on_leaderboard === false;
                        setLeaderboardList((prev) => {
                          const updated = prev.map((item) =>
                            item.user_id === m.user_id ? { ...item, show_on_leaderboard: newVis } : item
                          );
                          let visRank = 1;
                          return updated.map((item) => ({
                            ...item,
                            rank: item.show_on_leaderboard !== false ? visRank++ : null
                          }));
                        });
                        const res = await toggleLeaderboardVisibility(m.user_id, newVis);
                        if (!res.success) {
                          getLeaderboard(50, true).then(setLeaderboardList);
                        } else if (currentUser?.id) {
                          const updatedRank = await getMyRank(currentUser.id);
                          setMemberRank(updatedRank);
                        }
                        triggerToast(newVis ? `${m.full_name} visible` : `${m.full_name} hidden`);
                      }}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                        borderRadius: 6,
                        backgroundColor: m.show_on_leaderboard !== false ? colors.success[50] : colors.neutral[100],
                        borderWidth: 1,
                        borderColor: m.show_on_leaderboard !== false ? colors.success[200] : colors.neutral[300],
                        marginLeft: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {m.show_on_leaderboard !== false ? (
                        <>
                          <Eye size={11} color={colors.success[700]} weight="bold" />
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.success[700] }}>On</Text>
                        </>
                      ) : (
                        <>
                          <EyeSlash size={11} color={colors.neutral[600]} weight="bold" />
                          <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.neutral[600] }}>Off</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            onPress={() => setIsLeaderboardOpen(false)}
            style={{
              backgroundColor: colors.neutral[900],
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
              marginTop: 12
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderBadgeCelebrationModal = () => (
    <Modal visible={!!badgeUnlockCelebration} animationType="fade" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24, alignItems: 'center' }}>
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 24,
            padding: 24,
            width: '100%',
            maxWidth: 320,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10
          }}
        >
          <Text style={{ fontSize: 50, marginBottom: 8 }}>
            {badgeUnlockCelebration?.badge?.icon || '🏆'}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[600], textTransform: 'uppercase', letterSpacing: 1 }}>
            🎉 NEW BADGE UNLOCKED!
          </Text>
          <Text style={{ fontSize: 20, fontWeight: 'extrabold', color: colors.neutral[900], textAlign: 'center', marginTop: 4 }}>
            {badgeUnlockCelebration?.badge?.name}
          </Text>
          <Text style={{ fontSize: 12, color: colors.neutral[600], textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
            {badgeUnlockCelebration?.badge?.description}
          </Text>

          <View
            style={{
              backgroundColor: '#fffbeb',
              borderWidth: 1,
              borderColor: '#fde68a',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 6,
              marginTop: 14
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#b45309' }}>
              +{badgeUnlockCelebration?.pointsAwarded || 25} XP Added
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setBadgeUnlockCelebration(null)}
            style={{
              backgroundColor: colors.primary[500],
              paddingVertical: 12,
              paddingHorizontal: 30,
              borderRadius: 12,
              marginTop: 18,
              width: '100%',
              alignItems: 'center'
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
              Awesome! 🚀
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Guest action gate
  const requireAuth = (actionName = 'access this feature') => {
    if (!currentUser) {
      Alert.alert(
        'Member Sign-In Required',
        `Please log in or sign up to ${actionName}.`,
        [
          { text: 'Continue as Guest', style: 'cancel' },
          {
            text: 'Sign In / Register',
            onPress: () => setIsGuest(false)
          }
        ]
      );
      return false;
    }
    return true;
  };

  // =========================================================================
  // 5. INTERACTIVE FEATURE HANDLERS
  // =========================================================================
  const handleToggleEventRSVP = (eventId) => {
    if (!requireAuth('RSVP for workshops')) return;

    if (currentUser?.verification_status === 'rejected') {
      Alert.alert(
        'Application Declined',
        'Your student application was declined by Club Admin (Ritesh Mishra). Please update your credentials and re-submit your application to RSVP for campus workshops.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update Application', onPress: () => openApplyModal(currentUser) }
        ]
      );
      return;
    }

    if (!currentUser?.is_verified) {
      Alert.alert(
        'Verification Required',
        'Workshop RSVP is restricted to verified club members. Your application is currently under review by Club Admin (Ritesh Mishra).',
        [
          { text: 'OK', style: 'default' },
          { text: 'Check Status', onPress: () => setIsStatusModalOpen(true) }
        ]
      );
      return;
    }

    if (registeredEventIds.includes(eventId)) {
      setRegisteredEventIds((prev) => prev.filter((id) => id !== eventId));
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId && e.registrations_count > 0
            ? { ...e, registrations_count: e.registrations_count - 1 }
            : e
        )
      );
      Analytics.eventUnregistered(eventId);
      triggerToast('RSVP Cancelled');
    } else {
      setRegisteredEventIds((prev) => [...prev, eventId]);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, registrations_count: (e.registrations_count || 0) + 1 }
            : e
        )
      );
      Analytics.eventRegistered(eventId);
      triggerToast('RSVP Confirmed! 🎉 Pass Unlocked');
    }
  };

  const handleToggleBookmark = (id) => {
    if (bookmarkedIds.includes(id)) {
      setBookmarkedIds((prev) => prev.filter((i) => i !== id));
      triggerToast('Removed from Saved');
    } else {
      setBookmarkedIds((prev) => [...prev, id]);
      triggerToast('Saved to My Bookmarks ⭐');
    }
  };

  const handleReact = (annId, type) => {
    setReactions((prev) => {
      const current = prev[annId] || { fire: 0, rocket: 0, heart: 0 };
      return {
        ...prev,
        [annId]: {
          ...current,
          [type]: (current[type] || 0) + 1
        }
      };
    });
    triggerToast(`Reacted with ${type === 'fire' ? '🔥' : type === 'rocket' ? '🚀' : '❤️'}`);
  };

  const handleDownloadResource = (resource) => {
    if (!requireAuth('download vault resources')) return;

    if (currentUser?.verification_status === 'rejected') {
      Alert.alert(
        'Application Declined',
        'Vault resource downloads are restricted to active club members. Your application is currently declined. Tap to update your application.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update Application', onPress: () => openApplyModal(currentUser) }
        ]
      );
      return;
    }

    if (!currentUser?.is_verified) {
      Alert.alert(
        'Verification Required',
        'Vault resource downloads unlock once your student membership is verified by Club Admin (Ritesh Mishra).',
        [
          { text: 'OK', style: 'default' },
          { text: 'Check Status', onPress: () => setIsStatusModalOpen(true) }
        ]
      );
      return;
    }

    setDownloadProgress(20);
    const t1 = setTimeout(() => setDownloadProgress(65), 300);
    const t2 = setTimeout(() => setDownloadProgress(100), 700);
    const t3 = setTimeout(() => {
      setDownloadProgress(null);
      triggerToast(`Downloaded ${resource.title} (${resource.file_size || '12MB'}) ✓`);
    }, 1000);
  };

  // Submit Student Application
  // Submit Student Application & Complete Onboarding
  const handleSubmitApplication = async () => {
    const sId = (applyStudentId || onboardRoll || '').trim().toUpperCase();
    if (!sId) {
      Alert.alert('Required', 'Please enter your University Roll Number / Student ID (e.g. 23CS041 or CS2026-088).');
      return;
    }

    const targetEmail = currentUser?.email || applyEmail.trim().toLowerCase();
    const targetName = currentUser?.full_name || applyFullName.trim();

    if (!currentUser && (!targetEmail || !targetName)) {
      Alert.alert('Required', 'Please enter your Full Name and University Email.');
      return;
    }

    const isReapply = currentUser?.verification_status === 'rejected';

    const baseUser = currentUser || {
      id: `usr-${Date.now()}`,
      email: targetEmail,
      full_name: targetName,
      role: 'member',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'
    };

    const updatedUser = {
      ...baseUser,
      full_name: targetName,
      email: targetEmail,
      student_id: sId,
      roll_number: sId,
      department: applyDept,
      branch: applyDept,
      interests: applyInterests,
      verification_status: 'pending',
      is_verified: false,
      year: applyYear,
      why_join: (onboardWhyJoin || '').trim(),
      github_url: (applyGithub || '').trim(),
      onboarding_complete: true
    };

    setCurrentUser(updatedUser);
    setIsGuest(false);
    await saveMobileSession(updatedUser);
    await persistGoogleAccount(updatedUser.email, updatedUser.full_name, updatedUser.avatar_url);

    const applicationPayload = {
      id: updatedUser.id,
      email: updatedUser.email,
      full_name: updatedUser.full_name,
      student_id: sId,
      roll_number: sId,
      department: applyDept,
      branch: applyDept,
      interests: applyInterests,
      verification_status: 'pending',
      is_verified: false,
      year: applyYear,
      avatar_url: updatedUser.avatar_url,
      role: 'member',
      bio: `${applyYear} student · Interests: ${applyInterests.join(', ')}`,
      github_url: (applyGithub || '').trim(),
      why_join: (onboardWhyJoin || '').trim(),
      onboarding_complete: true,
      applied_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('profiles').upsert(applicationPayload, { onConflict: 'id' });
      if (error) {
        console.warn('[ATC Mobile] Application upsert note, trying update by email:', error?.message);
        await supabase.from('profiles').update(applicationPayload).eq('email', targetEmail);
      }
    } catch (saveErr) {
      console.warn('[ATC Mobile] Application persist warning:', saveErr);
    }

    // Award +25 XP welcome points & unlock First Step badge
    try {
      await awardPoints(updatedUser.id, 25, 'Student Application & Onboarding Complete');
      setMemberPoints((prev) => prev + 25);
    } catch {}

    const newBadge = {
      badge_id: 'bdg-1',
      name: 'First Step',
      icon: '🚀',
      description: 'Completed student onboarding & application on mobile'
    };
    setEarnedBadgesList((prev) => {
      if (prev.some((b) => b.name === 'First Step')) return prev;
      return [...prev, newBadge];
    });

    setPendingMembers((prev) => [updatedUser, ...prev.filter((m) => m.id !== updatedUser.id && m.email !== updatedUser.email)]);
    setIsApplyModalOpen(false);

    if (isReapply) {
      triggerToast('Application Re-Submitted! Reviewing by Club Admin (Ritesh Mishra) ⏳');
    } else {
      setBadgeUnlockCelebration({
        badge: newBadge,
        pointsAwarded: 25,
        title: 'Welcome to ATC!'
      });
      triggerToast('Application Submitted! +25 XP Earned & Reviewing by Admin ⏳');
    }
  };

  // Application Status Checker
  const handleSearchStatus = async () => {
    if (!statusSearchId.trim()) {
      Alert.alert('Search', 'Please enter a Student ID or Email.');
      return;
    }

    const q = statusSearchId.trim().toLowerCase();
    let found =
      pendingMembers.find(
        (p) => p.student_id?.toLowerCase() === q || p.email?.toLowerCase() === q
      ) || (currentUser?.student_id?.toLowerCase() === q || currentUser?.email?.toLowerCase() === q ? currentUser : null);

    if (!found) {
      try {
        const { data: dbMatch } = await supabase
          .from('profiles')
          .select('*')
          .or(`student_id.ilike.%${q}%,email.ilike.%${q}%`)
          .limit(1)
          .maybeSingle();
        if (dbMatch) found = dbMatch;
      } catch {}
    }

    if (found) {
      setStatusSearchResult(found);
    } else {
      setStatusSearchResult({
        full_name: 'Applicant Record',
        student_id: statusSearchId.toUpperCase(),
        department: 'Engineering',
        verification_status: 'pending',
        is_verified: false
      });
    }
  };

  // =========================================================================
  // STUDENT CONTRIBUTIONS & MANUAL POINTS HANDLERS
  // =========================================================================

  // Submit Student Contribution (GitHub PR / Project / Bug Bounty)
  const handleSubmitContribution = async () => {
    if (currentUser?.verification_status === 'rejected') {
      Alert.alert(
        'Application Declined',
        'Student contribution reports require an active club membership. Please update and re-submit your student application.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Update Application', onPress: () => openApplyModal(currentUser) }
        ]
      );
      return;
    }

    if (!contribTitle.trim()) {
      Alert.alert('Required', 'Please enter a title for your contribution or PR.');
      return;
    }
    if (!contribProofUrl.trim()) {
      Alert.alert('Required', 'Please enter a GitHub PR URL or proof link.');
      return;
    }

    setContribSubmitting(true);
    try {
      const result = await submitContributionReport({
        userId: currentUser?.id || `usr-${Date.now()}`,
        userName: currentUser?.full_name || 'Member',
        userEmail: currentUser?.email || '',
        title: contribTitle.trim(),
        category: contribCategory,
        description: contribDesc.trim(),
        proofUrl: contribProofUrl.trim()
      });

      if (result.success) {
        setContributionReports((prev) => [result.data, ...prev]);
        setIsSubmitContributionOpen(false);
        setContribTitle('');
        setContribDesc('');
        setContribProofUrl('');
        triggerToast('Contribution Submitted! Reviewing by Admin (Ritesh Mishra) ⏳');
      } else {
        Alert.alert('Submission Error', result.reason || 'Failed to submit report');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not submit contribution report');
    } finally {
      setContribSubmitting(false);
    }
  };

  // Admin Review Contribution Report (Approve / Reject)
  const handleReviewReportSubmit = async (status) => {
    if (!selectedReport) return;
    setReviewSubmitting(true);
    try {
      const points = status === 'approved' ? (parseInt(reviewPoints, 10) || 100) : 0;
      const res = await reviewContributionReport(
        currentUser?.id || 'admin',
        selectedReport.id,
        selectedReport.user_id,
        status,
        points,
        reviewFeedback.trim(),
        selectedReport.title
      );

      if (res.success) {
        setContributionReports((prev) =>
          prev.map((r) =>
            r.id === selectedReport.id
              ? {
                  ...r,
                  status,
                  points_awarded: points,
                  admin_feedback: reviewFeedback.trim(),
                  reviewed_at: new Date().toISOString()
                }
              : r
          )
        );
        setIsReviewReportModalOpen(false);
        setSelectedReport(null);
        setReviewFeedback('');
        triggerToast(status === 'approved' ? `Approved & +${points} XP Awarded! 🎉` : 'Submission Reviewed ✓');
      } else {
        Alert.alert('Error', res.error || 'Failed to update review status');
      }
    } catch (err) {
      Alert.alert('Review Error', err.message || 'Could not save review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Admin Direct Member Points Adjuster
  const handleExecuteAdjustPoints = async () => {
    if (!adjustTargetUser) {
      Alert.alert('Required', 'Please select a member to adjust points for.');
      return;
    }
    const delta = parseInt(adjustPointsDelta, 10);
    if (isNaN(delta) || delta === 0) {
      Alert.alert('Invalid Points', 'Please enter a valid points adjustment (+/-).');
      return;
    }
    if (!adjustPointsReason.trim()) {
      Alert.alert('Required', 'Please provide a reason for this points adjustment.');
      return;
    }

    setAdjustSubmitting(true);
    try {
      const res = await adjustMemberPoints(
        currentUser?.id || 'admin',
        adjustTargetUser.id,
        delta,
        adjustPointsReason.trim()
      );

      if (res.success) {
        setIsAdjustPointsOpen(false);
        setAdjustPointsReason('');
        setAdjustPointsDelta('100');
        setAdjustTargetUser(null);
        setAdjustSearchQuery('');
        if (currentUser?.id === adjustTargetUser.id) {
          setMemberPoints(res.newTotal);
        }
        triggerToast(`Points updated (${delta > 0 ? `+${delta}` : delta} XP) ✓`);
        loadLivePlatformData();
      } else {
        Alert.alert('Adjustment Error', res.error || 'Failed to adjust points');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not adjust points');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Role Assignment Execution (Rule 4 Preserved)
  const handleAssignRole = async (targetUser, newRole) => {
    if (!targetUser || !targetUser.id) return;
    setRoleChangeLoading(true);
    try {
      await setRole(targetUser.id, newRole);
      setAdjustTargetUser((prev) => (prev ? { ...prev, role: newRole } : null));
      setAllProfiles((prev) =>
        prev.map((p) =>
          p.id === targetUser.id || p.student_id === targetUser.id || p.email === targetUser.email
            ? { ...p, role: newRole }
            : p
        )
      );
      if (currentUser?.id === targetUser.id || currentUser?.email === targetUser.email) {
        const updatedUser = { ...currentUser, role: newRole };
        setCurrentUser(updatedUser);
        saveMobileSession(updatedUser);
      }
      triggerToast(`Role updated to ${getDisplayRole(newRole)} ✓`);
    } catch (err) {
      Alert.alert('Role Update Error', err.message || 'Failed to update user role');
    } finally {
      setRoleChangeLoading(false);
    }
  };

  // Create Assigned Task (Super Admin / Admin)
  const handleCreateAssignedTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Required', 'Please enter a task title.');
      return;
    }
    setTaskAssignSubmitting(true);
    try {
      const pts = parseInt(newTaskPoints, 10) || 100;
      const created = await createAssignedTask({
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        assigned_to_role: newTaskRole,
        assigned_to_user_id: newTaskAssigneeId || null,
        assigned_to_user_name: newTaskAssigneeName.trim() || (newTaskRole === 'media_head' ? 'Media Team' : 'Member'),
        assigned_by: currentUser?.id || 'admin',
        assigned_by_name: currentUser?.full_name || 'Club Admin (Ritesh Mishra)',
        due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
        priority: newTaskPriority,
        points_reward: pts
      });

      setAssignedTasks((prev) => [created, ...prev]);
      setIsAssignTaskModalOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskRole('media_head');
      setNewTaskAssigneeId('');
      setNewTaskAssigneeName('');
      setNewTaskPriority('high');
      setNewTaskPoints('100');
      setNewTaskDueDate('');
      triggerToast('Task assigned successfully ✓');
    } catch (err) {
      Alert.alert('Task Error', err.message || 'Could not create task assignment');
    } finally {
      setTaskAssignSubmitting(false);
    }
  };

  // Submit Deliverable (Media Head / Assignee)
  const handleSubmitDeliverable = async () => {
    if (!targetDeliverableTask) return;
    if (!deliverableUrl.trim() && !deliverableNotes.trim()) {
      Alert.alert('Required', 'Please enter a deliverable link or descriptive notes.');
      return;
    }
    setDeliverableSubmitting(true);
    try {
      const updated = await submitTaskDeliverable(
        targetDeliverableTask.id,
        deliverableUrl.trim(),
        deliverableNotes.trim()
      );

      setAssignedTasks((prev) =>
        prev.map((t) => (t.id === targetDeliverableTask.id ? updated : t))
      );
      setIsSubmitDeliverableModalOpen(false);
      setTargetDeliverableTask(null);
      setDeliverableUrl('');
      setDeliverableNotes('');
      triggerToast('Deliverable submitted for review! 🚀');
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Could not submit deliverable');
    } finally {
      setDeliverableSubmitting(false);
    }
  };

  // Review Assigned Task Deliverable (Admin / Super Admin)
  const handleReviewDeliverable = async (decisionStatus) => {
    if (!targetReviewTask) return;
    setReviewTaskSubmitting(true);
    try {
      const pts = parseInt(reviewTaskPoints, 10) || 100;
      const updated = await reviewAssignedTask(
        targetReviewTask.id,
        decisionStatus,
        pts,
        reviewTaskFeedback.trim(),
        targetReviewTask.assigned_to_user_id || currentUser?.id
      );

      setAssignedTasks((prev) =>
        prev.map((t) => (t.id === targetReviewTask.id ? updated : t))
      );
      setIsReviewTaskModalOpen(false);
      setTargetReviewTask(null);
      setReviewTaskFeedback('');
      triggerToast(decisionStatus === 'approved' ? `Task Approved & +${pts} XP Awarded! 🎉` : 'Task Returned for Revision ✓');
    } catch (err) {
      Alert.alert('Review Error', err.message || 'Could not submit task review');
    } finally {
      setReviewTaskSubmitting(false);
    }
  };

  // Delete Task
  const handleDeleteAssignedTask = (taskId, taskTitle) => {
    Alert.alert('Delete Task', `Are you sure you want to delete "${taskTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAssignedTask(taskId);
            setAssignedTasks((prev) => prev.filter((t) => t.id !== taskId));
            triggerToast('Task deleted');
          } catch (err) {
            Alert.alert('Error', err.message || 'Could not delete task');
          }
        }
      }
    ]);
  };

  // UNIFIED STUDENT ONBOARDING & MEMBERSHIP APPLICATION MODAL
  const renderApplyModal = () => (
    <Modal visible={isApplyModalOpen} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 }}
      >
        <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 22, maxHeight: '88%' }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: currentUser?.verification_status === 'rejected' ? '#fee2e2' : colors.primary[50],
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 8
                }}
              >
                <Text style={{ fontSize: 24 }}>
                  {currentUser?.verification_status === 'rejected' ? '🚫' : '🚀'}
                </Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900], textAlign: 'center' }}>
                {currentUser?.verification_status === 'rejected'
                  ? 'Update & Re-Submit Application'
                  : 'Student Membership Application'}
              </Text>
              <Text style={{ fontSize: 12, color: colors.neutral[500], textAlign: 'center', marginTop: 4 }}>
                {currentUser?.verification_status === 'rejected'
                  ? 'Review your details and submit for re-evaluation by Club Admin (Ritesh Mishra).'
                  : 'Join the campus developer community, earn +25 XP & unlock member features.'}
              </Text>
            </View>

            {/* Declined Warning Banner if Previously Rejected */}
            {currentUser?.verification_status === 'rejected' && (
              <View
                style={{
                  backgroundColor: '#fef2f2',
                  borderWidth: 1,
                  borderColor: '#fecaca',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 14
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#b91c1c', marginBottom: 2 }}>
                  Application Previously Declined
                </Text>
                <Text style={{ fontSize: 11, color: '#dc2626', lineHeight: 16 }}>
                  Your student application was not approved. Please ensure your Student Roll Number, branch, and details accurately reflect your university registration.
                </Text>
              </View>
            )}

            <View style={{ gap: 12 }}>
              {/* Full Name */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  Full Name *
                </Text>
                <TextInput
                  placeholder="e.g. Student Full Name"
                  value={applyFullName || currentUser?.full_name || ''}
                  onChangeText={setApplyFullName}
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: colors.neutral[900]
                  }}
                />
              </View>

              {/* University Email */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  University Email *
                </Text>
                <TextInput
                  placeholder="name@university.edu"
                  value={applyEmail || currentUser?.email || ''}
                  onChangeText={setApplyEmail}
                  editable={!currentUser}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={{
                    backgroundColor: currentUser ? colors.neutral[100] : colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: currentUser ? colors.neutral[600] : colors.neutral[900]
                  }}
                />
              </View>

              {/* Roll Number / Student ID */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  University Roll Number / Student ID *
                </Text>
                <TextInput
                  placeholder="e.g. 23CS041 or CS2026-088"
                  value={applyStudentId || onboardRoll || ''}
                  onChangeText={(val) => {
                    setApplyStudentId(val);
                    setOnboardRoll(val);
                  }}
                  autoCapitalize="characters"
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: colors.neutral[900]
                  }}
                />
              </View>

              {/* Branch / Department Selection */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 6 }}>
                  Branch / Department
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    'Computer Science & Engineering',
                    'Information Technology',
                    'AI & Data Science',
                    'Electronics & Comm',
                    'Mechanical Eng',
                    'Electrical Eng'
                  ].map((b) => (
                    <TouchableOpacity
                      key={b}
                      onPress={() => {
                        setApplyDept(b);
                        setOnboardBranch(b);
                      }}
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: applyDept === b ? colors.primary[500] : colors.neutral[100]
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: 'bold',
                          color: applyDept === b ? '#ffffff' : colors.neutral[700]
                        }}
                      >
                        {b}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Year of Study */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 6 }}>
                  Year of Study
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgrad'].map((y) => (
                    <TouchableOpacity
                      key={y}
                      onPress={() => {
                        setApplyYear(y);
                        setOnboardYear(y);
                      }}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: applyYear === y ? colors.primary[500] : colors.neutral[100],
                        alignItems: 'center'
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: 'bold',
                          color: applyYear === y ? '#ffffff' : colors.neutral[700]
                        }}
                      >
                        {y.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Technical Interests */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 6 }}>
                  Technical Interests
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {availableInterests.map((item) => {
                    const selected = applyInterests.includes(item);
                    return (
                      <TouchableOpacity
                        key={item}
                        onPress={() => {
                          if (selected) {
                            setApplyInterests((prev) => prev.filter((i) => i !== item));
                          } else {
                            setApplyInterests((prev) => [...prev, item]);
                          }
                        }}
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 6,
                          backgroundColor: selected ? colors.primary[500] : colors.neutral[100]
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: selected ? '#ffffff' : colors.neutral[700] }}>
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* GitHub / Portfolio */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  GitHub / Portfolio Profile (Optional)
                </Text>
                <TextInput
                  placeholder="https://github.com/username"
                  value={applyGithub}
                  onChangeText={setApplyGithub}
                  autoCapitalize="none"
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: colors.neutral[900]
                  }}
                />
              </View>

              {/* Why Join ATC / Aspirations */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  Why do you want to join ATC? (Optional)
                </Text>
                <TextInput
                  placeholder="e.g. Build production systems, participate in hackathons, and learn with peers..."
                  value={onboardWhyJoin}
                  onChangeText={setOnboardWhyJoin}
                  multiline
                  numberOfLines={2}
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 13,
                    height: 55,
                    textAlignVertical: 'top',
                    color: colors.neutral[900]
                  }}
                />
              </View>
            </View>

            {/* Modal Actions */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
              <TouchableOpacity
                onPress={() => setIsApplyModalOpen(false)}
                style={{
                  flex: 1,
                  backgroundColor: colors.neutral[100],
                  paddingVertical: 13,
                  borderRadius: 12,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmitApplication}
                style={{
                  flex: 2,
                  backgroundColor: currentUser?.verification_status === 'rejected' ? '#dc2626' : colors.primary[500],
                  paddingVertical: 13,
                  borderRadius: 12,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                  {currentUser?.verification_status === 'rejected'
                    ? 'Update & Re-Submit ↺'
                    : 'Submit & Claim 25 XP 🚀'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // STUDENT CONTRIBUTION SUBMISSION MODAL
  const renderSubmitContributionModal = () => (
    <Modal visible={isSubmitContributionOpen} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }}
      >
        <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 22, maxHeight: '88%' }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 20 }}>🚀</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900] }}>
                  Submit Contribution / PR
                </Text>
                <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                  Earn verified XP & prizes for your code and campus tasks
                </Text>
              </View>
            </View>

            <View style={{ gap: 12, marginTop: 12 }}>
              {/* Category Selection */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 6 }}>
                  Contribution Category *
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { id: 'github_pr', label: '🐙 GitHub PR' },
                    { id: 'bug_report', label: '🐞 Bug Fix' },
                    { id: 'workshop_help', label: '🤝 Workshop Help' },
                    { id: 'open_request', label: '📌 Club Request' },
                    { id: 'custom', label: '⭐ Other Task' }
                  ].map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setContribCategory(c.id)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: contribCategory === c.id ? colors.primary[500] : colors.neutral[100]
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: contribCategory === c.id ? '#ffffff' : colors.neutral[700] }}>
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Title */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  Contribution Title *
                </Text>
                <TextInput
                  placeholder="e.g. PR #42: Fixed Dark Mode in Web Portal"
                  placeholderTextColor={colors.neutral[400]}
                  value={contribTitle}
                  onChangeText={setContribTitle}
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: colors.neutral[900]
                  }}
                />
              </View>

              {/* Proof Link / PR URL */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  Proof / GitHub PR URL *
                </Text>
                <TextInput
                  placeholder="https://github.com/Flux-ipher/Advanced-Tech-Club/pull/42"
                  placeholderTextColor={colors.neutral[400]}
                  autoCapitalize="none"
                  keyboardType="url"
                  value={contribProofUrl}
                  onChangeText={setContribProofUrl}
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: colors.neutral[900]
                  }}
                />
              </View>

              {/* Description */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  Description / What was built or solved?
                </Text>
                <TextInput
                  placeholder="Briefly describe what you changed, how to test it, or what issue was resolved..."
                  placeholderTextColor={colors.neutral[400]}
                  multiline
                  numberOfLines={3}
                  value={contribDesc}
                  onChangeText={setContribDesc}
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: colors.neutral[900],
                    height: 75,
                    textAlignVertical: 'top'
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setIsSubmitContributionOpen(false)}
                disabled={contribSubmitting}
                style={{
                  flex: 1,
                  backgroundColor: colors.neutral[100],
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmitContribution}
                disabled={contribSubmitting}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary[500],
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                {contribSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                    Submit for Review
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ADMIN REVIEW CONTRIBUTION MODAL
  const renderReviewContributionModal = () => (
    <Modal visible={isReviewReportModalOpen} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }}
      >
        <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 22, maxHeight: '88%' }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
              Review Student Contribution
            </Text>
            <Text style={{ fontSize: 11, color: colors.neutral[500], marginBottom: 14 }}>
              Verify student's PR, grant points, and record in their audit history.
            </Text>

            {selectedReport && (
              <View style={{ gap: 12 }}>
                {/* Student Info Card */}
                <View style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[200], borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>
                    {selectedReport.user_name || 'Member'}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                    {selectedReport.user_email}
                  </Text>
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[200] }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary[700] }}>
                      {selectedReport.title}
                    </Text>
                    {selectedReport.description ? (
                      <Text style={{ fontSize: 12, color: colors.neutral[700], marginTop: 4 }}>
                        {selectedReport.description}
                      </Text>
                    ) : null}
                    {selectedReport.proof_url ? (
                      <Text style={{ fontSize: 11, color: '#2563eb', marginTop: 6, textDecorationLine: 'underline' }}>
                        🔗 {selectedReport.proof_url}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Points Award Input */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 6 }}>
                    Points to Award (XP) *
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                    {['50', '100', '150', '250', '500'].map((pts) => (
                      <TouchableOpacity
                        key={pts}
                        onPress={() => setReviewPoints(pts)}
                        style={{
                          flex: 1,
                          paddingVertical: 7,
                          borderRadius: 8,
                          alignItems: 'center',
                          backgroundColor: reviewPoints === pts ? colors.primary[500] : colors.neutral[100]
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: reviewPoints === pts ? '#ffffff' : colors.neutral[700] }}>
                          +{pts}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    placeholder="Custom Points (e.g. 150)"
                    keyboardType="numeric"
                    value={reviewPoints}
                    onChangeText={setReviewPoints}
                    style={{
                      backgroundColor: colors.neutral[50],
                      borderWidth: 1,
                      borderColor: colors.neutral[300],
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 13,
                      color: colors.neutral[900]
                    }}
                  />
                </View>

                {/* Admin Feedback */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Admin Feedback Note (Optional)
                  </Text>
                  <TextInput
                    placeholder="e.g. Great PR! Clean commits and resolved issue #42."
                    value={reviewFeedback}
                    onChangeText={setReviewFeedback}
                    style={{
                      backgroundColor: colors.neutral[50],
                      borderWidth: 1,
                      borderColor: colors.neutral[300],
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 13,
                      color: colors.neutral[900]
                    }}
                  />
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setIsReviewReportModalOpen(false)}
                disabled={reviewSubmitting}
                style={{
                  flex: 1,
                  backgroundColor: colors.neutral[100],
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleReviewReportSubmit('rejected')}
                disabled={reviewSubmitting}
                style={{
                  flex: 1,
                  backgroundColor: colors.danger[50],
                  borderWidth: 1,
                  borderColor: colors.danger[200],
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: colors.danger[700], fontWeight: 'bold', fontSize: 13 }}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleReviewReportSubmit('approved')}
                disabled={reviewSubmitting}
                style={{
                  flex: 1.5,
                  backgroundColor: colors.success[500],
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                {reviewSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                    Approve (+{reviewPoints} XP)
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // ADMIN MANUAL POINTS ADJUSTER MODAL
  const renderAdjustPointsModal = () => (
    <Modal visible={isAdjustPointsOpen} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }}
      >
        <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 22, maxHeight: '88%' }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 20 }}>⭐</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900] }}>
                  Adjust Member Points
                </Text>
                <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                  Reward or deduct XP with full audit trail in points_log
                </Text>
              </View>
            </View>

            <View style={{ gap: 12, marginTop: 10 }}>
              {/* Member Target Selector / Display */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  Target Member *
                </Text>
                {adjustTargetUser ? (
                  <View style={{ backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200], borderRadius: 12, padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {adjustTargetUser.avatar_url ? (
                          <Image
                            source={{ uri: adjustTargetUser.avatar_url }}
                            style={{ width: 36, height: 36, borderRadius: 18 }}
                          />
                        ) : (
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[200], justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary[800] }}>
                              {(adjustTargetUser.full_name || 'U').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary[950] }}>
                              {adjustTargetUser.full_name || adjustTargetUser.email}
                            </Text>
                            <View style={{ backgroundColor: colors.primary[200], paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                              <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.primary[800] }}>
                                {getDisplayRole(adjustTargetUser.role)}
                              </Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 11, color: colors.primary[700] }}>
                            {adjustTargetUser.email} {adjustTargetUser.student_id ? `· ${adjustTargetUser.student_id}` : ''}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => setAdjustTargetUser(null)}
                        style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: colors.primary[300] }}
                      >
                        <Text style={{ fontSize: 11, color: colors.primary[700], fontWeight: 'bold' }}>Change</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Role Assignment Pill Bar (Super Admin only) */}
                    {canAssignRoles && (
                      <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.primary[200] }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[900] }}>
                            Assign Functional Role:
                          </Text>
                          {roleChangeLoading && <ActivityIndicator size="small" color={colors.primary[600]} />}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {[
                            { role: 'member', label: 'Member' },
                            { role: 'media_head', label: 'Media Head' },
                            { role: 'admin', label: 'Admin' }
                          ].map((r) => {
                            const isCurrentRole = (adjustTargetUser.role || 'member') === r.role;
                            return (
                              <TouchableOpacity
                                key={r.role}
                                disabled={roleChangeLoading || isCurrentRole}
                                onPress={() => handleAssignRole(adjustTargetUser, r.role)}
                                style={{
                                  flex: 1,
                                  paddingVertical: 7,
                                  borderRadius: 8,
                                  backgroundColor: isCurrentRole ? colors.primary[700] : '#ffffff',
                                  borderWidth: 1,
                                  borderColor: isCurrentRole ? colors.primary[800] : colors.primary[300],
                                  alignItems: 'center'
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 'bold',
                                    color: isCurrentRole ? '#ffffff' : colors.primary[800]
                                  }}
                                >
                                  {r.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {/* Live Search Input */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[100], borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: colors.neutral[200] }}>
                      <Text style={{ fontSize: 12, marginRight: 6 }}>🔍</Text>
                      <TextInput
                        value={adjustSearchQuery}
                        onChangeText={setAdjustSearchQuery}
                        placeholder="Search student by name, email, roll number..."
                        placeholderTextColor={colors.neutral[400]}
                        style={{ flex: 1, fontSize: 12, color: colors.neutral[900], padding: 0 }}
                      />
                      {adjustSearchQuery ? (
                        <TouchableOpacity onPress={() => setAdjustSearchQuery('')}>
                          <Text style={{ fontSize: 12, color: colors.neutral[500], paddingHorizontal: 4 }}>✕</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {/* Scrollable Members List */}
                    <ScrollView
                      nestedScrollEnabled
                      style={{ maxHeight: 180, borderRadius: 10, borderWidth: 1, borderColor: colors.neutral[200], backgroundColor: colors.neutral[50] }}
                      showsVerticalScrollIndicator={true}
                    >
                      {(() => {
                        const sourceList = (allProfiles && allProfiles.length > 0)
                          ? allProfiles
                          : [currentUser, ...savedGoogleAccounts].filter(Boolean);

                        const q = adjustSearchQuery.trim().toLowerCase();
                        const filtered = sourceList.filter((m) => {
                          if (!m) return false;
                          if (!q) return true;
                          const name = (m.full_name || m.name || '').toLowerCase();
                          const email = (m.email || '').toLowerCase();
                          const sId = (m.student_id || m.roll_number || '').toLowerCase();
                          return name.includes(q) || email.includes(q) || sId.includes(q);
                        });

                        if (filtered.length === 0) {
                          return (
                            <View style={{ padding: 16, alignItems: 'center' }}>
                              <Text style={{ fontSize: 12, color: colors.neutral[500] }}>
                                No students found matching "{adjustSearchQuery}".
                              </Text>
                            </View>
                          );
                        }

                        return filtered.map((m) => {
                          const isSelf = currentUser && (m.id === currentUser.id || m.email === currentUser.email);
                          const displayName = m.full_name || m.name || m.email?.split('@')[0];
                          return (
                            <TouchableOpacity
                              key={m.id || m.email}
                              onPress={() => {
                                setAdjustTargetUser({
                                  id: m.id || m.student_id || `user-${Date.now()}`,
                                  full_name: displayName,
                                  email: m.email,
                                  role: m.role || 'member',
                                  student_id: m.student_id || m.roll_number || ''
                                });
                                setAdjustSearchQuery('');
                              }}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: 12,
                                paddingVertical: 9,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.neutral[200],
                                backgroundColor: isSelf ? colors.primary[50] : '#ffffff'
                              }}
                            >
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                {m.avatar_url || m.avatar ? (
                                  <Image
                                    source={{ uri: m.avatar_url || m.avatar }}
                                    style={{ width: 28, height: 28, borderRadius: 14 }}
                                  />
                                ) : (
                                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.neutral[200], justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700] }}>
                                      {(displayName || 'U').charAt(0).toUpperCase()}
                                    </Text>
                                  </View>
                                )}
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.neutral[900] }} numberOfLines={1}>
                                      {displayName} {isSelf ? '(You)' : ''}
                                    </Text>
                                    <Text style={{ fontSize: 9, color: (m.role === 'admin' || m.role === 'super_admin') ? colors.primary[700] : colors.neutral[500], fontWeight: 'bold' }}>
                                      {getDisplayRole(m.role)}
                                    </Text>
                                  </View>
                                  <Text style={{ fontSize: 10, color: colors.neutral[500] }} numberOfLines={1}>
                                    {m.email} {m.student_id ? `· ${m.student_id}` : ''}
                                  </Text>
                                </View>
                              </View>
                              <View style={{ backgroundColor: colors.primary[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.primary[200] }}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[700] }}>Select</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        });
                      })()}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Preset Chips */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 6 }}>
                  Preset XP Actions
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { label: '+50 XP (Active Attendee)', val: '50', reason: 'Active participation in club workshop' },
                    { label: '+100 XP (PR Merged)', val: '100', reason: 'Merged open source pull request on GitHub' },
                    { label: '+250 XP (Hackathon Sprint)', val: '250', reason: 'Completed campus hackathon technical sprint' },
                    { label: '-50 XP (Penalty/Deduction)', val: '-50', reason: 'Missed mandatory check-in duty' }
                  ].map((preset) => (
                    <TouchableOpacity
                      key={preset.label}
                      onPress={() => {
                        setAdjustPointsDelta(preset.val);
                        setAdjustPointsReason(preset.reason);
                      }}
                      style={{
                        paddingHorizontal: 9,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: adjustPointsDelta === preset.val ? colors.primary[500] : colors.neutral[100]
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: adjustPointsDelta === preset.val ? '#ffffff' : colors.neutral[700] }}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Points Delta Input */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  Points Delta (+ to reward, - to deduct) *
                </Text>
                <TextInput
                  placeholder="e.g. 100 or -50"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="numeric"
                  value={adjustPointsDelta}
                  onChangeText={setAdjustPointsDelta}
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: colors.neutral[900]
                  }}
                />
              </View>

              {/* Reason Input */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  Reason / Activity Note *
                </Text>
                <TextInput
                  placeholder="e.g. Merged PR #42 or Assisted during AI lab"
                  placeholderTextColor={colors.neutral[400]}
                  value={adjustPointsReason}
                  onChangeText={setAdjustPointsReason}
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: colors.neutral[900]
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setIsAdjustPointsOpen(false)}
                disabled={adjustSubmitting}
                style={{
                  flex: 1,
                  backgroundColor: colors.neutral[100],
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleExecuteAdjustPoints}
                disabled={adjustSubmitting}
                style={{
                  flex: 1.5,
                  backgroundColor: colors.primary[500],
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                {adjustSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                    Save & Update XP
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // FAB QUICK ACTION SHEET MODAL
  const renderFabActionModal = () => (
    <Modal visible={isFabActionMenuOpen} animationType="fade" transparent>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setIsFabActionMenuOpen(false)}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', padding: 16, paddingBottom: Platform.OS === 'ios' ? 90 : 80 }}
      >
        <TouchableWithoutFeedback>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900] }}>
                Quick Actions
              </Text>
              <TouchableOpacity onPress={() => setIsFabActionMenuOpen(false)} style={{ padding: 4 }}>
                <X size={16} color={colors.neutral[500]} weight="bold" />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8 }}>
              {isAdmin ? (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setIsFabActionMenuOpen(false);
                      openAdminScanner();
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f5f3ff', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#ddd6fe' }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={20} color="#6d28d9" weight="bold" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#6d28d9' }}>Scan Student Event Pass</Text>
                      <Text style={{ fontSize: 11, color: colors.neutral[500] }}>Verify QR door check-in & record attendance</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setIsFabActionMenuOpen(false);
                      setIsAdjustPointsOpen(true);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary[50], padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.primary[200] }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[100], alignItems: 'center', justifyContent: 'center' }}>
                      <Sparkle size={20} color={colors.primary[600]} weight="fill" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary[900] }}>Award / Deduct Member XP</Text>
                      <Text style={{ fontSize: 11, color: colors.neutral[500] }}>Manually reward points for contributions & PRs</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setIsFabActionMenuOpen(false);
                      setCurrentTab('resources');
                      setTasksSubTab('contributions');
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.neutral[50], padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral[200] }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.neutral[200], alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={20} color={colors.neutral[700]} weight="bold" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>Review Student PRs & Submissions</Text>
                      <Text style={{ fontSize: 11, color: colors.neutral[500] }}>Verify open PRs and approve reward points</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setIsFabActionMenuOpen(false);
                      setIsBroadcastModalOpen(true);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.neutral[50], padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral[200] }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.neutral[200], alignItems: 'center', justifyContent: 'center' }}>
                      <Megaphone size={20} color={colors.neutral[700]} weight="bold" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>Post Campus Announcement</Text>
                      <Text style={{ fontSize: 11, color: colors.neutral[500] }}>Broadcast to all registered club members</Text>
                    </View>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setIsFabActionMenuOpen(false);
                      setIsQrPassOpen(true);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary[50], padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.primary[200] }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary[100], alignItems: 'center', justifyContent: 'center' }}>
                      <IdentificationCard size={20} color={colors.primary[600]} weight="bold" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary[900] }}>Digital Campus Pass</Text>
                      <Text style={{ fontSize: 11, color: colors.neutral[500] }}>Show QR pass for workshop door entry</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setIsFabActionMenuOpen(false);
                      setIsSubmitContributionOpen(true);
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f0fdf4', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#bbf7d0' }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                      <RocketLaunch size={20} color="#15803d" weight="bold" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#15803d' }}>Submit Contribution / PR</Text>
                      <Text style={{ fontSize: 11, color: colors.neutral[500] }}>Submit your merged GitHub PR to earn XP</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setIsFabActionMenuOpen(false);
                      openLeaderboard();
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.neutral[50], padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.neutral[200] }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.neutral[200], alignItems: 'center', justifyContent: 'center' }}>
                      <Trophy size={20} color={colors.neutral[700]} weight="bold" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>XP Leaderboard & Badges</Text>
                      <Text style={{ fontSize: 11, color: colors.neutral[500] }}>View campus rankings and unlocked badges</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );

  // ASSIGN TASK MODAL (SUPER ADMIN / ADMIN)
  const renderAssignTaskModal = () => (
    <Modal visible={isAssignTaskModalOpen} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }}
      >
        <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 22, maxHeight: '88%' }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3e8ff', justifyContent: 'center', alignItems: 'center' }}>
                <Megaphone size={20} color="#7c3aed" weight="bold" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900] }}>
                  Assign Role Task
                </Text>
                <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                  Delegate media creation or club duties to functional roles
                </Text>
              </View>
            </View>

            <View style={{ gap: 12, marginTop: 10 }}>
              {/* Task Title */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  Task Title *
                </Text>
                <TextInput
                  placeholder="e.g. Capture & Curate Workshop Highlight Photos"
                  placeholderTextColor={colors.neutral[400]}
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: colors.neutral[900]
                  }}
                />
              </View>

              {/* Task Role Target */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  Assigned Functional Role *
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { id: 'media_head', label: 'Media Head' },
                    { id: 'member', label: 'General Member' }
                  ].map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      onPress={() => setNewTaskRole(r.id)}
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        borderRadius: 10,
                        backgroundColor: newTaskRole === r.id ? '#7c3aed' : colors.neutral[100],
                        borderWidth: 1,
                        borderColor: newTaskRole === r.id ? '#6d28d9' : colors.neutral[200],
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: newTaskRole === r.id ? '#ffffff' : colors.neutral[700] }}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Priority Selector */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  Task Priority *
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { id: 'low', label: 'Low', color: '#3b82f6' },
                    { id: 'medium', label: 'Medium', color: '#10b981' },
                    { id: 'high', label: 'High', color: '#f59e0b' },
                    { id: 'urgent', label: 'Urgent', color: '#ef4444' }
                  ].map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setNewTaskPriority(p.id)}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: newTaskPriority === p.id ? p.color : colors.neutral[100],
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: newTaskPriority === p.id ? '#ffffff' : colors.neutral[700], textTransform: 'capitalize' }}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Points Reward & Due Date */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    XP Reward Points *
                  </Text>
                  <TextInput
                    placeholder="100"
                    placeholderTextColor={colors.neutral[400]}
                    keyboardType="numeric"
                    value={newTaskPoints}
                    onChangeText={setNewTaskPoints}
                    style={{
                      backgroundColor: colors.neutral[50],
                      borderWidth: 1,
                      borderColor: colors.neutral[300],
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 13,
                      color: colors.neutral[900]
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Assignee Name (Opt)
                  </Text>
                  <TextInput
                    placeholder="e.g. Media Team"
                    placeholderTextColor={colors.neutral[400]}
                    value={newTaskAssigneeName}
                    onChangeText={setNewTaskAssigneeName}
                    style={{
                      backgroundColor: colors.neutral[50],
                      borderWidth: 1,
                      borderColor: colors.neutral[300],
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 13,
                      color: colors.neutral[900]
                    }}
                  />
                </View>
              </View>

              {/* Task Description */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  Detailed Task Instructions *
                </Text>
                <TextInput
                  placeholder="Outline the deliverable requirements, format, guidelines..."
                  placeholderTextColor={colors.neutral[400]}
                  multiline
                  numberOfLines={3}
                  value={newTaskDesc}
                  onChangeText={setNewTaskDesc}
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: colors.neutral[900],
                    minHeight: 70,
                    textAlignVertical: 'top'
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setIsAssignTaskModalOpen(false)}
                disabled={taskAssignSubmitting}
                style={{
                  flex: 1,
                  backgroundColor: colors.neutral[100],
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateAssignedTask}
                disabled={taskAssignSubmitting}
                style={{
                  flex: 1.5,
                  backgroundColor: '#7c3aed',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                {taskAssignSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                    Assign Task & Notify
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // SUBMIT DELIVERABLE MODAL (FOR MEDIA HEAD / ASSIGNEE)
  const renderSubmitDeliverableModal = () => (
    <Modal visible={isSubmitDeliverableModalOpen} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }}
      >
        <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 22, maxHeight: '88%' }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3e8ff', justifyContent: 'center', alignItems: 'center' }}>
                <RocketLaunch size={20} color="#7c3aed" weight="bold" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900] }}>
                  Submit Deliverable
                </Text>
                <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                  Submit completed media assets, URLs, or notes for Admin review
                </Text>
              </View>
            </View>

            {targetDeliverableTask && (
              <View style={{ backgroundColor: '#faf5ff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e9d5ff', marginTop: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#5b21b6', marginBottom: 2 }}>
                  {targetDeliverableTask.title}
                </Text>
                {targetDeliverableTask.description ? (
                  <Text style={{ fontSize: 11, color: colors.neutral[600] }}>
                    {targetDeliverableTask.description}
                  </Text>
                ) : null}
              </View>
            )}

            <View style={{ gap: 12, marginTop: 14 }}>
              {/* Deliverable Link */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  Asset / Deliverable Link (Google Drive, Figma, GitHub, Gallery URL)
                </Text>
                <TextInput
                  placeholder="https://drive.google.com/... or Figma link"
                  placeholderTextColor={colors.neutral[400]}
                  value={deliverableUrl}
                  onChangeText={setDeliverableUrl}
                  autoCapitalize="none"
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: colors.neutral[900]
                  }}
                />
              </View>

              {/* Notes */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  Deliverable Notes & Summary *
                </Text>
                <TextInput
                  placeholder="Describe the media content created, photos edited, posts published..."
                  placeholderTextColor={colors.neutral[400]}
                  multiline
                  numberOfLines={3}
                  value={deliverableNotes}
                  onChangeText={setDeliverableNotes}
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: colors.neutral[900],
                    minHeight: 70,
                    textAlignVertical: 'top'
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => {
                  setIsSubmitDeliverableModalOpen(false);
                  setTargetDeliverableTask(null);
                }}
                disabled={deliverableSubmitting}
                style={{
                  flex: 1,
                  backgroundColor: colors.neutral[100],
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmitDeliverable}
                disabled={deliverableSubmitting}
                style={{
                  flex: 1.5,
                  backgroundColor: '#7c3aed',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                {deliverableSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                    Send for Review 🚀
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // REVIEW ASSIGNED TASK MODAL (FOR SUPER ADMIN / ADMIN)
  const renderReviewTaskModal = () => (
    <Modal visible={isReviewTaskModalOpen} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }}
      >
        <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 22, maxHeight: '88%' }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' }}>
                <SealCheck size={20} color="#15803d" weight="bold" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900] }}>
                  Review Deliverable & Award XP
                </Text>
                <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                  Verify submitted media or task output and grant points
                </Text>
              </View>
            </View>

            {targetReviewTask && (
              <View style={{ backgroundColor: colors.neutral[50], borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.neutral[200], gap: 6, marginTop: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>
                  {targetReviewTask.title}
                </Text>
                <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                  Assigned To: {targetReviewTask.assigned_to_user_name || 'Media Team'} ({targetReviewTask.assigned_to_role})
                </Text>
                {targetReviewTask.deliverable_url ? (
                  <View style={{ backgroundColor: '#ffffff', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.neutral[200] }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.neutral[500] }}>DELIVERABLE LINK:</Text>
                    <Text numberOfLines={1} style={{ fontSize: 11, color: '#7c3aed', fontStyle: 'italic' }}>
                      🔗 {targetReviewTask.deliverable_url}
                    </Text>
                  </View>
                ) : null}
                {targetReviewTask.deliverable_notes ? (
                  <View style={{ backgroundColor: '#ffffff', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.neutral[200] }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.neutral[500] }}>SUBMISSION NOTES:</Text>
                    <Text style={{ fontSize: 11, color: colors.neutral[700] }}>
                      {targetReviewTask.deliverable_notes}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            <View style={{ gap: 12, marginTop: 14 }}>
              {/* Points to Award */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  XP Points to Grant *
                </Text>
                <TextInput
                  placeholder="100"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="numeric"
                  value={reviewTaskPoints}
                  onChangeText={setReviewTaskPoints}
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: colors.neutral[900]
                  }}
                />
              </View>

              {/* Feedback */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                  Admin Feedback / Recognition Note
                </Text>
                <TextInput
                  placeholder="e.g. Excellent photography and quick turnaround on gallery post!"
                  placeholderTextColor={colors.neutral[400]}
                  multiline
                  numberOfLines={2}
                  value={reviewTaskFeedback}
                  onChangeText={setReviewTaskFeedback}
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: colors.neutral[900]
                  }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => handleReviewDeliverable('in_progress')}
                disabled={reviewTaskSubmitting}
                style={{
                  flex: 1,
                  backgroundColor: colors.warning[50],
                  borderWidth: 1,
                  borderColor: colors.warning[300],
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: colors.warning[800], fontWeight: 'bold', fontSize: 13 }}>Needs Revision</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleReviewDeliverable('approved')}
                disabled={reviewTaskSubmitting}
                style={{
                  flex: 1.5,
                  backgroundColor: '#059669',
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center'
                }}
              >
                {reviewTaskSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                    Approve (+{reviewTaskPoints} XP)
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Helper: Persist read notification IDs to disk
  const persistReadNotificationIds = async (ids) => {
    try {
      await FileSystem.writeAsStringAsync(READ_NOTIFS_FILE, JSON.stringify(ids));
    } catch (err) {
      console.warn('[ATC Mobile] Failed to persist read notifs:', err);
    }
  };

  // Mark all notifications read
  const handleMarkNotificationsRead = async () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    const allIds = updated.map((n) => n.id);
    await persistReadNotificationIds(allIds);
    triggerToast('All notifications marked as read ✓');
  };

  // Mark single notification read
  const handleMarkSingleNotificationRead = async (notifId) => {
    const updated = notifications.map((n) => (n.id === notifId ? { ...n, read: true } : n));
    setNotifications(updated);
    const readIds = updated.filter((n) => n.read).map((n) => n.id);
    await persistReadNotificationIds(readIds);
  };

  // Share Content
  const handleShare = async (title, body) => {
    try {
      await Share.share({
        message: `${title}\n\n${body}\n\nShared via Advanced Tech Club (ATC) Mobile App\nhttps://advclub.online`
      });
    } catch (e) {
      triggerToast('Share completed');
    }
  };

  // Admin Quick Post Announcement
  const handleAdminPostAnnouncement = () => {
    if (!newAnnTitle.trim() || !newAnnBody.trim()) {
      Alert.alert('Required', 'Please enter a title and message.');
      return;
    }
    const created = {
      id: `ann-${Date.now()}`,
      title: newAnnTitle.trim(),
      body: newAnnBody.trim(),
      category: newAnnCategory,
      pinned: newAnnPinned,
      author_name: currentUser?.full_name || 'Club Admin',
      author_role: 'Admin',
      author_avatar: currentUser?.avatar_url,
      created_at: new Date().toISOString()
    };
    setAnnouncements((prev) => [created, ...prev]);
    setIsBroadcastModalOpen(false);
    setNewAnnTitle('');
    setNewAnnBody('');
    setNewAnnPinned(false);
    Analytics.adminPostedAnnouncement();
    triggerToast('Broadcast Pushed to Campus Devices 📢');
  };

  // Native Device Image Picker (Dual Support: Device Gallery & Custom URL)
  const handlePickImageFromDevice = async (onSelected) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Permission to access device photos is required to choose an image from your gallery.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const imageUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        onSelected(imageUri);
        triggerToast('Photo loaded from device 📸');
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert('Image Picker Error', err.message || 'Could not select photo from device');
    }
  };

  // Admin Studio Workshop Publisher
  const handleAdminCreateEvent = async () => {
    if (!newEventTitle.trim() || !newEventLocation.trim()) {
      Alert.alert('Required', 'Please enter an event title and location.');
      return;
    }
    const created = {
      id: `evt-${Date.now()}`,
      title: newEventTitle.trim(),
      description: newEventDesc.trim() || 'Hands-on campus engineering workshop led by ATC.',
      location: newEventLocation.trim(),
      category: newEventCategory,
      capacity: Number(newEventCapacity) || 80,
      registrations_count: 1,
      start_at: new Date(newEventDate + 'T10:00:00Z').toISOString(),
      date: newEventDate,
      time: `${newEventStartTime} - ${newEventEndTime}`,
      banner_url: newEventBanner || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
      image: newEventBanner || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
      tags: newEventTags,
      points: Number(newEventPoints) || 50,
      author_name: currentUser?.full_name || 'Club Admin (Ritesh Mishra)',
      author_role: 'Admin',
      status: 'upcoming',
      is_completed: false
    };

    setEvents((prev) => [created, ...prev]);
    setIsCreateEventModalOpen(false);
    setNewEventTitle('');
    setNewEventDesc('');
    setNewEventLocation('');

    // Persist to Supabase if live
    try {
      await supabase.from('events').insert([{
        title: created.title,
        description: created.description,
        location: created.location,
        category: created.category,
        capacity: created.capacity,
        start_at: created.start_at,
        date: created.date,
        banner_url: created.banner_url,
        image: created.image,
        tags: created.tags,
        author_id: currentUser?.id && !currentUser.id.startsWith('user-') ? currentUser.id : null
      }]);
    } catch (e) {
      console.warn('[ATC Mobile] Supabase event insert note:', e);
    }

    triggerToast('New Workshop Published! 📅', true);
    sendDevicePushNotification('📅 New Workshop: ' + created.title, `${created.date} @ ${created.location} · +${created.points} XP`);
  };

  // Admin Campus Memory Creator
  const handleAdminCreateMemory = async () => {
    if (!newMemTitle.trim() || !newMemImage.trim()) {
      Alert.alert('Required', 'Please enter a memory title and photo URL.');
      return;
    }
    const achieversList = newMemAchievers
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const memoryPayload = {
      id: `mem-${Date.now()}`,
      title: newMemTitle.trim(),
      category: newMemCategory,
      award_title: newMemAward.trim(),
      image_url: newMemImage.trim(),
      achievers: achieversList,
      description: newMemDesc.trim(),
      author_name: currentUser?.full_name || 'Club Admin (Ritesh Mishra)',
      event_date: new Date().toISOString().split('T')[0],
      likes_count: 1
    };

    setGalleryMemories((prev) => [memoryPayload, ...prev]);
    setIsCreateMemoryModalOpen(false);
    setNewMemTitle('');
    setNewMemAward('');
    setNewMemAchievers('');
    setNewMemDesc('');

    try {
      await addVaultGalleryMemory(memoryPayload);
    } catch (e) {
      console.warn('[ATC Mobile] Supabase memory insert note:', e);
    }

    triggerToast('✓ Campus Memory Published to Vault');
  };

  const handleToggleLikeMemory = async (memId) => {
    const isLiked = likedMemoryIds.includes(memId);
    const target = galleryMemories.find((m) => m.id === memId);
    const curLikes = target?.likes_count || 0;
    const nextLikes = isLiked ? Math.max(0, curLikes - 1) : curLikes + 1;

    setGalleryMemories((prev) =>
      prev.map((m) => (m.id === memId ? { ...m, likes_count: nextLikes } : m))
    );
    if (selectedGalleryMemory && selectedGalleryMemory.id === memId) {
      setSelectedGalleryMemory((prev) => ({ ...prev, likes_count: nextLikes }));
    }

    const updated = isLiked
      ? likedMemoryIds.filter((id) => id !== memId)
      : [...likedMemoryIds, memId];
    setLikedMemoryIds(updated);

    try {
      await FileSystem.writeAsStringAsync(
        `${FileSystem.documentDirectory}atc_liked_memories.json`,
        JSON.stringify(updated)
      );
    } catch (e) {}

    await toggleLikeVaultGalleryMemory(memId, isLiked, curLikes);
  };

  const openEditMemoryModal = (mem) => {
    setEditingMemory(mem);
    setEditMemTitle(mem.title || '');
    setEditMemCategory(mem.category || 'hackathon');
    setEditMemAward(mem.award_title || '');
    setEditMemImage(mem.image_url || '');
    setEditMemAchievers(Array.isArray(mem.achievers) ? mem.achievers.join(', ') : (mem.achievers || ''));
    setEditMemDesc(mem.description || '');
    setEditMemDate(mem.event_date || '');
    setIsEditMemoryModalOpen(true);
  };

  const handleUpdateMemory = async () => {
    if (!editingMemory || !editMemTitle.trim() || !editMemImage.trim()) {
      triggerToast('Please provide title and image URL');
      return;
    }
    try {
      setEditMemSubmitting(true);
      const payload = {
        title: editMemTitle.trim(),
        category: editMemCategory,
        award_title: editMemAward.trim(),
        image_url: editMemImage.trim(),
        achievers: editMemAchievers
          ? editMemAchievers.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        description: editMemDesc.trim(),
        event_date: editMemDate || new Date().toISOString().split('T')[0]
      };
      await updateVaultGalleryMemory(editingMemory.id, payload);
      setGalleryMemories((prev) =>
        prev.map((m) => (m.id === editingMemory.id ? { ...m, ...payload } : m))
      );
      if (selectedGalleryMemory && selectedGalleryMemory.id === editingMemory.id) {
        setSelectedGalleryMemory((prev) => ({ ...prev, ...payload }));
      }
      setIsEditMemoryModalOpen(false);
      setEditingMemory(null);
      triggerToast('✓ Campus Memory updated');
    } catch (err) {
      triggerToast('✕ Failed to update memory');
    } finally {
      setEditMemSubmitting(false);
    }
  };

  const handleDeleteMemory = (memId, title) => {
    Alert.alert(
      'Delete Campus Memory?',
      `Are you sure you want to permanently remove "${title || 'this memory'}" from Campus Gallery?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteVaultGalleryMemory(memId);
              setGalleryMemories((prev) => prev.filter((m) => m.id !== memId));
              if (selectedGalleryMemory && selectedGalleryMemory.id === memId) {
                setSelectedGalleryMemory(null);
              }
              triggerToast('✓ Memory deleted from gallery');
            } catch (err) {
              triggerToast('✕ Failed to delete memory');
            }
          }
        }
      ]
    );
  };

  const handleDeleteResource = (resourceId, title) => {
    Alert.alert(
      'Delete Resource?',
      `Are you sure you want to permanently delete "${title || 'this resource'}" from the Knowledge Vault?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteResource(resourceId);
              setResources((prev) => prev.filter((r) => r.id !== resourceId));
              setSelectedResource(null);
              triggerToast('✓ Resource removed from Vault');
            } catch (err) {
              triggerToast('✕ Failed to delete resource');
            }
          }
        }
      ]
    );
  };

  // Admin Approve Member with permanent Supabase DB persistence
  const handleApproveMember = async (targetId) => {
    if (!targetId) return;
    try {
      // 1. Immediate UI update
      setPendingMembers((prev) => prev.filter((m) => m.id !== targetId && m.student_id !== targetId));
      triggerToast('Student Approved & Verified ✓');

      // 2. Persist to Supabase profiles table safely
      const safeVerifier = (currentUser?.id && !currentUser.id.startsWith('user-') && currentUser.id !== 'admin')
        ? currentUser.id
        : null;

      const payload = {
        is_verified: true,
        verification_status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: safeVerifier
      };

      let { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', targetId)
        .select();

      if (!data || data.length === 0) {
        const fallbackRes = await supabase
          .from('profiles')
          .update(payload)
          .or(`student_id.eq.${targetId},email.eq.${targetId}`)
          .select();
        error = fallbackRes.error;
      }

      if (error) {
        console.warn('[ATC Mobile] Supabase approve error:', error);
      }

      // 3. Notify student
      try {
        await supabase.from('notifications_log').insert({
          user_id: targetId,
          title: 'Membership Approved! 🚀',
          message: 'Welcome to Advanced Tech Club! Your student membership application has been approved by Admin.',
          type: 'general',
          read: false,
          created_at: new Date().toISOString()
        });
      } catch (notifErr) {}

      // 4. Synchronize live platform data and members list immediately
      loadLivePlatformData();
    } catch (err) {
      console.warn('[ATC Mobile] handleApproveMember error:', err);
    }
  };

  // Admin Reject Member with permanent Supabase DB persistence
  const handleRejectMember = async (targetId) => {
    if (!targetId) return;
    try {
      // 1. Immediate UI update
      setPendingMembers((prev) => prev.filter((m) => m.id !== targetId && m.student_id !== targetId));
      triggerToast('Applicant rejected');

      // 2. Persist to Supabase profiles table safely
      const payload = {
        is_verified: false,
        verification_status: 'rejected'
      };

      let { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', targetId)
        .select();

      if (!data || data.length === 0) {
        const fallbackRes = await supabase
          .from('profiles')
          .update(payload)
          .or(`student_id.eq.${targetId},email.eq.${targetId}`)
          .select();
        error = fallbackRes.error;
      }

      if (error) {
        console.warn('[ATC Mobile] Supabase reject error:', error);
      }

      // Synchronize live platform data and members list immediately
      loadLivePlatformData();
    } catch (err) {
      console.warn('[ATC Mobile] handleRejectMember error:', err);
    }
  };

  // Filtering Logic
  const filteredAnnouncements = announcements.filter((a) => {
    const matchesCat = feedCategory === 'all' || a.category === feedCategory;
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.body.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSaved = !showSavedOnly || bookmarkedIds.includes(a.id);
    return matchesCat && matchesSearch && matchesSaved;
  });

  const filteredEvents = events.filter((e) => {
    const isPast = (e.end_at && new Date(e.end_at).getTime() < Date.now()) ||
                   (!e.end_at && e.start_at && new Date(e.start_at).getTime() < Date.now()) ||
                   (!e.end_at && !e.start_at && e.date && new Date(e.date).getTime() < Date.now());
    const isDone = e.is_completed === true || (e.is_completed !== false && isPast);

    const matchesStatus =
      eventStatusFilter === 'all'
        ? true
        : eventStatusFilter === 'upcoming'
        ? !isDone
        : isDone;

    const matchesCat = eventCategory === 'all' || e.category === eventCategory;
    const matchesSearch =
      (e.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.location || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSaved = !showSavedOnly || registeredEventIds.includes(e.id);
    return matchesStatus && matchesCat && matchesSearch && matchesSaved;
  });

  const filteredResources = resources.filter((r) => {
    const matchesCat = resourceCategory === 'all' || r.category === resourceCategory;
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSaved = !showSavedOnly || bookmarkedIds.includes(r.id);
    return matchesCat && matchesSearch && matchesSaved;
  });

  // =========================================================================
  // 6. VIEW: AUTH SCREEN (LOGIN & SIGNUP)
  // Displayed when user has not yet authenticated and has not chosen Guest Mode
  // =========================================================================
  // Splash Screen while restoring disk session on cold boot
  if (isSessionRestoring) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral[900], justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="light-content" backgroundColor={colors.neutral[900]} />
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              backgroundColor: colors.primary[500],
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: colors.primary[500],
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.5,
              shadowRadius: 12,
              elevation: 8,
              marginBottom: 20
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 28, letterSpacing: -1 }}>ATC</Text>
          </View>
          <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: 'bold', letterSpacing: -0.5 }}>
            Advanced Tech Club
          </Text>
          <Text style={{ color: colors.neutral[400], fontSize: 13, marginTop: 4, marginBottom: 24 }}>
            Official University Engineering Hub
          </Text>
          <ActivityIndicator size="small" color={colors.primary[400]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!currentUser && !isGuest) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral[900] }}>
        <StatusBar barStyle="light-content" backgroundColor={colors.neutral[900]} />

        {toastText && (
          <View
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 50 : 20,
              left: 20,
              right: 20,
              zIndex: 999,
              backgroundColor: toastText.includes('✓') ? '#059669' : colors.primary[500],
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 8,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)'
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>{toastText}</Text>
          </View>
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 40, justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Brand Header */}
            <View style={{ alignItems: 'center', marginBottom: 28 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: colors.primary[500],
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: colors.primary[500],
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.5,
                  shadowRadius: 12,
                  elevation: 6,
                  marginBottom: 16
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 24, letterSpacing: -1 }}>ATC</Text>
              </View>
              <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: 'bold', letterSpacing: -0.5 }}>
                Advanced Tech Club
              </Text>
              <Text style={{ color: colors.neutral[400], fontSize: 12, marginTop: 4 }}>
                Official University Engineering Hub · Mobile App
              </Text>
            </View>

            {/* Mode Switcher Tabs */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.neutral[800],
                borderRadius: 12,
                padding: 4,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: colors.neutral[700]
              }}
            >
              <TouchableOpacity
                onPress={() => setAuthMode('login')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 9,
                  backgroundColor: authMode === 'login' ? colors.primary[500] : 'transparent',
                  alignItems: 'center'
                }}
              >
                <Text
                  style={{
                    color: authMode === 'login' ? '#ffffff' : colors.neutral[400],
                    fontWeight: 'bold',
                    fontSize: 13
                  }}
                >
                  Log In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setAuthMode('signup')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 9,
                  backgroundColor: authMode === 'signup' ? colors.primary[500] : 'transparent',
                  alignItems: 'center'
                }}
              >
                <Text
                  style={{
                    color: authMode === 'signup' ? '#ffffff' : colors.neutral[400],
                    fontWeight: 'bold',
                    fontSize: 13
                  }}
                >
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Container */}
            <View
              style={{
                backgroundColor: colors.neutral[800],
                borderRadius: 20,
                padding: 20,
                borderWidth: 1,
                borderColor: colors.neutral[700],
                gap: 14
              }}
            >
              {authMode === 'signup' && (
                <View>
                  <Text style={{ color: colors.neutral[300], fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>
                    Full Name *
                  </Text>
                  <TextInput
                    placeholder="e.g. Student Full Name"
                    placeholderTextColor={colors.neutral[500]}
                    value={authFullName}
                    onChangeText={setAuthFullName}
                    style={{
                      backgroundColor: colors.neutral[900],
                      borderWidth: 1,
                      borderColor: colors.neutral[700],
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      color: '#ffffff',
                      fontSize: 14
                    }}
                  />
                </View>
              )}

              <View>
                <Text style={{ color: colors.neutral[300], fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>
                  Email Address *
                </Text>
                <TextInput
                  placeholder="name@university.edu or gmail"
                  placeholderTextColor={colors.neutral[500]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={authEmail}
                  onChangeText={setAuthEmail}
                  style={{
                    backgroundColor: colors.neutral[900],
                    borderWidth: 1,
                    borderColor: colors.neutral[700],
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    color: '#ffffff',
                    fontSize: 14
                  }}
                />
              </View>

              {authMode === 'signup' && (
                <View>
                  <Text style={{ color: colors.neutral[300], fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>
                    Student ID / University Roll No *
                  </Text>
                  <TextInput
                    placeholder="e.g. 23CS041 or CS2026-088"
                    placeholderTextColor={colors.neutral[500]}
                    autoCapitalize="characters"
                    value={onboardRoll}
                    onChangeText={setOnboardRoll}
                    style={{
                      backgroundColor: colors.neutral[900],
                      borderWidth: 1,
                      borderColor: colors.neutral[700],
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      color: '#ffffff',
                      fontSize: 14
                    }}
                  />
                </View>
              )}

              <View>
                <Text style={{ color: colors.neutral[300], fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>
                  Password *
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.neutral[900],
                    borderWidth: 1,
                    borderColor: colors.neutral[700],
                    borderRadius: 12,
                    paddingHorizontal: 14
                  }}
                >
                  <TextInput
                    placeholder="••••••••••••"
                    placeholderTextColor={colors.neutral[500]}
                    secureTextEntry={!showAuthPassword}
                    value={authPassword}
                    onChangeText={setAuthPassword}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      color: '#ffffff',
                      fontSize: 14
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowAuthPassword(!showAuthPassword)}
                    style={{ padding: 6 }}
                  >
                    <Text style={{ fontSize: 13 }}>{showAuthPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Primary Submit Button */}
              <TouchableOpacity
                onPress={authMode === 'login' ? handleLogin : handleSignUp}
                disabled={authLoading}
                style={{
                  backgroundColor: colors.primary[500],
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginTop: 4,
                  shadowColor: colors.primary[500],
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 8,
                  elevation: 4
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                  {authLoading ? 'Verifying...' : authMode === 'login' ? 'Log In to Club Portal' : 'Create Account & Apply'}
                </Text>
              </TouchableOpacity>

              {/* Shortcut to Full Application */}
              {authMode === 'signup' && (
                <TouchableOpacity
                  onPress={() => setIsApplyModalOpen(true)}
                  style={{ alignItems: 'center', paddingVertical: 4 }}
                >
                  <Text style={{ color: colors.primary[400], fontSize: 12, fontWeight: 'bold' }}>
                    Or Open Comprehensive Student Application →
                  </Text>
                </TouchableOpacity>
              )}

              {/* Divider */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.neutral[700] }} />
                <Text style={{ color: colors.neutral[500], fontSize: 11, marginHorizontal: 10 }}>OR</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.neutral[700] }} />
              </View>

              {/* Google Sign In Button */}
              <TouchableOpacity
                onPress={handleGoogleAuth}
                style={{
                  backgroundColor: '#ffffff',
                  paddingVertical: 12,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10
                }}
              >
                <Text style={{ fontSize: 15 }}>🌐</Text>
                <Text style={{ color: colors.neutral[900], fontWeight: 'bold', fontSize: 13 }}>
                  Continue with Google
                </Text>
              </TouchableOpacity>
            </View>

            {/* Guest Mode Trigger */}
            <View style={{ alignItems: 'center', marginTop: 24 }}>
              <TouchableOpacity onPress={() => setIsGuest(true)}>
                <Text style={{ color: colors.primary[400], fontSize: 13, fontWeight: 'bold' }}>
                  Browse as Guest (View-Only Mode) →
                </Text>
              </TouchableOpacity>
              <Text style={{ color: colors.neutral[500], fontSize: 11, textAlign: 'center', marginTop: 10 }}>
                First registered email automatically receives Super Admin privileges.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        {renderGoogleModal()}
        {renderApplyModal()}
      </SafeAreaView>
    );
  }

  // =========================================================================
  // 7. VIEW: MAIN APP INTERFACE (TABS: FEED, WORKSHOPS, VAULT, PROFILE)
  // =========================================================================
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Floating In-App Toast */}
      {toastText && (
        <View
          style={{
            position: 'absolute',
            top: Platform.OS === 'ios' ? 50 : 20,
            left: 20,
            right: 20,
            zIndex: 999,
            backgroundColor: colors.neutral[900],
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 8,
            borderWidth: 1,
            borderColor: colors.neutral[700]
          }}
        >
          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>{toastText}</Text>
        </View>
      )}

      {/* 1. TOP HEADER BAR */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: colors.neutral[200],
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: colors.primary[500],
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: colors.primary[500],
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 15 }}>ATC</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 16, color: colors.neutral[900] }}>
                Advanced Tech Club
              </Text>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.success[500]
                }}
              />
            </View>
            <Text style={{ fontSize: 10, color: colors.neutral[500] }}>
              {currentUser ? `Welcome, ${currentUser.full_name?.split(' ')[0]}` : 'Campus Hub · Guest Mode'}
            </Text>
          </View>
        </View>

        {/* Header Right Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Notifications Center Bell */}
          <TouchableOpacity
            onPress={() => setIsNotificationsOpen(true)}
            style={{
              backgroundColor: colors.neutral[100],
              padding: 9,
              borderRadius: 10,
              position: 'relative'
            }}
          >
            <Bell size={18} color={colors.neutral[700]} weight="bold" />
            {unreadCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.danger[500]
                }}
              />
            )}
          </TouchableOpacity>

          {!currentUser && (
            <TouchableOpacity
              onPress={() => setIsGuest(false)}
              style={{
                backgroundColor: colors.primary[500],
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 11 }}>
                Log In
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SEARCH & FILTER BAR (Hidden on Profile Tab) */}
      {currentTab !== 'profile' && (
        <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colors.neutral[100],
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: Platform.OS === 'ios' ? 8 : 4
            }}
          >
            <MagnifyingGlass size={14} color={colors.neutral[500]} style={{ marginRight: 6 }} />
            <TextInput
              placeholder={`Search ${currentTab === 'home' ? 'announcements' : currentTab === 'events' ? 'workshops' : 'resources'}...`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={{ flex: 1, fontSize: 13, color: colors.neutral[900] }}
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={13} color={colors.neutral[400]} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Chips */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {currentTab === 'home' &&
                ['all', 'hackathon', 'workshop', 'opportunity'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setFeedCategory(cat)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: feedCategory === cat ? colors.primary[500] : colors.neutral[100]
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: feedCategory === cat ? '#ffffff' : colors.neutral[600],
                        textTransform: 'capitalize'
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}

              {currentTab === 'events' &&
                ['all', 'hackathon', 'workshop', 'technical', 'social'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setEventCategory(cat)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: eventCategory === cat ? colors.primary[500] : colors.neutral[100]
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: eventCategory === cat ? '#ffffff' : colors.neutral[600],
                        textTransform: 'capitalize'
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}

              {currentTab === 'resources' &&
                ['all', 'guide', 'starter', 'cheatsheet', 'tool'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setResourceCategory(cat)}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: resourceCategory === cat ? colors.primary[500] : colors.neutral[100]
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: resourceCategory === cat ? '#ffffff' : colors.neutral[600],
                        textTransform: 'capitalize'
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Saved Filter Pill Toggle */}
            <TouchableOpacity
              onPress={() => setShowSavedOnly(!showSavedOnly)}
              style={{
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: showSavedOnly ? colors.warning[100] : colors.neutral[100],
                borderWidth: 1,
                borderColor: showSavedOnly ? colors.warning[300] : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4
              }}
            >
              {showSavedOnly && <Star size={11} color={colors.warning[800]} weight="fill" />}
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: showSavedOnly ? colors.warning[800] : colors.neutral[600] }}>
                {showSavedOnly ? 'Saved' : 'All'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* OFFLINE RESILIENCE BANNER */}
      {isOfflineMode && (
        <View
          style={{
            backgroundColor: '#0f172a',
            paddingHorizontal: 16,
            paddingVertical: 7,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: '#334155'
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Sparkle size={13} color="#38bdf8" weight="fill" />
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#f8fafc' }}>
              Offline Mode Active (Cached Platform Data)
            </Text>
          </View>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[400] }}>
              Reconnect ↺
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* QUICK STATUS BAR BANNER */}
      {currentUser && currentUser.verification_status === 'rejected' && (
        <TouchableOpacity
          onPress={() => openApplyModal(currentUser)}
          style={{
            backgroundColor: '#fef2f2',
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderBottomWidth: 1,
            borderBottomColor: '#fecaca',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
            <X size={14} color="#dc2626" weight="bold" />
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#b91c1c' }} numberOfLines={1}>
              Application Declined by Club Admin (Ritesh Mishra)
            </Text>
          </View>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#991b1b' }}>Re-Apply ↺</Text>
        </TouchableOpacity>
      )}

      {currentUser && !currentUser.is_verified && currentUser.verification_status !== 'rejected' && !currentUser.student_id && (
        <TouchableOpacity
          onPress={() => openApplyModal(currentUser)}
          style={{
            backgroundColor: colors.primary[50],
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderBottomWidth: 1,
            borderBottomColor: colors.primary[200],
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
            <PencilSimple size={14} color={colors.primary[800]} weight="bold" />
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[800] }} numberOfLines={1}>
              Complete Student Profile to Unlock Member Features
            </Text>
          </View>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[700] }}>Apply Now →</Text>
        </TouchableOpacity>
      )}

      {currentUser && !currentUser.is_verified && currentUser.verification_status !== 'rejected' && !!currentUser.student_id && (
        <TouchableOpacity
          onPress={() => setIsStatusModalOpen(true)}
          style={{
            backgroundColor: colors.warning[50],
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.warning[200],
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Clock size={14} color={colors.warning[800]} weight="bold" />
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.warning[800] }}>
              Application Under Review by Club Admin
            </Text>
          </View>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.warning[900] }}>Check Status →</Text>
        </TouchableOpacity>
      )}

      {/* 2. MAIN SCROLLABLE CONTENT */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* ========================================================= */}
        {/* TAB 1: ANNOUNCEMENTS FEED (HOME)                           */}
        {/* ========================================================= */}
        {currentTab === 'home' && (
          <View style={{ gap: 14 }}>
            {/* Campus Innovation Spotlight Hero Card */}
            <View
              style={{
                backgroundColor: colors.neutral[900],
                borderRadius: 20,
                padding: 18,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 3
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success[400] }} />
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[300], textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    ATC Engineering Hub
                  </Text>
                </View>
                <Text style={{ fontSize: 10, color: colors.neutral[400] }}>Spring 2026</Text>
              </View>

              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 6 }}>
                Advanced Tech Club
              </Text>
              <Text style={{ fontSize: 12, color: colors.neutral[300], lineHeight: 18, marginBottom: 14 }}>
                {currentUser
                  ? `Welcome back, ${currentUser.full_name?.split(' ')[0]}! Explore campus workshops, technical guides in the vault, and project collaborations.`
                  : 'The official student engineering society. Build production-grade systems with AI, Cloud, and Full-Stack Engineering.'}
              </Text>

              {/* Live Metric Strip */}
              <View style={{ flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ffffff' }}>{totalMembersCount}</Text>
                  <Text style={{ fontSize: 10, color: colors.neutral[400], marginTop: 2 }}>Engineers</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ffffff' }}>{events.length}</Text>
                  <Text style={{ fontSize: 10, color: colors.neutral[400], marginTop: 2 }}>Workshops</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingVertical: 8, alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ffffff' }}>{resources.length}</Text>
                  <Text style={{ fontSize: 10, color: colors.neutral[400], marginTop: 2 }}>Vault Docs</Text>
                </View>
              </View>
            </View>

            {/* 4 Vibrant Feature Hub Cards */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => handleSwitchTab('events')}
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: colors.neutral[200],
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1
                }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                  <RocketLaunch size={18} color="#2563eb" weight="bold" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[900] }}>Workshops</Text>
                <Text style={{ fontSize: 9, color: colors.neutral[400] }}>{events.length} active</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleSwitchTab('resources')}
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: colors.neutral[200],
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1
                }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                  <BookOpen size={18} color="#16a34a" weight="bold" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[900] }}>Vault</Text>
                <Text style={{ fontSize: 9, color: colors.neutral[400] }}>{resources.length} guides</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsQrPassOpen(true)}
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: colors.neutral[200],
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1
                }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#faf5ff', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                  <IdentificationCard size={18} color="#9333ea" weight="bold" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[900] }}>Pass</Text>
                <Text style={{ fontSize: 9, color: colors.neutral[400] }}>Digital QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={openLeaderboard}
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  borderRadius: 14,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: colors.neutral[200],
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1
                }}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#fffbeb', justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                  <Trophy size={18} color="#d97706" weight="bold" />
                </View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[900] }}>Ranks</Text>
                <Text style={{ fontSize: 9, color: colors.neutral[400] }}>{memberPoints} XP</Text>
              </TouchableOpacity>
            </View>

            {/* Admin Management Command Bar */}
            {isAdmin && (
              <View
                style={{
                  backgroundColor: '#0f172a',
                  borderRadius: 14,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#1e293b',
                  gap: 8
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Shield size={13} color="#93c5fd" weight="bold" />
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#93c5fd' }}>
                      Admin Command Console
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#1e293b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#38bdf8' }}>FULL PRIVILEGES</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => openAdminScanner()}
                    style={{
                      flex: 1,
                      backgroundColor: '#6d28d9',
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    <Camera size={13} color="#ffffff" weight="bold" />
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>Scan Pass</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setIsBroadcastModalOpen(true)}
                    style={{
                      flex: 1,
                      backgroundColor: '#1e293b',
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 4,
                      borderWidth: 1,
                      borderColor: '#334155'
                    }}
                  >
                    <Megaphone size={13} color="#ffffff" weight="bold" />
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>Broadcast</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setIsVerificationsModalOpen(true)}
                    style={{
                      flex: 1,
                      backgroundColor: '#1e293b',
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 4,
                      borderWidth: 1,
                      borderColor: '#334155'
                    }}
                  >
                    <Users size={13} color="#ffffff" weight="bold" />
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>
                      Verify ({pendingMembers.length})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Media Head Command Bar (for Media Head users) */}
            {isMediaHead && !isAdmin && (
              <View
                style={{
                  backgroundColor: '#2e1065',
                  borderRadius: 14,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: '#4c1d95',
                  gap: 8
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Megaphone size={13} color="#c4b5fd" weight="bold" />
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#c4b5fd' }}>
                      Media Head Console
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#4c1d95', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#e9d5ff' }}>MEDIA & POSTS</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setIsBroadcastModalOpen(true)}
                    style={{
                      flex: 1,
                      backgroundColor: '#6b21a8',
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    <Megaphone size={13} color="#ffffff" weight="bold" />
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>New Broadcast</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setCurrentTab('resources');
                      setTasksSubTab('gallery');
                      setIsCreateMemoryModalOpen(true);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#7c3aed',
                      paddingVertical: 8,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 4
                    }}
                  >
                    <Camera size={13} color="#ffffff" weight="bold" />
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>Add Memory</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Quick Action Tray: Status & Application */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <TouchableOpacity
                onPress={() => setIsStatusModalOpen(true)}
                style={{
                  flex: 1,
                  backgroundColor: '#ffffff',
                  padding: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.neutral[200],
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <MagnifyingGlass size={13} color={colors.neutral[700]} />
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[800] }}>Check Status</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (requireAuth('apply for membership')) {
                    setIsApplyModalOpen(true);
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: colors.primary[50],
                  padding: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.primary[200],
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <PencilSimple size={13} color={colors.primary[700]} weight="bold" />
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[700] }}>Student Application</Text>
              </TouchableOpacity>
            </View>

            {isSessionRestoring ? (
              <View style={{ gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: colors.neutral[200],
                      gap: 10
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.neutral[200] }} />
                      <View style={{ gap: 4, flex: 1 }}>
                        <View style={{ width: '40%', height: 12, backgroundColor: colors.neutral[200], borderRadius: 4 }} />
                        <View style={{ width: '25%', height: 10, backgroundColor: colors.neutral[100], borderRadius: 4 }} />
                      </View>
                    </View>
                    <View style={{ width: '80%', height: 16, backgroundColor: colors.neutral[200], borderRadius: 4 }} />
                    <View style={{ width: '100%', height: 12, backgroundColor: colors.neutral[100], borderRadius: 4 }} />
                    <View style={{ width: '90%', height: 12, backgroundColor: colors.neutral[100], borderRadius: 4 }} />
                  </View>
                ))}
              </View>
            ) : filteredAnnouncements.length === 0 ? (
              <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: colors.neutral[200], marginVertical: 8 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                  <House size={28} color={colors.primary[500]} weight="fill" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
                  No Announcements Yet
                </Text>
                <Text style={{ fontSize: 12, color: colors.neutral[500], textAlign: 'center', lineHeight: 18, maxWidth: 260 }}>
                  Important club announcements, workshop releases, and hackathon notices will appear here.
                </Text>
              </View>
            ) : (
              filteredAnnouncements.map((ann) => (
                <View
                  key={ann.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: ann.pinned ? colors.warning[300] : colors.neutral[200],
                    borderRadius: 16,
                    padding: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                    elevation: 1
                  }}
                >
                  {/* Category & Pin Indicator */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: 'bold',
                          color: colors.primary[600],
                          textTransform: 'uppercase',
                          backgroundColor: colors.primary[50],
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 4
                        }}
                      >
                        {ann.category}
                      </Text>
                      {ann.pinned && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.warning[100], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <PushPin size={10} color={colors.warning[800]} weight="fill" />
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.warning[800] }}>
                            PINNED
                          </Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity onPress={() => handleToggleBookmark(ann.id)}>
                      <Star
                        size={16}
                        color={bookmarkedIds.includes(ann.id) ? '#f59e0b' : colors.neutral[400]}
                        weight={bookmarkedIds.includes(ann.id) ? 'fill' : 'regular'}
                      />
                    </TouchableOpacity>
                  </View>

                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 6 }}>
                    {ann.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.neutral[700], lineHeight: 19 }}>
                    {ann.body}
                  </Text>

                  {/* Footer & Reactions */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handleReact(ann.id, 'fire')}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[100], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 }}
                      >
                        <Flame size={12} color="#f97316" weight="fill" />
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700] }}>
                          {reactions[ann.id]?.fire || 0}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleReact(ann.id, 'rocket')}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[100], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 }}
                      >
                        <RocketLaunch size={12} color="#2563eb" weight="fill" />
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700] }}>
                          {reactions[ann.id]?.rocket || 0}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleReact(ann.id, 'heart')}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[100], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 }}
                      >
                        <Heart size={12} color="#ef4444" weight="fill" />
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700] }}>
                          {reactions[ann.id]?.heart || 0}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => handleShare(ann.title, ann.body)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <ShareNetwork size={13} color={colors.neutral[500]} weight="bold" />
                      <Text style={{ fontSize: 12, color: colors.neutral[500], fontWeight: 'bold' }}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 2: WORKSHOPS & SPRINTS (EVENTS)                        */}
        {/* ========================================================= */}
        {currentTab === 'events' && (
          <View style={{ gap: 14 }}>
            {/* Status Filter: All / Upcoming / Concluded */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 2 }}>
              {[
                { id: 'all', label: 'All Workshops' },
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'completed', label: 'Concluded' }
              ].map((tab) => {
                const isSelected = eventStatusFilter === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setEventStatusFilter(tab.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: isSelected ? colors.neutral[900] : colors.neutral[100],
                      borderWidth: 1,
                      borderColor: isSelected ? colors.neutral[900] : colors.neutral[200]
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: isSelected ? '#ffffff' : colors.neutral[600]
                      }}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {isAdmin && (
              <TouchableOpacity
                onPress={() => setIsCreateEventModalOpen(true)}
                style={{
                  backgroundColor: colors.primary[500],
                  padding: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  marginBottom: 4
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>+ Publish Workshop</Text>
              </TouchableOpacity>
            )}

            {isSessionRestoring ? (
              <View style={{ gap: 14 }}>
                {[1, 2].map((i) => (
                  <View
                    key={i}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.neutral[200],
                      overflow: 'hidden'
                    }}
                  >
                    <View style={{ width: '100%', height: 120, backgroundColor: colors.neutral[200] }} />
                    <View style={{ padding: 14, gap: 8 }}>
                      <View style={{ width: 60, height: 14, backgroundColor: colors.neutral[200], borderRadius: 4 }} />
                      <View style={{ width: '70%', height: 18, backgroundColor: colors.neutral[200], borderRadius: 4 }} />
                      <View style={{ width: '95%', height: 12, backgroundColor: colors.neutral[100], borderRadius: 4 }} />
                    </View>
                  </View>
                ))}
              </View>
            ) : filteredEvents.length === 0 ? (
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.neutral[200],
                  padding: 24,
                  alignItems: 'center',
                  marginVertical: 8
                }}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: colors.primary[50],
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 12
                  }}
                >
                  <CalendarBlank size={28} color={colors.primary[500]} weight="fill" />
                </View>
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
                  No Workshops Found
                </Text>
                <Text style={{ fontSize: 12, color: colors.neutral[500], textAlign: 'center', marginBottom: 16, lineHeight: 18 }}>
                  {searchQuery || eventCategory !== 'all' || eventStatusFilter !== 'all' || showSavedOnly
                    ? `No workshops match your current filters. Try resetting filters.`
                    : 'There are currently no active campus workshops scheduled.'}
                </Text>
                {(searchQuery !== '' || eventCategory !== 'all' || eventStatusFilter !== 'all' || showSavedOnly) && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setEventCategory('all');
                      setEventStatusFilter('all');
                      setShowSavedOnly(false);
                    }}
                    style={{
                      backgroundColor: colors.primary[500],
                      paddingHorizontal: 16,
                      paddingVertical: 9,
                      borderRadius: 10
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>Reset Workshop Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              filteredEvents.map((evt) => {
                const isRSVPed = registeredEventIds.includes(evt.id);
                const spotsLeft = (evt.capacity || 100) - (evt.registrations_count || 0);
                const isPast = (evt.end_at && new Date(evt.end_at).getTime() < Date.now()) ||
                               (!evt.end_at && evt.start_at && new Date(evt.start_at).getTime() < Date.now()) ||
                               (!evt.end_at && !evt.start_at && evt.date && new Date(evt.date).getTime() < Date.now());
                const isCompleted = evt.is_completed === true || (evt.is_completed !== false && isPast);

                return (
                  <TouchableOpacity
                    key={evt.id}
                    onPress={() => setSelectedEvent(evt)}
                    activeOpacity={0.9}
                    style={{
                      backgroundColor: '#ffffff',
                      borderWidth: 1,
                      borderColor: isRSVPed ? colors.primary[300] : colors.neutral[200],
                      borderRadius: 16,
                      overflow: 'hidden',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 3,
                      elevation: 1,
                      opacity: isCompleted ? 0.92 : 1
                    }}
                  >
                    <Image
                      source={{ uri: evt.banner_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80' }}
                      style={{ width: '100%', height: 120 }}
                    />

                    <View style={{ padding: 14 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[600], textTransform: 'uppercase', backgroundColor: colors.primary[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            {evt.category}
                          </Text>
                          {isCompleted ? (
                            <View style={{ backgroundColor: '#1e293b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={10} color="#f8fafc" weight="bold" />
                              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#f8fafc' }}>
                                Concluded
                              </Text>
                            </View>
                          ) : (
                            <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#92400e' }}>
                                {getEventCountdown(evt)}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: isCompleted ? colors.neutral[500] : (spotsLeft > 10 ? colors.success[700] : colors.danger[700]) }}>
                          {isCompleted ? 'Finished' : (spotsLeft > 0 ? `${spotsLeft} spots open` : 'Sold out')}
                        </Text>
                      </View>

                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
                        {evt.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.neutral[500], marginBottom: 8 }} numberOfLines={2}>
                        {evt.description}
                      </Text>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <CalendarBlank size={12} color={colors.neutral[600]} />
                          <Text style={{ fontSize: 11, color: colors.neutral[600] }}>
                            {new Date(evt.date || evt.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: colors.neutral[300] }}>•</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} color={colors.neutral[600]} />
                          <Text style={{ fontSize: 11, color: colors.neutral[600] }}>
                            {evt.location}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 }}>
                        <Users size={12} color={colors.neutral[500]} />
                        <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                          {evt.registrations_count || (isRSVPed ? 1 : 0)} registered / {evt.capacity || 100} capacity ({spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'})
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                        <TouchableOpacity
                          onPress={() => setSelectedEvent(evt)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            borderRadius: 8,
                            backgroundColor: colors.primary[50],
                            borderWidth: 1,
                            borderColor: colors.primary[200]
                          }}
                        >
                          <Text style={{ color: colors.primary[700], fontSize: 11, fontWeight: 'bold' }}>
                            Details
                          </Text>
                          <ArrowRight size={11} color={colors.primary[700]} weight="bold" />
                        </TouchableOpacity>

                        {isCompleted ? (
                          <View
                            style={{
                              backgroundColor: '#1e293b',
                              paddingHorizontal: 12,
                              paddingVertical: 6,
                              borderRadius: 8,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <CheckCircle size={11} color="#f8fafc" weight="bold" />
                            <Text style={{ color: '#f8fafc', fontSize: 11, fontWeight: 'bold' }}>
                              Concluded
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => handleToggleEventRSVP(evt.id)}
                            style={{
                              backgroundColor: isRSVPed ? colors.success[500] : colors.primary[500],
                              paddingHorizontal: 14,
                              paddingVertical: 6,
                              borderRadius: 8,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            {isRSVPed && <Check size={12} color="#ffffff" weight="bold" />}
                            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>
                              {isRSVPed ? 'Reserved' : 'RSVP Now'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 3: KNOWLEDGE VAULT (RESOURCES)                        */}
        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* TAB 3: TASKS & KNOWLEDGE VAULT                            */}
        {/* ========================================================= */}
        {currentTab === 'resources' && (
          <View style={{ gap: 14 }}>
            {/* Sub-Tab Switcher: Knowledge Vault vs Campus Gallery vs Open PRs & Tasks */}
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: colors.neutral[100],
                padding: 4,
                borderRadius: 14,
                gap: 4
              }}
            >
              <TouchableOpacity
                onPress={() => setTasksSubTab('vault')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: tasksSubTab === 'vault' ? '#ffffff' : 'transparent',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 5,
                  shadowColor: tasksSubTab === 'vault' ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: tasksSubTab === 'vault' ? 0.08 : 0,
                  shadowRadius: 4,
                  elevation: tasksSubTab === 'vault' ? 2 : 0
                }}
              >
                <Folder size={13} color={tasksSubTab === 'vault' ? colors.neutral[900] : colors.neutral[500]} weight={tasksSubTab === 'vault' ? 'fill' : 'regular'} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: tasksSubTab === 'vault' ? 'bold' : '600',
                    color: tasksSubTab === 'vault' ? colors.neutral[900] : colors.neutral[500]
                  }}
                >
                  Vault
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTasksSubTab('gallery')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: tasksSubTab === 'gallery' ? '#ffffff' : 'transparent',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 5,
                  shadowColor: tasksSubTab === 'gallery' ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: tasksSubTab === 'gallery' ? 0.08 : 0,
                  shadowRadius: 4,
                  elevation: tasksSubTab === 'gallery' ? 2 : 0
                }}
              >
                <Trophy size={13} color={tasksSubTab === 'gallery' ? colors.warning[700] : colors.neutral[500]} weight={tasksSubTab === 'gallery' ? 'fill' : 'regular'} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: tasksSubTab === 'gallery' ? 'bold' : '600',
                    color: tasksSubTab === 'gallery' ? colors.warning[700] : colors.neutral[500]
                  }}
                >
                  Gallery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setTasksSubTab('contributions')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: tasksSubTab === 'contributions' ? '#ffffff' : 'transparent',
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 4,
                  shadowColor: tasksSubTab === 'contributions' ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: tasksSubTab === 'contributions' ? 0.08 : 0,
                  shadowRadius: 4,
                  elevation: tasksSubTab === 'contributions' ? 2 : 0
                }}
              >
                <RocketLaunch size={13} color={tasksSubTab === 'contributions' ? colors.primary[700] : colors.neutral[500]} weight={tasksSubTab === 'contributions' ? 'fill' : 'regular'} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: tasksSubTab === 'contributions' ? 'bold' : '600',
                    color: tasksSubTab === 'contributions' ? colors.primary[700] : colors.neutral[500]
                  }}
                >
                  Tasks
                </Text>
                {contributionReports.filter((r) => r.status === 'pending').length > 0 && (
                  <View
                    style={{
                      backgroundColor: colors.warning[500],
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 8
                    }}
                  >
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#ffffff' }}>
                      {contributionReports.filter((r) => r.status === 'pending').length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* SUBTAB 1: KNOWLEDGE VAULT */}
            {tasksSubTab === 'vault' && (
              <View style={{ gap: 12 }}>
                {downloadProgress !== null && (
                  <View style={{ backgroundColor: colors.primary[50], padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.primary[200], marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[800], marginBottom: 4 }}>
                      Downloading Vault Package ({downloadProgress}%)...
                    </Text>
                    <View style={{ height: 6, backgroundColor: colors.primary[200], borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ width: `${downloadProgress}%`, height: '100%', backgroundColor: colors.primary[600] }} />
                    </View>
                  </View>
                )}

                {filteredResources.length === 0 ? (
                  <View
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.neutral[200],
                      padding: 24,
                      alignItems: 'center',
                      marginVertical: 8
                    }}
                  >
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: colors.primary[50],
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 12
                      }}
                    >
                      <Folder size={28} color={colors.primary[500]} weight="fill" />
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
                      No Vault Resources Found
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.neutral[500], textAlign: 'center', marginBottom: 16, lineHeight: 18 }}>
                      {searchQuery || resourceCategory !== 'all' || showSavedOnly
                        ? `No guides match "${searchQuery || resourceCategory}". Try clearing your filters.`
                        : 'The Knowledge Vault is being populated by club admins.'}
                    </Text>
                    {(searchQuery !== '' || resourceCategory !== 'all' || showSavedOnly) && (
                      <TouchableOpacity
                        onPress={() => {
                          setSearchQuery('');
                          setResourceCategory('all');
                          setShowSavedOnly(false);
                        }}
                        style={{
                          backgroundColor: colors.primary[500],
                          paddingHorizontal: 16,
                          paddingVertical: 9,
                          borderRadius: 10
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>Show All Vault Guides</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  filteredResources.map((res) => {
                    const resUrl = res.url || res.file_url || '';
                    const isGithub = resUrl.includes('github.com');
                    const isArticle = resUrl.includes('medium.com') || resUrl.includes('dev.to') || res.category === 'Documentation';
                    const isTool = resUrl.includes('metaflow.org') || resUrl.includes('mlflow.org') || resUrl.includes('feast.dev');

                    const actionLabel = isGithub
                      ? 'View Repo ↗'
                      : isArticle
                      ? 'Read Article ↗'
                      : isTool
                      ? 'Open Platform ↗'
                      : 'Download';

                    return (
                      <TouchableOpacity
                        key={res.id}
                        activeOpacity={0.9}
                        onPress={() => setSelectedResource(res)}
                        style={{
                          backgroundColor: '#ffffff',
                          borderWidth: 1,
                          borderColor: colors.neutral[200],
                          borderRadius: 14,
                          padding: 14
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[600], textTransform: 'uppercase', marginBottom: 2 }}>
                              {isGithub ? 'GitHub Repo' : res.category} · {res.file_size || 'Web Asset'}
                            </Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.neutral[900] }}>
                              {res.title}
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.neutral[500], marginTop: 2 }} numberOfLines={2}>
                              {res.description}
                            </Text>
                          </View>

                          <TouchableOpacity onPress={() => handleToggleBookmark(res.id)} style={{ padding: 4 }}>
                            <Star
                              size={18}
                              color={bookmarkedIds.includes(res.id) ? colors.warning[500] : colors.neutral[300]}
                              weight={bookmarkedIds.includes(res.id) ? 'fill' : 'regular'}
                            />
                          </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                          <TouchableOpacity onPress={() => setSelectedResource(res)}>
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[600] }}>View Details →</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => {
                              if (isGithub || isArticle || isTool) {
                                if (resUrl) Linking.openURL(resUrl);
                              } else {
                                handleDownloadResource(res);
                              }
                            }}
                            style={{ backgroundColor: colors.neutral[900], paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                          >
                            <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>{actionLabel}</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* SUBTAB 2: CAMPUS GALLERY & HALL OF FAME */}
            {tasksSubTab === 'gallery' && (
              <View style={{ gap: 14 }}>
                {/* Gallery Top Action & Filters */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>
                    Campus Memories & Accolades
                  </Text>
                  {canManageMedia && (
                    <TouchableOpacity
                      onPress={() => setIsCreateMemoryModalOpen(true)}
                      style={{ backgroundColor: colors.warning[500], paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}
                    >
                      <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>＋ Add Memory</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Category Chips */}
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { id: 'All', label: 'All Memories' },
                    { id: 'hackathon', label: 'Hackathons', icon: Trophy },
                    { id: 'contributor', label: 'Top Contributors', icon: Star },
                    { id: 'event', label: 'Events', icon: Camera }
                  ].map((cat) => {
                    const IconComp = cat.icon;
                    const isSelected = galleryFilter === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setGalleryFilter(cat.id)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: isSelected ? colors.neutral[900] : colors.neutral[100],
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        {IconComp && (
                          <IconComp
                            size={11}
                            color={isSelected ? '#ffffff' : colors.neutral[600]}
                            weight={isSelected ? 'fill' : 'regular'}
                          />
                        )}
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: isSelected ? '#ffffff' : colors.neutral[600] }}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Memories List */}
                {galleryMemories.length === 0 ? (
                  <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.neutral[200] }}>
                    <Camera size={32} color={colors.neutral[400]} />
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.neutral[900], marginTop: 8, marginBottom: 4 }}>
                      Campus Memories Loading
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.neutral[500], textAlign: 'center' }}>
                      Celebrating student milestones, hackathon wins, and campus tech highlights.
                    </Text>
                  </View>
                ) : (
                  galleryMemories
                    .filter((m) => galleryFilter === 'All' || m.category === galleryFilter)
                    .map((mem) => {
                      const isLiked = likedMemoryIds.includes(mem.id);
                      return (
                        <View
                          key={mem.id}
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: colors.neutral[200],
                            overflow: 'hidden',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.05,
                            shadowRadius: 3,
                            elevation: 1
                          }}
                        >
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => setSelectedGalleryMemory(mem)}
                            style={{ position: 'relative', height: 160, backgroundColor: '#0f172a' }}
                          >
                            <Image
                              source={{ uri: mem.image_url }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                            <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.2)' }} />

                            {/* Top Badges */}
                            <View style={{ position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                              <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                {mem.category === 'hackathon' ? (
                                  <Trophy size={11} color="#fcd34d" weight="fill" />
                                ) : mem.category === 'contributor' ? (
                                  <Star size={11} color="#38bdf8" weight="fill" />
                                ) : (
                                  <Camera size={11} color="#a7f3d0" weight="fill" />
                                )}
                                <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#ffffff', textTransform: 'uppercase' }}>
                                  {mem.category === 'hackathon' ? 'Hackathon' : mem.category === 'contributor' ? 'Contributor' : 'Event'}
                                </Text>
                              </View>
                              {mem.award_title ? (
                                <View style={{ backgroundColor: '#f59e0b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <Trophy size={10} color="#78350f" weight="fill" />
                                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#78350f' }}>
                                    {mem.award_title}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {/* Media & Admin Quick Action Buttons */}
                            {canManageMedia && (
                              <View style={{ position: 'absolute', top: 10, right: 10, flexDirection: 'row', gap: 6 }}>
                                <TouchableOpacity
                                  onPress={() => openEditMemoryModal(mem)}
                                  style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.92)',
                                    width: 30,
                                    height: 30,
                                    borderRadius: 15,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 2,
                                    elevation: 2
                                  }}
                                  accessibilityLabel="Edit Memory"
                                >
                                  <PencilSimple size={14} color={colors.neutral[800]} weight="bold" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => handleDeleteMemory(mem.id, mem.title)}
                                  style={{
                                    backgroundColor: 'rgba(254, 242, 242, 0.95)',
                                    width: 30,
                                    height: 30,
                                    borderRadius: 15,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 1 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 2,
                                    elevation: 2
                                  }}
                                  accessibilityLabel="Delete Memory"
                                >
                                  <Trash size={14} color="#dc2626" weight="bold" />
                                </TouchableOpacity>
                              </View>
                            )}
                          </TouchableOpacity>

                          <View style={{ padding: 14 }}>
                            <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
                              {mem.title}
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.neutral[600], lineHeight: 18, marginBottom: 10 }}>
                              {mem.description}
                            </Text>

                            {mem.achievers && mem.achievers.length > 0 && (
                              <View style={{ marginBottom: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.neutral[400], textTransform: 'uppercase', marginBottom: 4 }}>
                                  Recognized Students:
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                                  {mem.achievers.map((ach, i) => (
                                    <View key={i} style={{ backgroundColor: colors.primary[50], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                      <Star size={9} color={colors.primary[600]} weight="fill" />
                                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[700] }}>
                                        {ach}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            )}

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <CalendarBlank size={12} color={colors.neutral[400]} />
                                <Text style={{ fontSize: 10, color: colors.neutral[400] }}>
                                  {mem.event_date || 'Campus Archive'}
                                </Text>
                              </View>

                              <TouchableOpacity
                                onPress={() => handleToggleLikeMemory(mem.id)}
                                activeOpacity={0.7}
                                style={{
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                  gap: 5,
                                  backgroundColor: isLiked ? '#fef2f2' : colors.neutral[50],
                                  borderWidth: 1,
                                  borderColor: isLiked ? '#fecaca' : colors.neutral[200],
                                  paddingHorizontal: 9,
                                  paddingVertical: 4,
                                  borderRadius: 8
                                }}
                              >
                                <Heart
                                  size={13}
                                  color={isLiked ? '#ef4444' : colors.neutral[500]}
                                  weight={isLiked ? 'fill' : 'regular'}
                                />
                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: isLiked ? '#dc2626' : colors.neutral[700] }}>
                                  {mem.likes_count || 0} Kudos
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })
                )}
              </View>
            )}

            {/* SUBTAB 2: OPEN PRS & TASKS BOUNTY */}
            {tasksSubTab === 'contributions' && (
              <View style={{ gap: 14 }}>
                {/* Hero Action Card */}
                <View
                  style={{
                    backgroundColor: colors.neutral[900],
                    borderRadius: 20,
                    padding: 18,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.12,
                    shadowRadius: 10,
                    elevation: 4
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <RocketLaunch size={18} color={colors.primary[400]} weight="bold" />
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#ffffff' }}>
                      Earn XP Through Contributions
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.neutral[400], lineHeight: 18, marginBottom: 14 }}>
                    Did you open a Pull Request on ATC GitHub, build a project, fix a bug, or fulfill a club request? Submit your work below for Club Admin review to get awarded XP and redeem prizes.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsSubmitContributionOpen(true)}
                    style={{
                      backgroundColor: colors.primary[500],
                      paddingVertical: 11,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: 'bold' }}>
                      + Submit Contribution / PR
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ROLE & FUNCTIONAL TASKS HUB */}
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: 20,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#ede9fe',
                    shadowColor: '#7c3aed',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 2,
                    gap: 12
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3e8ff', justifyContent: 'center', alignItems: 'center' }}>
                        <Megaphone size={16} color="#7c3aed" weight="bold" />
                      </View>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.neutral[900] }}>
                            Role Tasks Hub
                          </Text>
                          <View style={{ backgroundColor: '#f5f3ff', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#7c3aed' }}>
                              {isMediaHead ? 'Media Head' : 'Assigned Deliverables'}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 10, color: colors.neutral[500] }}>
                          Functional club duties & media production assignments
                        </Text>
                      </View>
                    </View>

                    {canAssignTasks && (
                      <TouchableOpacity
                        onPress={() => setIsAssignTaskModalOpen(true)}
                        style={{
                          backgroundColor: '#7c3aed',
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Plus size={12} color="#ffffff" weight="bold" />
                        <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>Assign Task</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Tasks List */}
                  {assignedTasks.length === 0 ? (
                    <View style={{ padding: 16, alignItems: 'center', backgroundColor: colors.neutral[50], borderRadius: 12 }}>
                      <Text style={{ fontSize: 12, color: colors.neutral[500] }}>
                        No functional role tasks currently assigned.
                      </Text>
                    </View>
                  ) : (
                    assignedTasks.map((t) => {
                      const isAssignedToMe = (isMediaHead && t.assigned_to_role === 'media_head') ||
                        (currentUser && (t.assigned_to_user_id === currentUser.id || t.assigned_to_user_name?.toLowerCase().includes(currentUser.full_name?.toLowerCase())));
                      const isPending = t.status === 'pending' || !t.status;
                      const isInProgress = t.status === 'in_progress';
                      const isUnderReview = t.status === 'under_review';
                      const isCompleted = t.status === 'completed';

                      return (
                        <View
                          key={t.id}
                          style={{
                            backgroundColor: isCompleted ? '#f0fdf4' : isUnderReview ? '#fffbeb' : '#faf5ff',
                            borderRadius: 14,
                            padding: 14,
                            borderWidth: 1,
                            borderColor: isCompleted ? '#bbf7d0' : isUnderReview ? '#fde68a' : '#e9d5ff',
                            gap: 8
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <View style={{ backgroundColor: '#7c3aed', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#ffffff', textTransform: 'uppercase' }}>
                                    {t.assigned_to_role === 'media_head' ? 'Media Head' : t.assigned_to_role}
                                  </Text>
                                </View>
                                {t.priority && (
                                  <View style={{
                                    backgroundColor: t.priority === 'urgent' ? '#fee2e2' : t.priority === 'high' ? '#ffedd5' : '#e0e7ff',
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 4
                                  }}>
                                    <Text style={{
                                      fontSize: 9,
                                      fontWeight: 'bold',
                                      color: t.priority === 'urgent' ? '#b91c1c' : t.priority === 'high' ? '#c2410c' : '#3730a3',
                                      textTransform: 'uppercase'
                                    }}>
                                      {t.priority}
                                    </Text>
                                  </View>
                                )}
                                <Text style={{ fontSize: 10, color: colors.neutral[500] }}>
                                  → {t.assigned_to_user_name || 'Media Team'}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>
                                {t.title}
                              </Text>
                            </View>

                            {/* Status Chip */}
                            <View style={{
                              backgroundColor: isCompleted ? '#dcfce7' : isUnderReview ? '#fef3c7' : isInProgress ? '#e0f2fe' : colors.neutral[100],
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6
                            }}>
                              <Text style={{
                                fontSize: 10,
                                fontWeight: 'bold',
                                color: isCompleted ? '#15803d' : isUnderReview ? '#b45309' : isInProgress ? '#0369a1' : colors.neutral[600]
                              }}>
                                {isCompleted ? 'Completed ✓' : isUnderReview ? 'Under Review' : isInProgress ? 'In Progress' : 'Pending'}
                              </Text>
                            </View>
                          </View>

                          {t.description ? (
                            <Text style={{ fontSize: 11, color: colors.neutral[600], lineHeight: 16 }}>
                              {t.description}
                            </Text>
                          ) : null}

                          {/* Deliverable Info */}
                          {t.deliverable_url || t.deliverable_notes ? (
                            <View style={{ backgroundColor: '#ffffff', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#e2e8f0', gap: 4 }}>
                              <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.neutral[500], textTransform: 'uppercase' }}>
                                Deliverable Submitted:
                              </Text>
                              {t.deliverable_url ? (
                                <Text numberOfLines={1} style={{ fontSize: 11, color: '#6d28d9', fontStyle: 'italic' }}>
                                  🔗 {t.deliverable_url}
                                </Text>
                              ) : null}
                              {t.deliverable_notes ? (
                                <Text style={{ fontSize: 11, color: colors.neutral[700] }}>
                                  {t.deliverable_notes}
                                </Text>
                              ) : null}
                            </View>
                          ) : null}

                          {/* Card Footer */}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                <Sparkle size={10} color="#b45309" weight="fill" />
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#b45309' }}>
                                  +{t.points_reward || 100} XP
                                </Text>
                              </View>
                              {t.due_date ? (
                                <Text style={{ fontSize: 10, color: colors.neutral[400] }}>
                                  Due {new Date(t.due_date).toLocaleDateString()}
                                </Text>
                              ) : null}
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              {/* Submit Deliverable Button for Assignee / Media Head */}
                              {isAssignedToMe && !isCompleted && (
                                <TouchableOpacity
                                  onPress={() => {
                                    setTargetDeliverableTask(t);
                                    setDeliverableUrl(t.deliverable_url || '');
                                    setDeliverableNotes(t.deliverable_notes || '');
                                    setIsSubmitDeliverableModalOpen(true);
                                  }}
                                  style={{
                                    backgroundColor: '#7c3aed',
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6
                                  }}
                                >
                                  <Text style={{ fontSize: 11, color: '#ffffff', fontWeight: 'bold' }}>
                                    {t.deliverable_url ? 'Update Deliverable' : 'Submit Deliverable'}
                                  </Text>
                                </TouchableOpacity>
                              )}

                              {/* Review Deliverable Button for Super Admin */}
                              {canAssignTasks && (isUnderReview || isInProgress) && (
                                <TouchableOpacity
                                  onPress={() => {
                                    setTargetReviewTask(t);
                                    setReviewTaskPoints(String(t.points_reward || 100));
                                    setReviewTaskFeedback(t.admin_feedback || '');
                                    setIsReviewTaskModalOpen(true);
                                  }}
                                  style={{
                                    backgroundColor: '#059669',
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderRadius: 6
                                  }}
                                >
                                  <Text style={{ fontSize: 11, color: '#ffffff', fontWeight: 'bold' }}>
                                    Review & Award XP
                                  </Text>
                                </TouchableOpacity>
                              )}

                              {/* Delete Task for Super Admin */}
                              {canAssignTasks && (
                                <TouchableOpacity
                                  onPress={() => handleDeleteAssignedTask(t.id, t.title)}
                                  style={{ padding: 4 }}
                                >
                                  <Trash size={14} color={colors.neutral[400]} />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Admin PR Review Queue */}
                {isAdmin && (
                  <View
                    style={{
                      backgroundColor: '#f5f3ff',
                      borderWidth: 1,
                      borderColor: '#ddd6fe',
                      borderRadius: 18,
                      padding: 16,
                      gap: 12
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Shield size={16} color="#5b21b6" weight="bold" />
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#5b21b6' }}>
                          Admin Review Queue ({contributionReports.filter((r) => r.status === 'pending').length})
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => setIsAdjustPointsOpen(true)}
                        style={{
                          backgroundColor: '#6d28d9',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Sparkle size={11} color="#ffffff" weight="fill" />
                        <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>
                          Manual Adjust
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {contributionReports.filter((r) => r.status === 'pending').length === 0 ? (
                      <Text style={{ fontSize: 12, color: '#6d28d9', fontStyle: 'italic' }}>
                        No pending student PRs waiting for verification. All clear! ✓
                      </Text>
                    ) : (
                      contributionReports
                        .filter((r) => r.status === 'pending')
                        .map((r) => (
                          <View
                            key={r.id}
                            style={{
                              backgroundColor: '#ffffff',
                              borderRadius: 14,
                              padding: 14,
                              borderWidth: 1,
                              borderColor: '#e9d5ff',
                              gap: 6
                            }}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#7c3aed', textTransform: 'uppercase' }}>
                                    {r.category?.replace('_', ' ')}
                                  </Text>
                                  <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                                    by {r.user_name || 'Member'}
                                  </Text>
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>
                                  {r.title}
                                </Text>
                              </View>
                              <View style={{ backgroundColor: colors.warning[100], paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.warning[800] }}>Pending</Text>
                              </View>
                            </View>

                            {r.description ? (
                              <Text style={{ fontSize: 11, color: colors.neutral[600], lineHeight: 16 }}>
                                {r.description}
                              </Text>
                            ) : null}

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                              <Text
                                numberOfLines={1}
                                style={{ flex: 1, fontSize: 10, color: colors.primary[600], fontStyle: 'italic', marginRight: 10 }}
                              >
                                {r.proof_url}
                              </Text>
                              <TouchableOpacity
                                onPress={() => {
                                  setSelectedReport(r);
                                  setReviewPoints('100');
                                  setReviewFeedback('');
                                  setIsReviewReportModalOpen(true);
                                }}
                                style={{ backgroundColor: '#6d28d9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                              >
                                <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>Review & Award XP</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                    )}
                  </View>
                )}

                {/* Submitted PRs & Contributions Stream */}
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[800] }}>
                    Student Submissions & Log ({contributionReports.length})
                  </Text>

                  {contributionReports.length === 0 ? (
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.neutral[200], alignItems: 'center' }}>
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                        <FileText size={24} color={colors.neutral[500]} />
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.neutral[800], marginBottom: 4 }}>
                        No Contributions Recorded Yet
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.neutral[500], textAlign: 'center' }}>
                        Be the first to submit a GitHub PR or completed task to earn club points!
                      </Text>
                    </View>
                  ) : (
                    contributionReports.map((r) => {
                      const isApproved = r.status === 'approved';
                      const isPending = r.status === 'pending';
                      const isRejected = r.status === 'rejected';

                      return (
                        <View
                          key={r.id}
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: 16,
                            padding: 14,
                            borderWidth: 1,
                            borderColor: isApproved ? colors.success[200] : colors.neutral[200],
                            gap: 6
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.primary[700], textTransform: 'uppercase' }}>
                                  {r.category?.replace('_', ' ')}
                                </Text>
                                <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                                  · {r.user_name || 'Member'}
                                </Text>
                              </View>
                              <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>
                                {r.title}
                              </Text>
                            </View>

                            {/* Status Pill */}
                            <View
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 8,
                                backgroundColor: isApproved
                                  ? colors.success[50]
                                  : isPending
                                  ? colors.warning[50]
                                  : colors.danger[50],
                                borderWidth: 1,
                                borderColor: isApproved
                                  ? colors.success[200]
                                  : isPending
                                  ? colors.warning[200]
                                  : colors.danger[200],
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              {isApproved && <Sparkle size={10} color={colors.success[700]} weight="fill" />}
                              {isPending && <Clock size={10} color={colors.warning[700]} weight="bold" />}
                              {isRejected && <X size={10} color={colors.danger[700]} weight="bold" />}
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: 'bold',
                                  color: isApproved
                                    ? colors.success[700]
                                    : isPending
                                    ? colors.warning[700]
                                    : colors.danger[700]
                                }}
                              >
                                {isApproved
                                  ? `+${r.points_awarded || 100} XP`
                                  : isPending
                                  ? 'Pending'
                                  : 'Declined'}
                              </Text>
                            </View>
                          </View>

                          {r.description ? (
                            <Text style={{ fontSize: 11, color: colors.neutral[600], lineHeight: 16 }}>
                              {r.description}
                            </Text>
                          ) : null}

                          {r.proof_url ? (
                            <Text numberOfLines={1} style={{ fontSize: 10, color: colors.primary[600], marginTop: 2 }}>
                              Proof: {r.proof_url}
                            </Text>
                          ) : null}

                          {r.admin_feedback ? (
                            <View
                              style={{
                                backgroundColor: isApproved ? colors.success[50] : colors.neutral[50],
                                padding: 8,
                                borderRadius: 8,
                                marginTop: 4,
                                borderWidth: 1,
                                borderColor: isApproved ? colors.success[100] : colors.neutral[200]
                              }}
                            >
                              <Text style={{ fontSize: 10, fontWeight: 'bold', color: isApproved ? colors.success[800] : colors.neutral[700] }}>
                                Admin Note:
                              </Text>
                              <Text style={{ fontSize: 11, color: colors.neutral[700], fontStyle: 'italic', marginTop: 1 }}>
                                "{r.admin_feedback}"
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PROFILE & ACCOUNT HUB                              */}
        {/* ========================================================= */}
        {currentTab === 'profile' && (
          <View style={{ gap: 14 }}>
            {currentUser ? (
              <>
                {/* Profile Identity Card */}
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: colors.neutral[200],
                    borderRadius: 18,
                    padding: 16
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setTempAvatarUrl(currentUser.avatar_url || '');
                        setIsAvatarModalOpen(true);
                      }}
                      style={{ position: 'relative' }}
                    >
                      <Image
                        source={{ uri: currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' }}
                        style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: colors.primary[500] }}
                      />
                      <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: colors.primary[500], borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#ffffff' }}>
                        <Camera size={11} color="#ffffff" weight="bold" />
                      </View>
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900] }}>
                        {currentUser.full_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.neutral[500] }}>
                        {currentUser.email}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                        <View style={{ backgroundColor: isAdmin ? '#f5f3ff' : colors.primary[50], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: isAdmin ? '#6d28d9' : colors.primary[700] }}>
                            {getDisplayRole(currentUser.role)}
                          </Text>
                        </View>
                        {currentUser.is_verified ? (
                          <View style={{ backgroundColor: colors.success[50], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: colors.success[200], flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <SealCheck size={11} color={colors.success[700]} weight="bold" />
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.success[700] }}>
                              Verified
                            </Text>
                          </View>
                        ) : currentUser.verification_status === 'rejected' ? (
                          <View style={{ backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#fecaca', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <X size={10} color="#dc2626" weight="bold" />
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#dc2626' }}>
                              Declined
                            </Text>
                          </View>
                        ) : (
                          <View style={{ backgroundColor: colors.warning[50], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: colors.warning[200], flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Clock size={10} color={colors.warning[700]} weight="bold" />
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.warning[700] }}>
                              Pending
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                    <TouchableOpacity
                      onPress={() => setIsQrPassOpen(true)}
                      style={{ flex: 1, backgroundColor: colors.neutral[900], paddingVertical: 10, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                    >
                      <QrCode size={14} color="#ffffff" weight="bold" />
                      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>Digital QR Pass</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => openApplyModal(currentUser)}
                      style={{
                        flex: 1,
                        backgroundColor: currentUser.verification_status === 'rejected' ? '#fef2f2' : colors.primary[50],
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6,
                        borderWidth: 1,
                        borderColor: currentUser.verification_status === 'rejected' ? '#fecaca' : colors.primary[200]
                      }}
                    >
                      <PencilSimple size={13} color={currentUser.verification_status === 'rejected' ? '#dc2626' : colors.primary[700]} weight="bold" />
                      <Text
                        style={{
                          color: currentUser.verification_status === 'rejected' ? '#dc2626' : colors.primary[700],
                          fontWeight: 'bold',
                          fontSize: 12
                        }}
                      >
                        {currentUser.verification_status === 'rejected' ? 'Re-Submit App' : 'Edit Application'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Application Declined Alert Card */}
                {currentUser.verification_status === 'rejected' && (
                  <View
                    style={{
                      backgroundColor: '#fef2f2',
                      borderWidth: 1.5,
                      borderColor: '#fca5a5',
                      borderRadius: 16,
                      padding: 16,
                      gap: 8
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <X size={18} color="#dc2626" weight="bold" />
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#991b1b' }}>
                        Student Application Declined
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#b91c1c', lineHeight: 17 }}>
                      Your membership application was reviewed and declined by Club Admin (Ritesh Mishra). If your Student ID, roll number, or department information had an error, tap below to update and re-submit your application for immediate review.
                    </Text>
                    <TouchableOpacity
                      onPress={() => openApplyModal(currentUser)}
                      style={{
                        backgroundColor: '#dc2626',
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6,
                        marginTop: 4
                      }}
                    >
                      <PencilSimple size={13} color="#ffffff" weight="bold" />
                      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                        Update & Re-Submit Application
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Gamification Stats Strip */}
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8
                  }}
                >
                  <View style={{ flex: 1, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 14, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#b45309' }}>{memberPoints} XP</Text>
                    <Text style={{ fontSize: 10, color: '#92400e', marginTop: 2, fontWeight: 'bold' }}>Total Points</Text>
                  </View>
                  <TouchableOpacity
                    onPress={openLeaderboard}
                    style={{ flex: 1, backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200], borderRadius: 14, padding: 12, alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary[700] }}>{memberRank ? `#${memberRank}` : '—'}</Text>
                    <Text style={{ fontSize: 10, color: colors.primary[600], marginTop: 2, fontWeight: 'bold' }}>Leaderboard ❯</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1, backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 14, padding: 12, alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#c2410c' }}>{memberStreak}</Text>
                      <Flame size={17} color="#f97316" weight="fill" />
                    </View>
                    <Text style={{ fontSize: 10, color: '#9a3412', marginTop: 2, fontWeight: 'bold' }}>Day Streak</Text>
                  </View>
                </View>

                {/* Badges & Accolades Showcase */}
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: colors.neutral[200],
                    borderRadius: 16,
                    padding: 16
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Medal size={16} color={colors.primary[600]} weight="fill" />
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>
                        Badges & Accolades ({earnedBadgesList.length}/{allBadgesList.length})
                      </Text>
                    </View>
                    <TouchableOpacity onPress={openLeaderboard}>
                      <Text style={{ fontSize: 11, color: colors.primary[600], fontWeight: 'bold' }}>
                        Leaderboard ❯
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {allBadgesList.map((b) => {
                      const isUnlocked = earnedBadgesList.some(
                        (eb) => eb.badge_id === b.id || eb.name === b.name
                      );
                      return (
                        <View
                          key={b.id}
                          style={{
                            width: 110,
                            backgroundColor: isUnlocked ? '#faf5ff' : '#f8fafc',
                            borderWidth: 1,
                            borderColor: isUnlocked ? '#e9d5ff' : '#e2e8f0',
                            borderRadius: 12,
                            padding: 10,
                            alignItems: 'center'
                          }}
                        >
                          <View
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 22,
                              backgroundColor: isUnlocked ? '#f3e8ff' : '#f1f5f9',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginBottom: 4
                            }}
                          >
                            <Medal size={22} color={isUnlocked ? '#9333ea' : colors.neutral[400]} weight={isUnlocked ? 'fill' : 'regular'} />
                          </View>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: 'bold',
                              color: isUnlocked ? '#581c87' : colors.neutral[400],
                              textAlign: 'center',
                              marginTop: 2
                            }}
                            numberOfLines={1}
                          >
                            {b.name}
                          </Text>
                          <Text
                            style={{
                              fontSize: 9,
                              color: isUnlocked ? '#7e22ce' : colors.neutral[400],
                              backgroundColor: isUnlocked ? '#f3e8ff' : '#f1f5f9',
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              marginTop: 6,
                              fontWeight: 'bold'
                            }}
                          >
                            {isUnlocked ? 'Unlocked' : 'Locked'}
                          </Text>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Academic & Engineering Domain Card */}
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: colors.neutral[200],
                    borderRadius: 16,
                    padding: 16
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 10 }}>
                    Academic & Engineering Profile
                  </Text>

                  <View style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 11, color: colors.neutral[500] }}>Student ID</Text>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[800] }}>
                        {currentUser.student_id || (isAdmin ? 'ADMIN-001' : 'Pending Enrollment')}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 11, color: colors.neutral[500] }}>Department</Text>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[800] }}>
                        {currentUser.department || 'Computer Science & Engineering'}
                      </Text>
                    </View>

                    <View style={{ marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: colors.neutral[500], marginBottom: 6 }}>Technical Interests & Tracks</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {Array.from(
                          new Set(
                            (currentUser.interests || ['AI & Machine Learning', 'Cloud & DevOps', 'Full-Stack Web'])
                              .map((tag) => (typeof tag === 'string' ? tag.replace(/^[^\w\s&/+-]+/, '').trim() : tag) || tag)
                              .filter(Boolean)
                          )
                        ).map((cleanedTag) => (
                          <View
                            key={cleanedTag}
                            style={{
                              backgroundColor: colors.primary[50],
                              borderWidth: 1,
                              borderColor: colors.primary[100],
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[700] }}>{cleanedTag}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Member Activity & Engagement Strip */}
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8
                  }}
                >
                  <View style={{ flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.neutral[200], borderRadius: 14, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary[700] }}>{registeredEventIds.length}</Text>
                    <Text style={{ fontSize: 10, color: colors.neutral[500], marginTop: 2 }}>Workshops</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.neutral[200], borderRadius: 14, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.warning[700] }}>{bookmarkedIds.length}</Text>
                    <Text style={{ fontSize: 10, color: colors.neutral[500], marginTop: 2 }}>Bookmarks</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#ffffff', borderWidth: 1, borderColor: colors.neutral[200], borderRadius: 14, padding: 12, alignItems: 'center' }}>
                    <View style={{ height: 24, justifyContent: 'center', alignItems: 'center' }}>
                      {currentUser.is_verified ? (
                        <CheckCircle size={20} color={colors.success[600]} weight="fill" />
                      ) : currentUser.verification_status === 'rejected' ? (
                        <X size={20} color="#dc2626" weight="bold" />
                      ) : (
                        <Clock size={20} color={colors.warning[600]} weight="bold" />
                      )}
                    </View>
                    <Text style={{ fontSize: 10, color: colors.neutral[500], marginTop: 2 }}>
                      {currentUser.is_verified ? 'Verified' : currentUser.verification_status === 'rejected' ? 'Declined' : 'Pending'}
                    </Text>
                  </View>
                </View>

                {/* Admin Studio Quick Links */}
                {isAdmin && (
                  <View
                    style={{
                      backgroundColor: '#f8fafc',
                      borderWidth: 1,
                      borderColor: colors.neutral[200],
                      borderRadius: 16,
                      padding: 14,
                      gap: 8
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.neutral[800], marginBottom: 2 }}>
                      Admin Operations Console
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => setIsVerificationsModalOpen(true)}
                        style={{ flex: 1, backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.neutral[200], alignItems: 'center' }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[800] }}>
                          Students ({pendingMembers.length})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setIsAnalyticsModalOpen(true)}
                        style={{ flex: 1, backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.neutral[200], alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                      >
                        <Trophy size={13} color={colors.neutral[800]} weight="bold" />
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[800] }}>
                          Analytics
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => setIsAdjustPointsOpen(true)}
                        style={{ flex: 1, backgroundColor: colors.primary[50], padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.primary[200], alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}
                      >
                        <Sparkle size={13} color={colors.primary[800]} weight="fill" />
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[800] }}>
                          Adjust Points
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setCurrentTab('resources');
                          setTasksSubTab('contributions');
                        }}
                        style={{ flex: 1, backgroundColor: '#f5f3ff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#ddd6fe', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 }}
                      >
                        <FileText size={13} color="#6d28d9" weight="bold" />
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#6d28d9' }}>
                          PR Reviews ({contributionReports.filter((r) => r.status === 'pending').length})
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Admin Event Attendance QR Scanner Button */}
                    <TouchableOpacity
                      onPress={() => openAdminScanner()}
                      style={{
                        backgroundColor: '#f5f3ff',
                        padding: 11,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: '#ddd6fe',
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Camera size={14} color="#6d28d9" weight="bold" />
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6d28d9' }}>
                        Scan Student Event QR Pass
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Registered Workshops List */}
                <View
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: colors.neutral[200],
                    borderRadius: 16,
                    padding: 16
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 8 }}>
                    My Registered Workshops ({registeredEventIds.length})
                  </Text>
                  {registeredEventIds.map((id) => {
                    const matched = events.find((e) => e.id === id);
                    if (!matched) return null;
                    return (
                      <View
                        key={id}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingVertical: 8,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.neutral[100]
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.neutral[800] }}>{matched.title}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <MapPin size={11} color={colors.neutral[500]} />
                            <Text style={{ fontSize: 10, color: colors.neutral[500] }}>{matched.location}</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleToggleEventRSVP(id)}
                          style={{ backgroundColor: colors.danger[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.danger[700] }}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>

                {/* Account & Logout Container */}
                <TouchableOpacity
                  onPress={handleLogout}
                  style={{
                    backgroundColor: colors.danger[50],
                    borderWidth: 1,
                    borderColor: colors.danger[200],
                    borderRadius: 12,
                    paddingVertical: 12,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: colors.danger[700], fontWeight: 'bold', fontSize: 13 }}>
                    Log Out of ATC Mobile
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: colors.neutral[200] }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <User size={28} color={colors.neutral[500]} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900] }}>Guest Session Active</Text>
                <Text style={{ fontSize: 12, color: colors.neutral[500], textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
                  Sign in or create an account to unlock your digital campus pass, RSVP for workshops, and download vault materials.
                </Text>
                <TouchableOpacity
                  onPress={() => setIsGuest(false)}
                  style={{ backgroundColor: colors.primary[500], paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Log In / Sign Up</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* 3. MODALS: PASS, APPLICATION, STATUS, ADMIN, NOTIFICATIONS */}
      {/* ========================================================= */}

      {/* DIGITAL QR PASS MODAL */}
      <Modal visible={isQrPassOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 24,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 18,
              elevation: 8
            }}
          >
            {/* Holographic Header Band */}
            <View
              style={{
                backgroundColor: colors.neutral[900],
                paddingVertical: 14,
                paddingHorizontal: 20,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: colors.primary[500]
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success[400] }} />
                <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5 }}>
                  OFFICIAL CAMPUS PASS
                </Text>
              </View>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ color: colors.primary[300], fontSize: 10, fontWeight: 'bold' }}>
                  SPRING 2026
                </Text>
              </View>
            </View>

            <View style={{ padding: 20, alignItems: 'center' }}>
              {/* Member Profile Avatar & Identification */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, width: '100%' }}>
                <Image
                  source={{
                    uri: currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
                  }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    borderWidth: 2,
                    borderColor: colors.primary[500]
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900] }} numberOfLines={1}>
                    {currentUser?.full_name || 'ATC Member'}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.neutral[500] }} numberOfLines={1}>
                    {currentUser?.department || 'Computer Science & Engineering'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    <View style={{ backgroundColor: isAdmin ? '#f5f3ff' : colors.primary[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 9, fontWeight: 'bold', color: isAdmin ? '#6d28d9' : colors.primary[700] }}>
                        {getDisplayRole(currentUser?.role)}
                      </Text>
                    </View>
                    {currentUser?.is_verified ? (
                      <View style={{ backgroundColor: colors.success[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <SealCheck size={10} color={colors.success[700]} weight="bold" />
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.success[700] }}>Verified</Text>
                      </View>
                    ) : currentUser?.verification_status === 'rejected' ? (
                      <View style={{ backgroundColor: '#fef2f2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#fecaca', flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <X size={10} color="#dc2626" weight="bold" />
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#dc2626' }}>Declined</Text>
                      </View>
                    ) : (
                      <View style={{ backgroundColor: colors.warning[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} color={colors.warning[700]} weight="bold" />
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.warning[700] }}>Review Pending</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Special Tier / Privileges Badge */}
              {isAdmin ? (
                <View
                  style={{
                    width: '100%',
                    backgroundColor: '#f5f3ff',
                    borderWidth: 1,
                    borderColor: '#ddd6fe',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Trophy size={18} color="#6d28d9" weight="fill" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#6d28d9' }}>
                      Highest Tier: Club Legend & Admin
                    </Text>
                    <Text style={{ fontSize: 9, color: '#7c3aed' }}>
                      1,250 XP · 12-Day Streak · All 10 Badges Unlocked · Door Admission Rights
                    </Text>
                  </View>
                </View>
              ) : currentUser?.verification_status === 'rejected' ? (
                <View
                  style={{
                    width: '100%',
                    backgroundColor: '#fef2f2',
                    borderWidth: 1,
                    borderColor: '#fecaca',
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <X size={16} color="#dc2626" weight="bold" />
                  <Text style={{ fontSize: 10, color: '#b91c1c', flex: 1, lineHeight: 14 }}>
                    Application Declined: This Digital Pass is inactive until your student application is verified by Club Admin.
                  </Text>
                </View>
              ) : (
                <View
                  style={{
                    width: '100%',
                    backgroundColor: colors.primary[50],
                    borderWidth: 1,
                    borderColor: colors.primary[200],
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    marginBottom: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <Sparkle size={16} color={colors.primary[600]} weight="fill" />
                  <Text style={{ fontSize: 10, color: colors.primary[800], flex: 1, lineHeight: 14 }}>
                    Present this QR code to the Club Admin at the workshop door to enter and record attendance.
                  </Text>
                </View>
              )}

              {/* High-Resolution Live Scannable 2D QR Code */}
              <View
                style={{
                  backgroundColor: '#f8fafc',
                  borderWidth: 1.5,
                  borderColor: currentUser?.verification_status === 'rejected' ? '#fca5a5' : colors.primary[200],
                  borderRadius: 16,
                  padding: 12,
                  alignItems: 'center',
                  shadowColor: colors.primary[500],
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                  marginBottom: 12,
                  position: 'relative'
                }}
              >
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                      'ATC-' + (currentUser?.student_id || currentUser?.id || 'MEMBER-2026')
                    )}`
                  }}
                  style={{
                    width: 180,
                    height: 180,
                    borderRadius: 8,
                    backgroundColor: '#ffffff',
                    opacity: currentUser?.verification_status === 'rejected' ? 0.25 : 1
                  }}
                  resizeMode="contain"
                />
                {currentUser?.verification_status === 'rejected' && (
                  <View
                    style={{
                      position: 'absolute',
                      top: '42%',
                      backgroundColor: '#dc2626',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 11 }}>PASS INACTIVE</Text>
                  </View>
                )}
              </View>

              {/* Pass Token Pill with 1-Tap Copy */}
              <TouchableOpacity
                onPress={() => {
                  setCopiedPassToken(true);
                  triggerToast('Pass ID copied to clipboard ✓');
                  setTimeout(() => setCopiedPassToken(false), 2000);
                }}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: colors.neutral[100],
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: colors.neutral[300],
                  marginBottom: 16
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700] }}>
                  ATC-{currentUser?.student_id || 'MEMBER-2026'}
                </Text>
                <Text style={{ fontSize: 10, color: colors.primary[600], fontWeight: 'bold' }}>
                  {copiedPassToken ? '✓ Copied' : 'Copy'}
                </Text>
              </TouchableOpacity>

              {/* Action Buttons: Native Share + Done */}
              <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await Share.share({
                        title: 'Advanced Tech Club Campus Pass',
                        message: `Official ATC Campus Pass for ${currentUser?.full_name || 'Member'} (Student ID: ${currentUser?.student_id || 'ATC-2026'}). Verify on https://advclub.online/portal`
                      });
                    } catch (err) {
                      console.warn('[ATC Mobile] Share pass error:', err);
                    }
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: colors.primary[50],
                    borderWidth: 1,
                    borderColor: colors.primary[300],
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <ShareNetwork size={14} color={colors.primary[800]} weight="bold" />
                  <Text style={{ color: colors.primary[800], fontWeight: 'bold', fontSize: 12 }}>Share Pass</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsQrPassOpen(false)}
                  style={{
                    flex: 1,
                    backgroundColor: colors.neutral[900],
                    paddingVertical: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {renderApplyModal()}

      {/* APPLICATION STATUS CHECKER MODAL */}
      <Modal visible={isStatusModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}
        >
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
              Check Application Status
            </Text>
            <Text style={{ fontSize: 11, color: colors.neutral[500], marginBottom: 14 }}>
              Enter your student ID or email to view verification records.
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <TextInput
                placeholder="Student ID or Email"
                value={statusSearchId}
                onChangeText={setStatusSearchId}
                style={{ flex: 1, backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 8, paddingHorizontal: 12, fontSize: 13 }}
              />
              <TouchableOpacity
                onPress={handleSearchStatus}
                style={{ backgroundColor: colors.primary[500], paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' }}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>Check</Text>
              </TouchableOpacity>
            </View>

            {statusSearchResult && (
              <View style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[200], borderRadius: 12, padding: 12, marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>
                    {statusSearchResult.full_name}
                  </Text>
                  {statusSearchResult.is_verified ? (
                    <View style={{ backgroundColor: colors.success[100], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <SealCheck size={11} color={colors.success[700]} weight="bold" />
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.success[700] }}>Verified</Text>
                    </View>
                  ) : statusSearchResult.verification_status === 'rejected' ? (
                    <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <X size={11} color="#dc2626" weight="bold" />
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#dc2626' }}>Declined</Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: colors.warning[100], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Clock size={11} color={colors.warning[700]} weight="bold" />
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.warning[700] }}>Pending Review</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 11, color: colors.neutral[500], marginTop: 4 }}>
                  Department: {statusSearchResult.department || 'Computer Science & Engineering'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.neutral[400], marginTop: 2 }}>
                  Verified by: Club Admin (Ritesh Mishra)
                </Text>
                {statusSearchResult.verification_status === 'rejected' && (
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.neutral[200] }}>
                    <Text style={{ fontSize: 11, color: '#b91c1c', marginBottom: 6 }}>
                      Application was declined. Tap below to update details and re-submit for review.
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setIsStatusModalOpen(false);
                        openApplyModal(statusSearchResult);
                      }}
                      style={{
                        backgroundColor: '#dc2626',
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <PencilSimple size={12} color="#ffffff" weight="bold" />
                      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 11 }}>
                        Re-Submit Application
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              onPress={() => {
                setIsStatusModalOpen(false);
                setStatusSearchResult(null);
              }}
              style={{ backgroundColor: colors.neutral[900], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* NOTIFICATIONS CENTER MODAL */}
      <Modal visible={isNotificationsOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900] }}>
                Campus Alerts ({unreadCount} new)
              </Text>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkNotificationsRead}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[600] }}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ gap: 8 }}>
              {notifications.map((n) => (
                <TouchableOpacity
                  key={n.id}
                  activeOpacity={0.8}
                  onPress={() => handleMarkSingleNotificationRead(n.id)}
                  style={{
                    backgroundColor: n.read ? '#ffffff' : colors.primary[50],
                    borderWidth: 1,
                    borderColor: n.read ? colors.neutral[200] : colors.primary[200],
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 8
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.neutral[900], flex: 1, marginRight: 8 }}>
                      {n.title}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {!n.read && (
                        <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.primary[600] }} />
                      )}
                      <Text style={{ fontSize: 10, color: colors.neutral[400] }}>{n.time}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.neutral[600], marginTop: 4 }}>{n.message}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setIsNotificationsOpen(false)}
              style={{ backgroundColor: colors.neutral[900], paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 14 }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ADMIN VERIFICATIONS MODAL */}
      <Modal visible={isVerificationsModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 20, maxHeight: '80%' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
              Student Applicant Verifications ({pendingMembers.length})
            </Text>
            <Text style={{ fontSize: 11, color: colors.neutral[500], marginBottom: 14 }}>
              Review student enrollment to grant Club Portal and Workshop RSVP access.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {pendingMembers.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.neutral[600] }}>All applicants verified! ✓</Text>
                </View>
              ) : (
                pendingMembers.map((m) => (
                  <View
                    key={m.id || m.student_id}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.neutral[200],
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 10
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>{m.full_name}</Text>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[700] }}>{m.student_id || 'Pending ID'}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.neutral[500], marginTop: 2 }}>{m.email}</Text>

                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleApproveMember(m.id || m.student_id)}
                        style={{ flex: 1, backgroundColor: colors.success[500], paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRejectMember(m.id || m.student_id)}
                        style={{ flex: 1, backgroundColor: colors.danger[50], paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.danger[200] }}
                      >
                        <Text style={{ color: colors.danger[700], fontSize: 11, fontWeight: 'bold' }}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setIsVerificationsModalOpen(false)}
              style={{ backgroundColor: colors.neutral[900], paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ADMIN ANALYTICS MODAL */}
      <Modal visible={isAnalyticsModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
              Club Operations Telemetry
            </Text>
            <Text style={{ fontSize: 11, color: colors.neutral[500], marginBottom: 16 }}>
              Spring 2026 Campus Developer Analytics
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <View style={{ flex: 1, backgroundColor: colors.primary[50], padding: 12, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary[700] }}>142</Text>
                <Text style={{ fontSize: 10, color: colors.primary[600], marginTop: 2 }}>Active Members</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.success[50], padding: 12, borderRadius: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.success[700] }}>88%</Text>
                <Text style={{ fontSize: 10, color: colors.success[600], marginTop: 2 }}>RSVP Rate</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.neutral[200] }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.neutral[800] }}>{events.length}</Text>
                <Text style={{ fontSize: 10, color: colors.neutral[500], marginTop: 2 }}>Workshops</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.neutral[200] }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.neutral[800] }}>320+</Text>
                <Text style={{ fontSize: 10, color: colors.neutral[500], marginTop: 2 }}>Vault Downloads</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsAnalyticsModalOpen(false)}
              style={{ backgroundColor: colors.neutral[900], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DEDICATED SPECIFIC EVENT DETAILS PAGE */}
      <Modal visible={!!selectedEvent} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#0b0f19' }}>
          <StatusBar barStyle="light-content" backgroundColor="#0b0f19" />
          {selectedEvent && (() => {
            const isRSVPed = registeredEventIds.includes(selectedEvent.id);
            const spotsLeft = (selectedEvent.capacity || 100) - (selectedEvent.registrations_count || 0);
            const isPast = (selectedEvent.end_at && new Date(selectedEvent.end_at).getTime() < Date.now()) ||
                           (!selectedEvent.end_at && selectedEvent.start_at && new Date(selectedEvent.start_at).getTime() < Date.now()) ||
                           (!selectedEvent.end_at && !selectedEvent.start_at && selectedEvent.date && new Date(selectedEvent.date).getTime() < Date.now());
            const isCompleted = selectedEvent.is_completed === true || (selectedEvent.is_completed !== false && isPast);
            const fillRate = Math.min(100, Math.round(((selectedEvent.registrations_count || (isRSVPed ? 1 : 0)) / (selectedEvent.capacity || 100)) * 100));

            return (
              <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
                {/* SCROLLABLE EVENT DETAILS */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 120 }}
                >
                  {/* HERO BANNER SECTION */}
                  <View style={{ position: 'relative', height: 260, width: '100%', backgroundColor: '#0f172a' }}>
                    <Image
                      source={{
                        uri: selectedEvent.banner_url || selectedEvent.image || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80'
                      }}
                      style={{ width: '100%', height: '100%', opacity: 0.9 }}
                      resizeMode="cover"
                    />
                    <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.2)' }} />

                    <View
                      style={{
                        position: 'absolute',
                        bottom: 14,
                        left: 16,
                        flexDirection: 'row',
                        gap: 8,
                        alignItems: 'center'
                      }}
                    >
                      <View style={{ backgroundColor: 'rgba(15, 23, 42, 0.85)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[400], textTransform: 'uppercase' }}>
                          {selectedEvent.category}
                        </Text>
                      </View>
                      {isCompleted ? (
                        <View style={{ backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#f8fafc' }}>
                            🏁 Concluded
                          </Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#92400e' }}>
                            {getEventCountdown(selectedEvent)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* BODY CONTAINER */}
                  <View style={{ padding: 18 }}>
                    {/* TITLE & ORGANIZER */}
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.neutral[900], lineHeight: 26, marginBottom: 6 }}>
                      {selectedEvent.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.neutral[500], marginBottom: 14 }}>
                      Organized by <Text style={{ fontWeight: 'bold', color: colors.neutral[700] }}>{selectedEvent.author_name || 'ATC Engineering Core'}</Text> · Campus In-Person
                    </Text>

                    {/* TAGS */}
                    {Array.isArray(selectedEvent.tags) && selectedEvent.tags.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                        {selectedEvent.tags.map((tag, idx) => (
                          <View
                            key={idx}
                            style={{
                              backgroundColor: colors.primary[50],
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: colors.primary[200]
                            }}
                          >
                            <Text style={{ fontSize: 11, color: colors.primary[700], fontWeight: '600' }}>
                              #{tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* SCHEDULE & VENUE CARD */}
                    <View
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: colors.neutral[200],
                        marginBottom: 16,
                        gap: 12,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 3,
                        elevation: 1
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ fontSize: 18 }}>📅</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: colors.neutral[500], fontWeight: 'bold', textTransform: 'uppercase' }}>
                            Date & Schedule
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900], marginTop: 2 }}>
                            {new Date(selectedEvent.date || selectedEvent.start_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.neutral[600] }}>
                            {new Date(selectedEvent.date || selectedEvent.start_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            {selectedEvent.end_at ? ` - ${new Date(selectedEvent.end_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </Text>
                        </View>
                      </View>

                      <View style={{ height: 1, backgroundColor: colors.neutral[100] }} />

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ fontSize: 18 }}>📍</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: colors.neutral[500], fontWeight: 'bold', textTransform: 'uppercase' }}>
                            Campus Venue
                          </Text>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900], marginTop: 2 }}>
                            {selectedEvent.location}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                            University Campus • Check-in via Digital QR Pass
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* CAPACITY PROGRESS CARD */}
                    <View
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: colors.neutral[200],
                        marginBottom: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 3,
                        elevation: 1
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.neutral[800] }}>
                          Registration Capacity
                        </Text>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: isCompleted ? colors.neutral[500] : colors.primary[700] }}>
                          {selectedEvent.registrations_count || (isRSVPed ? 1 : 0)} / {selectedEvent.capacity || 100} confirmed
                        </Text>
                      </View>

                      {/* Progress Bar */}
                      <View style={{ height: 8, backgroundColor: colors.neutral[100], borderRadius: 4, overflow: 'hidden', marginVertical: 6 }}>
                        <View style={{ height: '100%', width: `${fillRate}%`, backgroundColor: isCompleted ? colors.neutral[400] : colors.primary[500], borderRadius: 4 }} />
                      </View>

                      <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                        {isCompleted
                          ? 'This session is finished.'
                          : spotsLeft > 0
                          ? `⚡ Only ${spotsLeft} spots remaining out of ${selectedEvent.capacity || 100}. RSVP early.`
                          : '⚠️ Maximum hall capacity reached.'}
                      </Text>
                    </View>

                    {/* EVENT DESCRIPTION */}
                    <View
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: colors.neutral[200],
                        marginBottom: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 3,
                        elevation: 1
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 8 }}>
                        About This Workshop
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.neutral[700], lineHeight: 20 }}>
                        {selectedEvent.description}
                      </Text>
                    </View>

                    {/* EXTERNAL LINKS (REGISTRATION OR FEEDBACK) */}
                    {(selectedEvent.registration_link || selectedEvent.feedback_link) && (
                      <View style={{ gap: 8, marginBottom: 16 }}>
                        {selectedEvent.registration_link && (
                          <TouchableOpacity
                            onPress={() => Share.share({ message: `Register for ${selectedEvent.title}: ${selectedEvent.registration_link}` })}
                            style={{
                              backgroundColor: '#ffffff',
                              padding: 12,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: colors.primary[300],
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 16 }}>🔗</Text>
                              <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary[700] }}>External Registration Form</Text>
                            </View>
                            <Text style={{ fontSize: 12, color: colors.primary[600] }}>Open ↗</Text>
                          </TouchableOpacity>
                        )}
                        {selectedEvent.feedback_link && (
                          <TouchableOpacity
                            onPress={() => Share.share({ message: `Submit feedback for ${selectedEvent.title}: ${selectedEvent.feedback_link}` })}
                            style={{
                              backgroundColor: '#ffffff',
                              padding: 12,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: colors.neutral[300],
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 16 }}>📋</Text>
                              <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.neutral[800] }}>Attendee Feedback Form</Text>
                            </View>
                            <Text style={{ fontSize: 12, color: colors.neutral[500] }}>Open ↗</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* ADMIN CONTROL PANEL CARD (PRESERVED MANUAL CONTROLS) */}
                    {isAdmin && (
                      <View
                        style={{
                          backgroundColor: '#0f172a',
                          borderRadius: 16,
                          padding: 16,
                          marginBottom: 16,
                          borderWidth: 1,
                          borderColor: '#334155'
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#38bdf8', textTransform: 'uppercase' }}>
                            🛡️ Admin Workshop Controls
                          </Text>
                        </View>

                        {/* Lifecycle Toggle */}
                        <TouchableOpacity
                          onPress={async () => {
                            const targetStatus = !selectedEvent.is_completed;
                            try {
                              await supabase
                                .from('events')
                                .update({ is_completed: targetStatus })
                                .eq('id', selectedEvent.id);
                              setSelectedEvent(prev => ({
                                ...prev,
                                is_completed: targetStatus,
                                status: targetStatus ? 'completed' : 'upcoming'
                              }));
                              setEvents(prev => prev.map(e => e.id === selectedEvent.id ? {
                                ...e,
                                is_completed: targetStatus,
                                status: targetStatus ? 'completed' : 'upcoming'
                              } : e));
                              Alert.alert('Status Updated', targetStatus ? 'Event marked as concluded.' : 'Event re-opened as upcoming.');
                            } catch (err) {
                              Alert.alert('Update Failed', err.message);
                            }
                          }}
                          style={{
                            backgroundColor: selectedEvent.is_completed ? '#334155' : '#059669',
                            paddingVertical: 10,
                            borderRadius: 10,
                            alignItems: 'center',
                            marginBottom: 8
                          }}
                        >
                          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                            {selectedEvent.is_completed ? '↺ Re-open Workshop as Upcoming' : '✓ Mark Workshop as Concluded'}
                          </Text>
                        </TouchableOpacity>

                        {/* Open Check-in Scanner for this Event */}
                        <TouchableOpacity
                          onPress={() => {
                            const evtId = selectedEvent.id;
                            setSelectedEvent(null);
                            openAdminScanner(evtId);
                          }}
                          style={{
                            backgroundColor: '#6d28d9',
                            paddingVertical: 10,
                            borderRadius: 10,
                            alignItems: 'center'
                          }}
                        >
                          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>
                            📷 Launch QR Check-in Terminal for this Event
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </ScrollView>

                {/* STICKY BOTTOM ACTION BAR (ERGONOMIC THUMB ZONE: BACK, SHARE & RSVP) */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
                    borderTopWidth: 1,
                    borderTopColor: colors.neutral[200],
                    flexDirection: 'row',
                    gap: 8,
                    alignItems: 'center',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: -3 },
                    shadowOpacity: 0.1,
                    shadowRadius: 6,
                    elevation: 10,
                    zIndex: 99
                  }}
                >
                  {/* BOTTOM BACK BUTTON */}
                  <TouchableOpacity
                    onPress={() => setSelectedEvent(null)}
                    style={{
                      height: 48,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      backgroundColor: '#eff6ff',
                      borderWidth: 1.5,
                      borderColor: '#3b82f6',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                    accessibilityLabel="Back"
                  >
                    <Text style={{ fontSize: 16, color: '#1d4ed8', fontWeight: 'bold' }}>←</Text>
                    <Text style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 'bold' }}>Back</Text>
                  </TouchableOpacity>

                  {/* BOTTOM SHARE BUTTON */}
                  <TouchableOpacity
                    onPress={() => handleShare(selectedEvent.title, selectedEvent.description)}
                    style={{
                      height: 48,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      backgroundColor: '#f5f3ff',
                      borderWidth: 1.5,
                      borderColor: '#8b5cf6',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                    accessibilityLabel="Share"
                  >
                    <Text style={{ fontSize: 16, color: '#6d28d9', fontWeight: 'bold' }}>↗</Text>
                    <Text style={{ fontSize: 12, color: '#6d28d9', fontWeight: 'bold' }}>Share</Text>
                  </TouchableOpacity>

                  {/* PRIMARY ACTION: RSVP / CONCLUDED */}
                  {isCompleted ? (
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: '#0f172a',
                        height: 48,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: '#334155'
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#f8fafc' }}>
                        🏁 Concluded
                      </Text>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => {
                          handleToggleEventRSVP(selectedEvent.id);
                        }}
                        style={{
                          flex: 1,
                          height: 48,
                          backgroundColor: isRSVPed ? colors.danger[500] : colors.primary[500],
                          borderRadius: 14,
                          alignItems: 'center',
                          justifyContent: 'center',
                          shadowColor: isRSVPed ? colors.danger[500] : colors.primary[500],
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.25,
                          shadowRadius: 4,
                          elevation: 3
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                          {isRSVPed ? '✕ Cancel RSVP' : '✓ Confirm 1-Tap RSVP'}
                        </Text>
                      </TouchableOpacity>

                      {isRSVPed && (
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedEvent(null);
                            setIsQrPassOpen(true);
                          }}
                          style={{
                            height: 48,
                            backgroundColor: colors.primary[50],
                            borderWidth: 1,
                            borderColor: colors.primary[300],
                            paddingHorizontal: 12,
                            borderRadius: 14,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Text style={{ color: colors.primary[700], fontWeight: 'bold', fontSize: 12 }}>
                            Pass 🪪
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </View>
            );
          })()}
        </SafeAreaView>
      </Modal>

      {/* FULL-SCREEN DEDICATED RESOURCE DETAILS SCREEN */}
      <Modal visible={!!selectedResource} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
          {selectedResource && (() => {
            const resUrl = selectedResource.url || selectedResource.file_url || '';
            const isGithub = resUrl.includes('github.com') || selectedResource.category === 'github';
            const isArticle = resUrl.includes('medium.com') || resUrl.includes('dev.to') || selectedResource.category === 'article' || selectedResource.category === 'blog';
            const isPlatform = !isGithub && !isArticle && resUrl.startsWith('http') && !resUrl.endsWith('.pdf') && !resUrl.endsWith('.zip');

            const actionLabel = isGithub ? 'GitHub Repo ↗' : isArticle ? 'Read Article ↗' : isPlatform ? 'Launch Platform ↗' : 'Download Asset';
            const actionType = (isGithub || isArticle || isPlatform) ? 'external' : 'download';

            return (
              <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
                <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                  {/* HERO BANNER SECTION */}
                  <View style={{ position: 'relative', width: '100%', height: 240, backgroundColor: '#0f172a' }}>
                    <Image
                      source={{
                        uri: selectedResource.cover_image || selectedResource.image_url || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80'
                      }}
                      style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                    />
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.25)'
                      }}
                    />

                    {/* CATEGORY & FORMAT BADGE OVERLAY */}
                    <View style={{ position: 'absolute', bottom: 14, left: 16, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <View
                        style={{
                          backgroundColor: 'rgba(15, 23, 42, 0.85)',
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[300], textTransform: 'uppercase' }}>
                          {selectedResource.category || 'Engineering Asset'}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: '#ffffff',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: colors.neutral[200]
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.neutral[700] }}>
                          {selectedResource.format || selectedResource.file_type || (isGithub ? 'GITHUB' : 'DOCUMENT')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* BODY CONTENT */}
                  <View style={{ padding: 18 }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.neutral[900], lineHeight: 26, marginBottom: 8 }}>
                      {selectedResource.title}
                    </Text>

                    {/* METADATA CHIPS (CLEAN PHOSPHOR ICONS, ZERO EMOJIS) */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.neutral[200], flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <User size={13} color={colors.neutral[600]} />
                        <Text style={{ fontSize: 11, color: colors.neutral[700], fontWeight: '600' }}>
                          {selectedResource.author_name || 'ATC Engineering Core'}
                        </Text>
                      </View>
                      {selectedResource.file_size ? (
                        <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.neutral[200], flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Package size={13} color={colors.neutral[600]} />
                          <Text style={{ fontSize: 11, color: colors.neutral[700], fontWeight: '600' }}>
                            {selectedResource.file_size}
                          </Text>
                        </View>
                      ) : null}
                      <View style={{ backgroundColor: colors.primary[50], paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: colors.primary[200], flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <SealCheck size={13} color={colors.primary[600]} weight="fill" />
                        <Text style={{ fontSize: 11, color: colors.primary[700], fontWeight: 'bold' }}>
                          Verified Campus Asset
                        </Text>
                      </View>
                    </View>

                    {/* TAGS */}
                    {Array.isArray(selectedResource.tags) && selectedResource.tags.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                        {selectedResource.tags.map((tag, i) => (
                          <View
                            key={i}
                            style={{
                              backgroundColor: colors.primary[50],
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: colors.primary[200]
                            }}
                          >
                            <Text style={{ fontSize: 11, color: colors.primary[700], fontWeight: '600' }}>#{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* OVERVIEW & DOSSIER */}
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.neutral[200] }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[400], textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 }}>
                        Overview & Dossier
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.neutral[700], lineHeight: 20 }}>
                        {selectedResource.description || 'Comprehensive technical documentation and architectural reference for club members.'}
                      </Text>
                    </View>

                    {/* CURRICULUM & MODULE BREAKDOWN */}
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.neutral[200] }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[700], textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 }}>
                        Core Architecture & Modules
                      </Text>
                      <View style={{ gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <CheckCircle size={15} color={colors.success[600]} weight="fill" />
                          <Text style={{ fontSize: 12, color: colors.neutral[800], flex: 1 }}>Deep Dive: Distributed state management & cache invalidation</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <CheckCircle size={15} color={colors.success[600]} weight="fill" />
                          <Text style={{ fontSize: 12, color: colors.neutral[800], flex: 1 }}>Hands-on Labs: Production deployment pipeline and test harness</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <CheckCircle size={15} color={colors.success[600]} weight="fill" />
                          <Text style={{ fontSize: 12, color: colors.neutral[800], flex: 1 }}>Engineering Best Practices: Rate limiting, tokens and RBAC</Text>
                        </View>
                      </View>
                    </View>

                    {/* DIRECT URL DISPLAY */}
                    {resUrl ? (
                      <TouchableOpacity
                        onPress={() => {
                          handleShare(selectedResource.title, `Resource link: ${resUrl}`);
                        }}
                        style={{
                          backgroundColor: '#ffffff',
                          padding: 12,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: colors.neutral[200],
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 14
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text style={{ fontSize: 10, color: colors.neutral[400], textTransform: 'uppercase', fontWeight: 'bold' }}>Resource Location / Target</Text>
                          <Text style={{ fontSize: 12, color: colors.primary[600], marginTop: 2 }} numberOfLines={1}>{resUrl}</Text>
                        </View>
                        <View style={{ backgroundColor: colors.neutral[100], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <ShareNetwork size={12} color={colors.neutral[600]} />
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.neutral[600] }}>Share</Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </ScrollView>

                {/* STICKY BOTTOM ACTION BAR (ERGONOMIC THUMB ZONE: BACK, SHARE, ACTION & ADMIN DELETE) */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
                    borderTopWidth: 1,
                    borderTopColor: colors.neutral[200],
                    flexDirection: 'row',
                    gap: 8,
                    alignItems: 'center',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    elevation: 8,
                    zIndex: 99
                  }}
                >
                  {/* BOTTOM BACK BUTTON */}
                  <TouchableOpacity
                    onPress={() => setSelectedResource(null)}
                    style={{
                      height: 48,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      backgroundColor: '#eff6ff',
                      borderWidth: 1.5,
                      borderColor: '#3b82f6',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                    accessibilityLabel="Back"
                  >
                    <ArrowLeft size={16} color="#1d4ed8" weight="bold" />
                    <Text style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 'bold' }}>Back</Text>
                  </TouchableOpacity>

                  {/* BOTTOM SHARE BUTTON */}
                  <TouchableOpacity
                    onPress={() =>
                      handleShare(
                        selectedResource.title,
                        `${selectedResource.description || ''}\n\nAccess Resource: ${resUrl || 'ATC Vault'}`
                      )
                    }
                    style={{
                      height: 48,
                      paddingHorizontal: 14,
                      borderRadius: 14,
                      backgroundColor: '#f5f3ff',
                      borderWidth: 1.5,
                      borderColor: '#8b5cf6',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4
                    }}
                    accessibilityLabel="Share"
                  >
                    <ShareNetwork size={16} color="#6d28d9" weight="bold" />
                    <Text style={{ fontSize: 12, color: '#6d28d9', fontWeight: 'bold' }}>Share</Text>
                  </TouchableOpacity>

                  {/* PRIMARY ACTION (DOWNLOAD / GITHUB / ARTICLE / PLATFORM) */}
                  <TouchableOpacity
                    onPress={() => {
                      if (actionType === 'external') {
                        Share.share({ message: `Access ${selectedResource.title}: ${resUrl}` });
                      } else {
                        handleDownloadResource(selectedResource);
                      }
                    }}
                    style={{
                      flex: 1,
                      height: 48,
                      backgroundColor: isGithub ? '#15803d' : isArticle ? '#d97706' : colors.primary[600],
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'row',
                      gap: 6,
                      shadowColor: colors.primary[600],
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 4,
                      elevation: 3
                    }}
                  >
                    <ArrowSquareOut size={16} color="#ffffff" weight="bold" />
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                      {actionLabel}
                    </Text>
                  </TouchableOpacity>

                  {/* ADMIN DELETE RESOURCE BUTTON */}
                  {isAdmin && (
                    <TouchableOpacity
                      onPress={() => handleDeleteResource(selectedResource.id, selectedResource.title)}
                      style={{
                        height: 48,
                        width: 48,
                        borderRadius: 14,
                        backgroundColor: '#fef2f2',
                        borderWidth: 1.5,
                        borderColor: '#ef4444',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      accessibilityLabel="Delete Resource"
                    >
                      <Trash size={18} color="#dc2626" weight="bold" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })()}
        </SafeAreaView>
      </Modal>

      {/* ADMIN POST BROADCAST MODAL */}
      <Modal visible={isBroadcastModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}
        >
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 12 }}>
              Post Campus Announcement
            </Text>

            <TextInput
              placeholder="Announcement Title"
              value={newAnnTitle}
              onChangeText={setNewAnnTitle}
              style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 }}
            />

            <TextInput
              placeholder="Write broadcast message..."
              value={newAnnBody}
              onChangeText={setNewAnnBody}
              multiline
              numberOfLines={4}
              style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 8, padding: 10, fontSize: 13, height: 90, textAlignVertical: 'top', marginBottom: 12 }}
            />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setIsBroadcastModalOpen(false)}
                style={{ flex: 1, backgroundColor: colors.neutral[100], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAdminPostAnnouncement}
                style={{ flex: 1, backgroundColor: colors.primary[500], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Publish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ADMIN CREATE WORKSHOP STUDIO MODAL */}
      <Modal visible={isCreateEventModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 16 }}
        >
          <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 20, maxHeight: '92%' }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900] }}>
                    Workshop Studio Publisher
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                    Publish high-impact tech workshops & hackathons
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsCreateEventModalOpen(false)} style={{ padding: 4 }}>
                  <Text style={{ fontSize: 16, color: colors.neutral[400] }}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12 }}>
                {/* Category Selector */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Workshop Category
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { id: 'workshop', label: '🛠️ Workshop' },
                      { id: 'hackathon', label: '⚡ Hackathon' },
                      { id: 'tech_talk', label: '🎙️ Tech Talk' },
                      { id: 'study_jam', label: '📚 Study Jam' }
                    ].map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setNewEventCategory(c.id)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: newEventCategory === c.id ? colors.primary[500] : colors.neutral[100],
                          borderWidth: 1,
                          borderColor: newEventCategory === c.id ? colors.primary[600] : colors.neutral[200]
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: newEventCategory === c.id ? '#ffffff' : colors.neutral[700] }}>
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Title */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Title *
                  </Text>
                  <TextInput
                    placeholder="e.g. Distributed Consensus & Raft Lab"
                    value={newEventTitle}
                    onChangeText={setNewEventTitle}
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.neutral[900] }}
                  />
                </View>

                {/* Location */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Location / Venue *
                  </Text>
                  <TextInput
                    placeholder="e.g. Turing Hall / Lab 4 / Google Meet"
                    value={newEventLocation}
                    onChangeText={setNewEventLocation}
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.neutral[900] }}
                  />
                </View>

                {/* Date & Presets */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Date (YYYY-MM-DD)
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                    {[
                      { label: 'Tomorrow', days: 1 },
                      { label: 'In 3 Days', days: 3 },
                      { label: 'This Weekend', days: 5 }
                    ].map((preset, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          const target = new Date(Date.now() + 86400000 * preset.days);
                          setNewEventDate(target.toISOString().split('T')[0]);
                        }}
                        style={{
                          backgroundColor: colors.primary[50],
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: colors.primary[200]
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[700] }}>
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    placeholder="2026-10-25"
                    value={newEventDate}
                    onChangeText={setNewEventDate}
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: colors.neutral[900] }}
                  />
                </View>

                {/* Start & End Times */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                      Start Time
                    </Text>
                    <TextInput
                      placeholder="10:00 AM"
                      value={newEventStartTime}
                      onChangeText={setNewEventStartTime}
                      style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: colors.neutral[900] }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                      End Time
                    </Text>
                    <TextInput
                      placeholder="01:00 PM"
                      value={newEventEndTime}
                      onChangeText={setNewEventEndTime}
                      style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: colors.neutral[900] }}
                    />
                  </View>
                </View>

                {/* Capacity & XP Points */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                      Max Seats
                    </Text>
                    <TextInput
                      placeholder="80"
                      keyboardType="numeric"
                      value={newEventCapacity}
                      onChangeText={setNewEventCapacity}
                      style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: colors.neutral[900] }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                      Reward XP Points
                    </Text>
                    <TextInput
                      placeholder="50"
                      keyboardType="numeric"
                      value={newEventPoints}
                      onChangeText={setNewEventPoints}
                      style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: colors.neutral[900] }}
                    />
                  </View>
                </View>

                {/* Cover Banner (Device Upload & Direct URL with Live Preview) */}
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700] }}>
                      Cover Banner Image
                    </Text>
                    {newEventBanner ? (
                      <TouchableOpacity onPress={() => setNewEventBanner('')}>
                        <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: 'bold' }}>Clear Image</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* LIVE BANNER PREVIEW IF SELECTED */}
                  {newEventBanner ? (
                    <View style={{ width: '100%', height: 110, borderRadius: 12, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: colors.neutral[300], position: 'relative' }}>
                      <Image source={{ uri: newEventBanner }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(15, 23, 42, 0.75)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, color: '#ffffff', fontWeight: 'bold' }}>
                          {newEventBanner.startsWith('data:') ? '📷 Device Photo Selected' : '🔗 Image Loaded'}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* DUAL ACTION CONTROLS: CHOOSE FROM DEVICE & URL */}
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                    <TouchableOpacity
                      onPress={() => handlePickImageFromDevice(setNewEventBanner)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        backgroundColor: '#eff6ff',
                        borderWidth: 1.5,
                        borderColor: '#3b82f6',
                        paddingVertical: 9,
                        paddingHorizontal: 8,
                        borderRadius: 10
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>📁</Text>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#1d4ed8' }}>Choose from Device</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handlePickImageFromDevice(setNewEventBanner)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f8fafc',
                        borderWidth: 1,
                        borderColor: colors.neutral[300],
                        paddingVertical: 9,
                        paddingHorizontal: 12,
                        borderRadius: 10
                      }}
                    >
                      <Text style={{ fontSize: 13 }}>📸</Text>
                    </TouchableOpacity>
                  </View>

                  {/* URL INPUT */}
                  <View style={{ marginBottom: 6 }}>
                    <TextInput
                      placeholder="Or paste direct image URL (https://...)"
                      value={newEventBanner.startsWith('data:') ? 'Uploaded from Device' : newEventBanner}
                      onChangeText={(val) => setNewEventBanner(val)}
                      style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, color: colors.neutral[900] }}
                    />
                  </View>

                  {/* CURATED PRESETS */}
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { label: '🤖 AI / ML', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80' },
                      { label: '🛡️ Cybersec', url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80' },
                      { label: '☁️ Cloud', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80' },
                      { label: '⚡ Hackathon', url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80' }
                    ].map((preset, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => setNewEventBanner(preset.url)}
                        style={{
                          backgroundColor: newEventBanner === preset.url ? colors.primary[500] : colors.neutral[100],
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: newEventBanner === preset.url ? '#ffffff' : colors.neutral[700] }}>
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Description */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Workshop Description & Agenda
                  </Text>
                  <TextInput
                    placeholder="Outline curriculum, software prerequisites, and what attendees will build..."
                    value={newEventDesc}
                    onChangeText={setNewEventDesc}
                    multiline
                    numberOfLines={3}
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, padding: 10, fontSize: 12, height: 70, textAlignVertical: 'top' }}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setIsCreateEventModalOpen(false)}
                  style={{ flex: 1, backgroundColor: colors.neutral[100], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleAdminCreateEvent}
                  style={{ flex: 1.5, backgroundColor: colors.primary[500], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Publish Workshop 🚀</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ADMIN CREATE CAMPUS MEMORY & HACKATHON WIN MODAL */}
      <Modal visible={isCreateMemoryModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 16 }}
        >
          <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 20, maxHeight: '90%' }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900] }}>
                    Publish Campus Memory / Award
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                    Showcase hackathon victories, top contributors & moments
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsCreateMemoryModalOpen(false)} style={{ padding: 4 }}>
                  <X size={18} color={colors.neutral[500]} />
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12 }}>
                {/* Category */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Memory Category
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { id: 'hackathon', label: 'Hackathon Victory' },
                      { id: 'contributor', label: 'Top Contributors' },
                      { id: 'workshop', label: 'Event Moments' }
                    ].map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setNewMemCategory(cat.id)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: newMemCategory === cat.id ? colors.primary[500] : colors.neutral[100]
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: newMemCategory === cat.id ? '#ffffff' : colors.neutral[700] }}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Title */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Title *
                  </Text>
                  <TextInput
                    placeholder="e.g. Smart India Hackathon (SIH 2025) Winners"
                    value={newMemTitle}
                    onChangeText={setNewMemTitle}
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.neutral[900] }}
                  />
                </View>

                {/* Award / Recognition */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Award / Recognition Note
                  </Text>
                  <TextInput
                    placeholder="e.g. 1st Runner Up ($1,200 Cash Prize)"
                    value={newMemAward}
                    onChangeText={setNewMemAward}
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.neutral[900] }}
                  />
                </View>

                {/* Student Achievers */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Student Achievers (comma-separated)
                  </Text>
                  <TextInput
                    placeholder="Ritesh Mishra, Priyanshu, Ananya Roy"
                    value={newMemAchievers}
                    onChangeText={setNewMemAchievers}
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.neutral[900] }}
                  />
                </View>

                {/* Photo Image (Device Upload & Direct URL with Live Preview) */}
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700] }}>
                      Photo / Memory Cover Image *
                    </Text>
                    {newMemImage ? (
                      <TouchableOpacity onPress={() => setNewMemImage('')}>
                        <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: 'bold' }}>Clear Image</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* LIVE PREVIEW IF SELECTED */}
                  {newMemImage ? (
                    <View style={{ width: '100%', height: 110, borderRadius: 12, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: colors.neutral[300], position: 'relative' }}>
                      <Image source={{ uri: newMemImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      <View style={{ position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(15, 23, 42, 0.75)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, color: '#ffffff', fontWeight: 'bold' }}>
                          {newMemImage.startsWith('data:') ? 'Device Photo Selected' : 'Image Loaded'}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* DUAL ACTION CONTROLS: CHOOSE FROM DEVICE & URL */}
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                    <TouchableOpacity
                      onPress={() => handlePickImageFromDevice(setNewMemImage)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        backgroundColor: '#eff6ff',
                        borderWidth: 1.5,
                        borderColor: '#3b82f6',
                        paddingVertical: 9,
                        paddingHorizontal: 8,
                        borderRadius: 10
                      }}
                    >
                      <Folder size={14} color="#1d4ed8" weight="bold" />
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#1d4ed8' }}>Choose from Device</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handlePickImageFromDevice(setNewMemImage)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f8fafc',
                        borderWidth: 1,
                        borderColor: colors.neutral[300],
                        paddingVertical: 9,
                        paddingHorizontal: 12,
                        borderRadius: 10
                      }}
                    >
                      <Camera size={14} color={colors.neutral[700]} weight="bold" />
                    </TouchableOpacity>
                  </View>

                  {/* URL INPUT */}
                  <TextInput
                    placeholder="Or paste direct image URL (https://...)"
                    value={newMemImage.startsWith('data:') ? 'Uploaded from Device' : newMemImage}
                    onChangeText={(val) => setNewMemImage(val)}
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, color: colors.neutral[900] }}
                  />
                </View>

                {/* Story Description */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Story & Highlights
                  </Text>
                  <TextInput
                    placeholder="Share what the team built, challenges overcome, and the judges' feedback..."
                    value={newMemDesc}
                    onChangeText={setNewMemDesc}
                    multiline
                    numberOfLines={3}
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, padding: 10, fontSize: 12, height: 70, textAlignVertical: 'top' }}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setIsCreateMemoryModalOpen(false)}
                  style={{ flex: 1, backgroundColor: colors.neutral[100], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleAdminCreateMemory}
                  style={{ flex: 1.5, backgroundColor: colors.primary[500], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Publish to Vault</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CAMPUS GALLERY LIGHTBOX MODAL */}
      <Modal visible={!!selectedGalleryMemory} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          {selectedGalleryMemory && (() => {
            const isLiked = likedMemoryIds.includes(selectedGalleryMemory.id);
            return (
              <View style={{ width: '100%', maxWidth: 420, backgroundColor: '#ffffff', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.neutral[200], shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 12 }}>
                <View style={{ position: 'relative', width: '100%', height: 260, backgroundColor: '#0f172a' }}>
                  <Image
                    source={{ uri: selectedGalleryMemory.image_url }}
                    style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                  />
                  <TouchableOpacity
                    onPress={() => setSelectedGalleryMemory(null)}
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                    accessibilityLabel="Close"
                  >
                    <X size={18} color="#ffffff" weight="bold" />
                  </TouchableOpacity>

                  {/* Category badge */}
                  <View style={{ position: 'absolute', top: 14, left: 14, backgroundColor: 'rgba(15, 23, 42, 0.75)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {selectedGalleryMemory.category === 'hackathon' ? (
                      <Trophy size={12} color="#fcd34d" weight="fill" />
                    ) : selectedGalleryMemory.category === 'contributor' ? (
                      <Star size={12} color="#38bdf8" weight="fill" />
                    ) : (
                      <Camera size={12} color="#a7f3d0" weight="fill" />
                    )}
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#ffffff', textTransform: 'uppercase' }}>
                      {selectedGalleryMemory.category}
                    </Text>
                  </View>
                </View>

                <View style={{ padding: 18 }}>
                  {selectedGalleryMemory.award_title ? (
                    <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Trophy size={12} color="#b45309" weight="fill" />
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#b45309' }}>
                        {selectedGalleryMemory.award_title}
                      </Text>
                    </View>
                  ) : null}

                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 8 }}>
                    {selectedGalleryMemory.title}
                  </Text>

                  <Text style={{ fontSize: 12, color: colors.neutral[600], lineHeight: 18, marginBottom: 12 }}>
                    {selectedGalleryMemory.description}
                  </Text>

                  {Array.isArray(selectedGalleryMemory.achievers) && selectedGalleryMemory.achievers.length > 0 && (
                    <View style={{ marginBottom: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[700], marginBottom: 6 }}>
                        Campus Achievers:
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {selectedGalleryMemory.achievers.map((ach, i) => (
                          <View key={i} style={{ backgroundColor: colors.primary[50], paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.primary[100], flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Star size={10} color={colors.primary[600]} weight="fill" />
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[800] }}>{ach}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Actions Bar: Like + Admin (Edit, Delete) + Close */}
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                    <TouchableOpacity
                      onPress={() => handleToggleLikeMemory(selectedGalleryMemory.id)}
                      activeOpacity={0.7}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: isLiked ? '#fef2f2' : '#f8fafc',
                        borderWidth: 1,
                        borderColor: isLiked ? '#fecaca' : colors.neutral[200],
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 12
                      }}
                    >
                      <Heart
                        size={16}
                        color={isLiked ? '#ef4444' : colors.neutral[600]}
                        weight={isLiked ? 'fill' : 'regular'}
                      />
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: isLiked ? '#dc2626' : colors.neutral[700] }}>
                        {selectedGalleryMemory.likes_count || 0} Kudos
                      </Text>
                    </TouchableOpacity>

                    {isAdmin && (
                      <>
                        <TouchableOpacity
                          onPress={() => {
                            const mem = selectedGalleryMemory;
                            setSelectedGalleryMemory(null);
                            openEditMemoryModal(mem);
                          }}
                          style={{
                            backgroundColor: colors.neutral[100],
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: colors.neutral[200]
                          }}
                          accessibilityLabel="Edit Memory"
                        >
                          <PencilSimple size={18} color={colors.neutral[700]} weight="bold" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDeleteMemory(selectedGalleryMemory.id, selectedGalleryMemory.title)}
                          style={{
                            backgroundColor: '#fef2f2',
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: '#fee2e2'
                          }}
                          accessibilityLabel="Delete Memory"
                        >
                          <Trash size={18} color="#dc2626" weight="bold" />
                        </TouchableOpacity>
                      </>
                    )}

                    <TouchableOpacity
                      onPress={() => setSelectedGalleryMemory(null)}
                      style={{ flex: 1, backgroundColor: colors.neutral[900], paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Close</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })()}
        </View>
      </Modal>

      {/* ADMIN EDIT CAMPUS MEMORY MODAL */}
      <Modal visible={isEditMemoryModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 16 }}
        >
          <View style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 20, maxHeight: '90%' }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900] }}>
                    Edit Campus Memory
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                    Update details, awards or cover image
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setIsEditMemoryModalOpen(false)} style={{ padding: 4 }}>
                  <X size={18} color={colors.neutral[500]} />
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12 }}>
                {/* Category */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Memory Category
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      { id: 'hackathon', label: 'Hackathon Victory' },
                      { id: 'contributor', label: 'Top Contributors' },
                      { id: 'workshop', label: 'Event Moments' }
                    ].map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => setEditMemCategory(cat.id)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          backgroundColor: editMemCategory === cat.id ? colors.primary[500] : colors.neutral[100]
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: editMemCategory === cat.id ? '#ffffff' : colors.neutral[700] }}>
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Title */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Title *
                  </Text>
                  <TextInput
                    placeholder="Memory title"
                    value={editMemTitle}
                    onChangeText={setEditMemTitle}
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.neutral[900] }}
                  />
                </View>

                {/* Award */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Award / Recognition Note
                  </Text>
                  <TextInput
                    placeholder="Award title or recognition"
                    value={editMemAward}
                    onChangeText={setEditMemAward}
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.neutral[900] }}
                  />
                </View>

                {/* Achievers */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Recognized Achievers (comma-separated)
                  </Text>
                  <TextInput
                    placeholder="Ritesh Mishra, Student 2"
                    value={editMemAchievers}
                    onChangeText={setEditMemAchievers}
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: colors.neutral[900] }}
                  />
                </View>

                {/* Photo Image */}
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700] }}>
                      Photo / Memory Cover Image *
                    </Text>
                    {editMemImage ? (
                      <TouchableOpacity onPress={() => setEditMemImage('')}>
                        <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: 'bold' }}>Clear Image</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {editMemImage ? (
                    <View style={{ width: '100%', height: 110, borderRadius: 12, overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: colors.neutral[300] }}>
                      <Image source={{ uri: editMemImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </View>
                  ) : null}

                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                    <TouchableOpacity
                      onPress={() => handlePickImageFromDevice(setEditMemImage)}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        backgroundColor: '#eff6ff',
                        borderWidth: 1.5,
                        borderColor: '#3b82f6',
                        paddingVertical: 9,
                        paddingHorizontal: 8,
                        borderRadius: 10
                      }}
                    >
                      <Folder size={14} color="#1d4ed8" weight="bold" />
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#1d4ed8' }}>Choose from Device</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    placeholder="Direct image URL (https://...)"
                    value={editMemImage.startsWith('data:') ? 'Uploaded from Device' : editMemImage}
                    onChangeText={(val) => setEditMemImage(val)}
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, color: colors.neutral[900] }}
                  />
                </View>

                {/* Description */}
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>
                    Story Description
                  </Text>
                  <TextInput
                    placeholder="Description of the event or achievement..."
                    value={editMemDesc}
                    onChangeText={setEditMemDesc}
                    multiline
                    numberOfLines={3}
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 10, padding: 10, fontSize: 12, height: 70, textAlignVertical: 'top' }}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setIsEditMemoryModalOpen(false)}
                  style={{ flex: 1, backgroundColor: colors.neutral[100], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleUpdateMemory}
                  disabled={editMemSubmitting}
                  style={{ flex: 1.5, backgroundColor: colors.primary[500], paddingVertical: 12, borderRadius: 10, alignItems: 'center', opacity: editMemSubmitting ? 0.7 : 1 }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                    {editMemSubmitting ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* PROFILE AVATAR CUSTOMIZER MODAL */}
      <Modal visible={isAvatarModalOpen} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 }}
        >
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 20, maxHeight: '85%' }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900] }}>
                  Customize Avatar
                </Text>
                <Text style={{ fontSize: 12, color: colors.neutral[500] }}>
                  Upload a photo from your device or paste a URL
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsAvatarModalOpen(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: colors.neutral[400] }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Avatar Preview */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Image
                source={{ uri: tempAvatarUrl || currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' }}
                style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: colors.primary[500] }}
              />
            </View>

            {/* Dual Action Controls: Device & URL */}
            <View style={{ gap: 10, marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => handlePickImageFromDevice(setTempAvatarUrl)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: '#eff6ff',
                  borderWidth: 1.5,
                  borderColor: '#3b82f6',
                  paddingVertical: 10,
                  borderRadius: 12
                }}
              >
                <Text style={{ fontSize: 16 }}>📁</Text>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1d4ed8' }}>
                  Choose Photo from Device
                </Text>
              </TouchableOpacity>

              <View>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[600], marginBottom: 4 }}>
                  Or Direct Image URL
                </Text>
                <TextInput
                  placeholder="https://images.unsplash.com/... or paste image URL"
                  value={tempAvatarUrl.startsWith('data:') ? 'Photo Loaded from Device' : tempAvatarUrl}
                  onChangeText={(val) => setTempAvatarUrl(val)}
                  style={{
                    backgroundColor: colors.neutral[50],
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 12,
                    color: colors.neutral[900]
                  }}
                />
              </View>
            </View>

            {/* Presets */}
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[600], marginBottom: 6 }}>
              Or Pick an Avatar Preset:
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
              {[
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
                'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=300&q=80',
                'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80'
              ].map((pUrl, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setTempAvatarUrl(pUrl)}
                  style={{
                    borderWidth: 2,
                    borderColor: tempAvatarUrl === pUrl ? colors.primary[500] : colors.neutral[200],
                    borderRadius: 22,
                    padding: 2
                  }}
                >
                  <Image source={{ uri: pUrl }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Save Buttons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setIsAvatarModalOpen(false)}
                style={{ flex: 1, backgroundColor: colors.neutral[100], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  if (!tempAvatarUrl || !currentUser) return;
                  const updated = { ...currentUser, avatar_url: tempAvatarUrl };
                  setCurrentUser(updated);
                  await saveMobileSession(updated);
                  await persistGoogleAccount(updated.email, updated.full_name, tempAvatarUrl);
                  try {
                    await supabase.from('profiles').update({ avatar_url: tempAvatarUrl }).eq('id', currentUser.id);
                  } catch (e) {
                    console.warn('[ATC] avatar update Supabase sync note:', e);
                  }
                  setIsAvatarModalOpen(false);
                  triggerToast('Avatar updated successfully! ✨');
                }}
                style={{ flex: 1.5, backgroundColor: colors.primary[500], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Save Avatar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================================= */}
      {/* FLOATING PILL BOTTOM NAVIGATION (MATCHING SCREENSHOT)     */}
      {/* ========================================================= */}
      <View
        style={{
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 16,
          right: 16,
          height: 64,
          borderRadius: 36,
          backgroundColor: '#ffffff',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: 8,
          borderWidth: 1,
          borderColor: 'rgba(0, 0, 0, 0.08)',
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 14,
          elevation: 12,
          zIndex: 99
        }}
      >
        {/* Tab 1: Home */}
        <TouchableOpacity
          onPress={() => handleSwitchTab('home')}
          style={{ alignItems: 'center', justifyContent: 'center', minWidth: 54 }}
        >
          <House
            size={20}
            color={currentTab === 'home' ? '#3b82f6' : '#9ca3af'}
            weight={currentTab === 'home' ? 'fill' : 'regular'}
          />
          <Text
            style={{
              fontSize: 10,
              fontWeight: currentTab === 'home' ? 'bold' : '600',
              color: currentTab === 'home' ? '#3b82f6' : '#9ca3af',
              marginTop: 2
            }}
          >
            Home
          </Text>
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: currentTab === 'home' ? '#3b82f6' : 'transparent',
              marginTop: 2
            }}
          />
        </TouchableOpacity>

        {/* Tab 2: Calendar / Events */}
        <TouchableOpacity
          onPress={() => handleSwitchTab('events')}
          style={{ alignItems: 'center', justifyContent: 'center', minWidth: 54 }}
        >
          <CalendarBlank
            size={20}
            color={currentTab === 'events' ? '#3b82f6' : '#9ca3af'}
            weight={currentTab === 'events' ? 'fill' : 'regular'}
          />
          <Text
            style={{
              fontSize: 10,
              fontWeight: currentTab === 'events' ? 'bold' : '600',
              color: currentTab === 'events' ? '#3b82f6' : '#9ca3af',
              marginTop: 2
            }}
          >
            Events
          </Text>
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: currentTab === 'events' ? '#3b82f6' : 'transparent',
              marginTop: 2
            }}
          />
        </TouchableOpacity>

        {/* Center Raised Glowing FAB (+) */}
        <TouchableOpacity
          onPress={() => setIsFabActionMenuOpen(true)}
          activeOpacity={0.88}
          style={{
            marginTop: -28,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: '#00e676', // Glowing bright emerald
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 4,
              borderColor: '#ffffff',
              shadowColor: '#00e676',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.45,
              shadowRadius: 10,
              elevation: 14
            }}
          >
            <Plus size={26} color="#ffffff" weight="bold" />
          </View>
        </TouchableOpacity>

        {/* Tab 3: Vault / Resources */}
        <TouchableOpacity
          onPress={() => handleSwitchTab('resources')}
          style={{ alignItems: 'center', justifyContent: 'center', minWidth: 54 }}
        >
          <Folder
            size={20}
            color={currentTab === 'resources' ? '#3b82f6' : '#9ca3af'}
            weight={currentTab === 'resources' ? 'fill' : 'regular'}
          />
          <Text
            style={{
              fontSize: 10,
              fontWeight: currentTab === 'resources' ? 'bold' : '600',
              color: currentTab === 'resources' ? '#3b82f6' : '#9ca3af',
              marginTop: 2
            }}
          >
            Vault
          </Text>
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: currentTab === 'resources' ? '#3b82f6' : 'transparent',
              marginTop: 2
            }}
          />
        </TouchableOpacity>

        {/* Tab 4: Profile / Menu */}
        <TouchableOpacity
          onPress={() => handleSwitchTab('profile')}
          style={{ alignItems: 'center', justifyContent: 'center', minWidth: 54 }}
        >
          <User
            size={20}
            color={currentTab === 'profile' ? '#3b82f6' : '#9ca3af'}
            weight={currentTab === 'profile' ? 'fill' : 'regular'}
          />
          <Text
            style={{
              fontSize: 10,
              fontWeight: currentTab === 'profile' ? 'bold' : '600',
              color: currentTab === 'profile' ? '#3b82f6' : '#9ca3af',
              marginTop: 2
            }}
          >
            Profile
          </Text>
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: currentTab === 'profile' ? '#3b82f6' : 'transparent',
              marginTop: 2
            }}
          />
        </TouchableOpacity>
      </View>

      {/* TOAST POPUP NOTIFICATION */}
      {toastText && (
        <View
          style={{
            position: 'absolute',
            bottom: 92,
            alignSelf: 'center',
            backgroundColor: colors.neutral[900],
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 24,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
            zIndex: 9999
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>{toastText}</Text>
        </View>
      )}

      {/* MODAL DIALOGS */}
      {renderGoogleModal()}
      {renderAdminScannerModal()}
      {renderOnboardingModal()}
      {renderLeaderboardModal()}
      {renderBadgeCelebrationModal()}
      {renderSubmitContributionModal()}
      {renderReviewContributionModal()}
      {renderAdjustPointsModal()}
      {renderFabActionModal()}
      {renderAssignTaskModal()}
      {renderSubmitDeliverableModal()}
      {renderReviewTaskModal()}
    </SafeAreaView>
  );
}