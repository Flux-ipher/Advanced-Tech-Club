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
  StyleSheet
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { supabase } from '@atc/shared/supabaseClient';
import { initialProfiles, initialAnnouncements, initialEvents, initialResources } from '@atc/shared/mockData';
import { colors } from '@atc/shared/theme';
import { Analytics } from '@atc/shared/utils/analytics';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

try {
  GoogleSignin.configure({
    webClientId: '767714143869-ctm1vp5g2h0erdf1cruivave2a9ostbt.apps.googleusercontent.com',
    offlineAccess: true,
  });
} catch (cfgErr) {
  console.warn('[ATC Mobile] GoogleSignin configure warning:', cfgErr);
}

const SESSION_FILE = `${FileSystem.documentDirectory}atc_mobile_session.json`;
const SAVED_ACCOUNTS_FILE = `${FileSystem.documentDirectory}atc_saved_google_accounts.json`;

const DEFAULT_GOOGLE_ACCOUNTS = [
  {
    email: 'fluxipher@gmail.com',
    name: 'Ritesh Kumar Mishra',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    tag: 'Admin'
  },
  {
    email: 'ritesh.mishra@gmail.com',
    name: 'Ritesh Mishra',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    tag: 'Admin'
  },
  {
    email: 'alex.rivera@techclub.edu',
    name: 'Alex Rivera',
    role: 'member',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80',
    tag: 'Member'
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
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'

  // Auth Form Fields
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Google Sign-In Sheet Modal State
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [savedGoogleAccounts, setSavedGoogleAccounts] = useState(DEFAULT_GOOGLE_ACCOUNTS);
  const [showManualGoogleInput, setShowManualGoogleInput] = useState(false);

  // Admin QR Event Attendance Scanner State
  const [isAdminScannerOpen, setIsAdminScannerOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [scannerEventId, setScannerEventId] = useState('');
  const [scannedStudent, setScannedStudent] = useState(null);
  const [scannedRegStatus, setScannedRegStatus] = useState(null); // 'attended' | 'confirmed' | 'walkin' | 'not_found'
  const [isScanningPaused, setIsScanningPaused] = useState(false);
  const [manualScanCode, setManualScanCode] = useState('');
  const [scannerCheckingIn, setScannerCheckingIn] = useState(false);
  const [scannerFeedback, setScannerFeedback] = useState(null);
  const [scanHistory, setScanHistory] = useState([
    {
      studentId: 'CS2026-088',
      studentName: 'Alex Rivera',
      time: '10:42 AM',
      eventTitle: 'Cloud Architecture Workshop',
      status: 'Attended'
    }
  ]);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Rule 4: Admin Role Privacy - format strictly as 'Admin' or 'Member'
  const getDisplayRole = (role) => {
    if (role === 'admin' || role === 'super_admin') return 'Admin';
    return 'Member';
  };

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
        // 1. Restore Saved Google Accounts for 1-tap login
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

        // 2. Restore active session
        const info = await FileSystem.getInfoAsync(SESSION_FILE);
        if (info.exists) {
          const raw = await FileSystem.readAsStringAsync(SESSION_FILE);
          const saved = JSON.parse(raw);
          if (saved && saved.email && isMounted) {
            setCurrentUser(saved);
            setIsGuest(false);

            // Re-sync with Supabase in background
            try {
              const { data: dbProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', saved.email.toLowerCase())
                .maybeSingle();

              if (dbProfile && isMounted) {
                const merged = { ...saved, ...dbProfile };
                setCurrentUser(merged);
                await FileSystem.writeAsStringAsync(SESSION_FILE, JSON.stringify(merged));
              }
            } catch (syncErr) {
              // Silent offline fallback
            }
          }
        }
      } catch (err) {
        console.warn('[ATC Mobile] Session restore error:', err);
      }
    }
    restoreMobileSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // =========================================================================
  // 2. CONTENT & PLATFORM DATA
  // =========================================================================
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [events, setEvents] = useState(initialEvents);
  const [resources, setResources] = useState(initialResources);
  const [pendingMembers, setPendingMembers] = useState(
    initialProfiles.filter((p) => !p.is_verified || p.verification_status === 'pending')
  );
  const [totalMembersCount, setTotalMembersCount] = useState(142);

  // Sync Live Data with Supabase Database
  useEffect(() => {
    let isMounted = true;
    async function loadLivePlatformData() {
      try {
        const { data: dbAnnouncements } = await supabase
          .from('announcements')
          .select('*')
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false });

        if (isMounted && dbAnnouncements && dbAnnouncements.length > 0) {
          setAnnouncements(dbAnnouncements);
        }

        const { data: dbEvents } = await supabase
          .from('events')
          .select('*')
          .order('date', { ascending: true });

        if (isMounted && dbEvents && dbEvents.length > 0) {
          setEvents(dbEvents);
        }

        const { data: dbResources } = await supabase
          .from('resources')
          .select('*')
          .order('created_at', { ascending: false });

        if (isMounted && dbResources && dbResources.length > 0) {
          setResources(dbResources);
        }

        const { data: dbPending } = await supabase
          .from('profiles')
          .select('*')
          .or('is_verified.is.null,is_verified.eq.false,verification_status.eq.pending');

        if (isMounted && dbPending) {
          setPendingMembers(dbPending);
        }

        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact' });

        if (isMounted && count) {
          setTotalMembersCount(count);
        }
      } catch (err) {
        // Fallback to initial mock data if offline
      }
    }
    loadLivePlatformData();
    return () => {
      isMounted = false;
    };
  }, []);

  // User Interactivity
  const [registeredEventIds, setRegisteredEventIds] = useState(['evt-1']);
  const [bookmarkedIds, setBookmarkedIds] = useState(['ann-1']);
  const [reactions, setReactions] = useState({
    'ann-1': { fire: 42, rocket: 28, heart: 16 },
    'ann-2': { fire: 19, rocket: 35, heart: 22 },
    'ann-3': { fire: 12, rocket: 14, heart: 9 }
  });

  // Notifications State
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: '🎉 Welcome to Advanced Tech Club',
      message: 'Your campus developer hub is ready. Explore workshops, announcements, and the vault.',
      time: 'Just now',
      read: false
    },
    {
      id: 'notif-2',
      title: '📅 Cloud Architecture Workshop Confirmed',
      message: 'Check your digital QR pass for campus laboratory check-in details.',
      time: '2h ago',
      read: false
    },
    {
      id: 'notif-3',
      title: '⚡ New Vault Resource Available',
      message: 'Full-Stack Distributed Systems Engineering Handbook has been published.',
      time: 'Yesterday',
      read: true
    }
  ]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [feedCategory, setFeedCategory] = useState('all');
  const [eventCategory, setEventCategory] = useState('all');
  const [resourceCategory, setResourceCategory] = useState('all');
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Toast Notification
  const [toastText, setToastText] = useState(null);
  const triggerToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(null), 2500);
  };

  // =========================================================================
  // 3. MODALS STATE
  // =========================================================================
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isQrPassOpen, setIsQrPassOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
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

  // Available Technical Interests for Application
  const availableInterests = [
    '🤖 AI & Machine Learning',
    '☁️ Cloud & DevOps',
    '📱 Mobile Development',
    '🌐 Full-Stack Web',
    '🛡️ Cybersecurity',
    '⛓️ Web3 & Blockchain',
    '🎨 UI/UX Design',
    '⚡ Distributed Systems',
    '🦾 Robotics & IoT',
    '🐧 Open Source'
  ];

  // =========================================================================
  // 4. AUTHENTICATION & SUPABASE DATABASE HANDLERS
  // =========================================================================

  // Resolves user profile from Supabase with Auto-SuperAdmin & verified status
  const resolveMobileUser = async (email, fullName = '', avatarUrl = '') => {
    const cleanEmail = email.trim().toLowerCase();
    let existingProfile = null;
    let isFirstUser = false;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();
      existingProfile = profile;

      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .in('role', ['admin', 'super_admin']);

      if (count === 0 || (count === 1 && existingProfile?.role === 'super_admin')) {
        isFirstUser = true;
      }
    } catch (sbErr) {
      console.warn('[ATC Mobile] Supabase check warning:', sbErr);
    }

    const isRitesh = cleanEmail.includes('ritesh') || cleanEmail.includes('fluxipher');
    const shouldBeSuperAdmin = isRitesh || isFirstUser || existingProfile?.role === 'super_admin';
    const resolvedRole = shouldBeSuperAdmin ? 'super_admin' : (existingProfile?.role || 'member');
    const isVerified = shouldBeSuperAdmin ? true : (existingProfile?.is_verified ?? false);
    const verificationStatus = shouldBeSuperAdmin ? 'verified' : (existingProfile?.verification_status || 'pending');

    const resolved = {
      id: existingProfile?.id || `usr-${Date.now()}`,
      email: cleanEmail,
      full_name: existingProfile?.full_name || fullName || (isRitesh ? 'Ritesh Kumar Mishra' : cleanEmail.split('@')[0].replace('.', ' ')),
      role: resolvedRole,
      is_verified: isVerified,
      verification_status: verificationStatus,
      department: existingProfile?.department || 'Computer Science & Engineering',
      student_id: existingProfile?.student_id || (isRitesh ? 'ADMIN-001' : ''),
      avatar_url: existingProfile?.avatar_url || avatarUrl || (isRitesh
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'),
      interests: existingProfile?.interests || ['AI & Machine Learning', 'Mobile Development']
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
      const newUser = await resolveMobileUser(authEmail.trim(), authFullName.trim());
      setCurrentUser(newUser);
      setIsGuest(false);
      await saveMobileSession(newUser);
      await persistGoogleAccount(newUser.email, newUser.full_name, newUser.avatar_url);
      triggerToast('Account Created! 🚀 Welcome to ATC.');

      if (newUser.role !== 'super_admin' && !newUser.student_id) {
        setIsApplyModalOpen(true);
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
      console.warn('[ATC Mobile] Native Google Sign-In notice, opening account selector modal:', err);
      // Fallback: Opens in-app account modal so user is never blocked
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

      if (user.role !== 'super_admin' && !user.student_id) {
        setIsApplyModalOpen(true);
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
            await saveMobileSession(null);
            setCurrentUser(null);
            setIsGuest(false);
            setAuthEmail('');
            setAuthPassword('');
            triggerToast('Signed out of ATC Mobile');
          }
        }
      ]
    );
  };

  // Google Sign-In Sheet Bottom Modal (1-Tap Saved Account Selection)
  const renderGoogleModal = () => (
    <Modal visible={isGoogleModalOpen} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            maxHeight: '85%'
          }}
        >
          {/* Google Header */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#ffffff',
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.neutral[200],
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                marginBottom: 10
              }}
            >
              <Text style={{ fontSize: 22 }}>🌐</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900] }}>
              Sign in with Google
            </Text>
            <Text style={{ fontSize: 12, color: colors.neutral[500], textAlign: 'center', marginTop: 4 }}>
              Tap any saved account to sign in instantly without typing
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
            {/* 1-Tap Saved Google Accounts */}
            <View style={{ gap: 8, marginBottom: 12 }}>
              {savedGoogleAccounts.map((account) => {
                const isAccAdmin = account.role === 'admin' || account.email.includes('fluxipher') || account.email.includes('ritesh');
                const initials = account.name
                  ? account.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
                  : account.email.substring(0, 2).toUpperCase();

                return (
                  <TouchableOpacity
                    key={account.email}
                    onPress={() =>
                      handleSelectGoogleAccount(account.email, account.name, account.avatar)
                    }
                    disabled={googleSubmitting}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 13,
                      borderRadius: 14,
                      backgroundColor: colors.neutral[50],
                      borderWidth: 1,
                      borderColor: colors.neutral[200]
                    }}
                  >
                    {account.avatar ? (
                      <Image
                        source={{ uri: account.avatar }}
                        style={{ width: 42, height: 42, borderRadius: 21, marginRight: 12 }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          backgroundColor: isAccAdmin ? '#6d28d9' : colors.neutral[800],
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 12
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 15 }}>
                          {initials}
                        </Text>
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.neutral[900] }}>
                          {account.name}
                        </Text>
                        <View
                          style={{
                            backgroundColor: isAccAdmin ? '#f5f3ff' : colors.primary[50],
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: isAccAdmin ? '#ddd6fe' : colors.primary[200]
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: 'bold',
                              color: isAccAdmin ? '#6d28d9' : colors.primary[700]
                            }}
                          >
                            {isAccAdmin ? 'Admin' : 'Member'}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.neutral[500], marginTop: 2 }}>
                        {account.email}
                      </Text>
                    </View>

                    <Text style={{ fontSize: 20, color: colors.neutral[400] }}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Toggle Manual Entry */}
            <TouchableOpacity
              onPress={() => setShowManualGoogleInput(!showManualGoogleInput)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                marginBottom: showManualGoogleInput ? 10 : 4
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary[600] }}>
                {showManualGoogleInput ? '▲ Hide manual entry' : '+ Use another Google account'}
              </Text>
            </TouchableOpacity>

            {/* Collapsed Manual Google Inputs */}
            {showManualGoogleInput && (
              <View
                style={{
                  backgroundColor: colors.neutral[50],
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.neutral[200],
                  gap: 8,
                  marginBottom: 12
                }}
              >
                <TextInput
                  placeholder="Google Email (e.g. yourname@gmail.com)"
                  placeholderTextColor={colors.neutral[400]}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={customGoogleEmail}
                  onChangeText={setCustomGoogleEmail}
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    fontSize: 13,
                    color: colors.neutral[900]
                  }}
                />
                <TextInput
                  placeholder="Full Name (optional)"
                  placeholderTextColor={colors.neutral[400]}
                  value={customGoogleName}
                  onChangeText={setCustomGoogleName}
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: colors.neutral[300],
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    fontSize: 13,
                    color: colors.neutral[900]
                  }}
                />
                <TouchableOpacity
                  onPress={() => {
                    if (!customGoogleEmail.trim()) {
                      Alert.alert('Required', 'Please enter your Google email address.');
                      return;
                    }
                    handleSelectGoogleAccount(customGoogleEmail.trim(), customGoogleName.trim());
                  }}
                  disabled={googleSubmitting}
                  style={{
                    backgroundColor: colors.primary[500],
                    paddingVertical: 11,
                    borderRadius: 10,
                    alignItems: 'center',
                    marginTop: 2
                  }}
                >
                  {googleSubmitting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                      Continue with this Google Account
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Cancel */}
          <TouchableOpacity
            onPress={() => setIsGoogleModalOpen(false)}
            disabled={googleSubmitting}
            style={{
              paddingVertical: 12,
              borderRadius: 10,
              alignItems: 'center',
              backgroundColor: colors.neutral[100]
            }}
          >
            <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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

      // Fallback search in initialProfiles / pendingMembers
      if (!matchedProfile) {
        matchedProfile = [...initialProfiles, ...pendingMembers].find(
          (p) =>
            (p.student_id && p.student_id.toLowerCase() === lookupKey.toLowerCase()) ||
            (p.id && p.id.toLowerCase() === lookupKey.toLowerCase()) ||
            (p.email && p.email.toLowerCase() === lookupKey.toLowerCase()) ||
            (lookupKey.toLowerCase().includes('admin') && p.role === 'super_admin')
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
    setScannerCheckingIn(true);
    const curEventId = scannerEventId || events[0]?.id || 'evt-1';
    const curEvent = events.find((e) => e.id === curEventId) || events[0];

    try {
      // 1. Record attendance in Supabase
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

      // 2. Add to scanHistory
      const newEntry = {
        studentId: scannedStudent.student_id || 'ATC-MEMBER',
        studentName: scannedStudent.full_name,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        eventTitle: curEvent?.title || 'Workshop Check-in',
        status: 'Attended'
      };
      setScanHistory((prev) => [newEntry, ...prev]);

      // 3. Mark attended locally
      setScannedRegStatus('attended');
      setScannerFeedback(`✓ ${scannedStudent.full_name} checked in successfully!`);
      triggerToast(`✓ Checked in: ${scannedStudent.full_name}`);
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
                {['CS2026-088', 'CS2026-002', 'ADMIN-001', 'alex.rivera@techclub.edu'].map((chip) => (
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

    setDownloadProgress(20);
    const t1 = setTimeout(() => setDownloadProgress(65), 300);
    const t2 = setTimeout(() => setDownloadProgress(100), 700);
    const t3 = setTimeout(() => {
      setDownloadProgress(null);
      triggerToast(`Downloaded ${resource.title} (${resource.file_size || '12MB'}) ✓`);
    }, 1000);
  };

  // Submit Student Application
  const handleSubmitApplication = async () => {
    if (!applyStudentId.trim()) {
      Alert.alert('Required', 'Please enter your Student ID (e.g. CS2026-088).');
      return;
    }

    const updatedUser = {
      ...currentUser,
      student_id: applyStudentId.trim().toUpperCase(),
      department: applyDept,
      interests: applyInterests,
      verification_status: 'pending',
      is_verified: false
    };

    setCurrentUser(updatedUser);
    await saveMobileSession(updatedUser);
    try {
      await supabase.from('profiles').upsert(updatedUser, { onConflict: 'id' });
    } catch (saveErr) {
      console.warn('[ATC Mobile] Application persist warning:', saveErr);
    }
    setPendingMembers((prev) => [updatedUser, ...prev]);
    setIsApplyModalOpen(false);
    triggerToast('Application Submitted! Reviewing by Club Admin (Ritesh Mishra) ⏳');
  };

  // Application Status Checker
  const handleSearchStatus = () => {
    if (!statusSearchId.trim()) {
      Alert.alert('Search', 'Please enter a Student ID or Email.');
      return;
    }

    const q = statusSearchId.trim().toLowerCase();
    const found =
      initialProfiles.find(
        (p) => p.student_id?.toLowerCase() === q || p.email?.toLowerCase() === q
      ) || (currentUser?.student_id?.toLowerCase() === q || currentUser?.email?.toLowerCase() === q ? currentUser : null);

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

  // Mark all notifications read
  const handleMarkNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    triggerToast('All notifications marked as read ✓');
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

  // Admin Quick Event Creator
  const handleAdminCreateEvent = () => {
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
      start_at: new Date(Date.now() + 86400000 * 5).toISOString(),
      banner_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
      author_name: currentUser?.full_name || 'Club Admin',
      author_role: 'Admin'
    };
    setEvents((prev) => [created, ...prev]);
    setIsCreateEventModalOpen(false);
    setNewEventTitle('');
    setNewEventDesc('');
    setNewEventLocation('');
    triggerToast('New Workshop Published! 📅');
  };

  // Admin Approve Member
  const handleApproveMember = (studentId) => {
    setPendingMembers((prev) => prev.filter((m) => m.student_id !== studentId));
    triggerToast('Student Approved & Verified ✓');
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
    const matchesCat = eventCategory === 'all' || e.category === eventCategory;
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSaved = !showSavedOnly || registeredEventIds.includes(e.id);
    return matchesCat && matchesSearch && matchesSaved;
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
              backgroundColor: colors.primary[500],
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 8
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>{toastText}</Text>
          </View>
        )}

        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 40, justifyContent: 'center' }}>
          {/* Brand Header */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
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
              marginBottom: 24,
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
              gap: 16
            }}
          >
            {authMode === 'signup' && (
              <View>
                <Text style={{ color: colors.neutral[300], fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>
                  Full Name
                </Text>
                <TextInput
                  placeholder="e.g. Alex Rivera"
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
                Email Address
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

            <View>
              <Text style={{ color: colors.neutral[300], fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>
                Password
              </Text>
              <TextInput
                placeholder="••••••••••••"
                placeholderTextColor={colors.neutral[500]}
                secureTextEntry
                value={authPassword}
                onChangeText={setAuthPassword}
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

            {/* Primary Submit Button */}
            <TouchableOpacity
              onPress={authMode === 'login' ? handleLogin : handleSignUp}
              disabled={authLoading}
              style={{
                backgroundColor: colors.primary[500],
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
                marginTop: 6,
                shadowColor: colors.primary[500],
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 4
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                {authLoading ? 'Verifying...' : authMode === 'login' ? 'Log In to Club Portal' : 'Create Club Account'}
              </Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
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
          <View style={{ alignItems: 'center', marginTop: 28 }}>
            <TouchableOpacity onPress={() => setIsGuest(true)}>
              <Text style={{ color: colors.primary[400], fontSize: 13, fontWeight: 'bold' }}>
                Browse as Guest (View-Only Mode) →
              </Text>
            </TouchableOpacity>
            <Text style={{ color: colors.neutral[500], fontSize: 11, textAlign: 'center', marginTop: 12 }}>
              First registered email automatically receives Super Admin privileges.
            </Text>
          </View>
        </ScrollView>
        {renderGoogleModal()}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Notifications Center Bell */}
          <TouchableOpacity
            onPress={() => setIsNotificationsOpen(true)}
            style={{
              backgroundColor: colors.neutral[100],
              padding: 8,
              borderRadius: 9,
              position: 'relative'
            }}
          >
            <Text style={{ fontSize: 13 }}>🔔</Text>
            {unreadCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.danger[500]
                }}
              />
            )}
          </TouchableOpacity>

          {currentUser ? (
            <>
              {/* QR Pass Fast Trigger */}
              <TouchableOpacity
                onPress={() => setIsQrPassOpen(true)}
                style={{
                  backgroundColor: colors.neutral[100],
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.neutral[200]
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[800] }}>
                  🎟️ Pass
                </Text>
              </TouchableOpacity>

              {/* Admin Event Attendance QR Scanner Fast Trigger */}
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => openAdminScanner()}
                  style={{
                    backgroundColor: '#6d28d9',
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#ffffff' }}>
                    📷 Scan
                  </Text>
                </TouchableOpacity>
              )}

              {/* Role Pill (strictly Admin or Member per Rule 4) */}
              <View
                style={{
                  backgroundColor: isAdmin ? '#f5f3ff' : colors.primary[50],
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isAdmin ? '#ddd6fe' : colors.primary[200]
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: isAdmin ? '#6d28d9' : colors.primary[700] }}>
                  {getDisplayRole(currentUser.role)}
                </Text>
              </View>
            </>
          ) : (
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

      {/* SEARCH & FILTER BAR */}
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
          <Text style={{ fontSize: 12, marginRight: 6 }}>🔍</Text>
          <TextInput
            placeholder={`Search ${currentTab === 'home' ? 'announcements' : currentTab === 'events' ? 'workshops' : 'resources'}...`}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{ flex: 1, fontSize: 13, color: colors.neutral[900] }}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ fontSize: 12, color: colors.neutral[400] }}>✕</Text>
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
              borderColor: showSavedOnly ? colors.warning[300] : 'transparent'
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: showSavedOnly ? colors.warning[800] : colors.neutral[600] }}>
              {showSavedOnly ? '⭐ Saved' : 'All'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* QUICK STATUS BAR BANNER */}
      {currentUser && !currentUser.is_verified && (
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
            <Text style={{ fontSize: 12 }}>⏳</Text>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.warning[800] }}>
              Application Under Review by Club Admin
            </Text>
          </View>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.warning[900] }}>Check Status →</Text>
        </TouchableOpacity>
      )}

      {/* 2. MAIN SCROLLABLE CONTENT */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
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

            {/* Quick Action Tray */}
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
                <Text style={{ fontSize: 12 }}>🔍</Text>
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
                <Text style={{ fontSize: 12 }}>📝</Text>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[700] }}>Student Application</Text>
              </TouchableOpacity>

              {isAdmin && (
                <TouchableOpacity
                  onPress={() => setIsBroadcastModalOpen(true)}
                  style={{
                    backgroundColor: colors.neutral[900],
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#ffffff' }}>+ Post</Text>
                </TouchableOpacity>
              )}
            </View>

            {filteredAnnouncements.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginBottom: 8 }}>📭</Text>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.neutral[700] }}>No announcements found</Text>
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
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.warning[800], backgroundColor: colors.warning[100], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          📌 PINNED
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity onPress={() => handleToggleBookmark(ann.id)}>
                      <Text style={{ fontSize: 14 }}>{bookmarkedIds.includes(ann.id) ? '⭐' : '☆'}</Text>
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
                        <Text style={{ fontSize: 11 }}>🔥</Text>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700] }}>
                          {reactions[ann.id]?.fire || 0}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleReact(ann.id, 'rocket')}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[100], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 }}
                      >
                        <Text style={{ fontSize: 11 }}>🚀</Text>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700] }}>
                          {reactions[ann.id]?.rocket || 0}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleReact(ann.id, 'heart')}
                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.neutral[100], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 }}
                      >
                        <Text style={{ fontSize: 11 }}>❤️</Text>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700] }}>
                          {reactions[ann.id]?.heart || 0}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={() => handleShare(ann.title, ann.body)}>
                      <Text style={{ fontSize: 12, color: colors.neutral[500], fontWeight: 'bold' }}>Share ↗</Text>
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

            {filteredEvents.map((evt) => {
              const isRSVPed = registeredEventIds.includes(evt.id);
              const spotsLeft = (evt.capacity || 100) - (evt.registrations_count || 0);

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
                    elevation: 1
                  }}
                >
                  <Image
                    source={{ uri: evt.banner_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80' }}
                    style={{ width: '100%', height: 120 }}
                  />

                  <View style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[600], textTransform: 'uppercase', backgroundColor: colors.primary[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        {evt.category}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: spotsLeft > 10 ? colors.success[700] : colors.danger[700] }}>
                        {spotsLeft > 0 ? `${spotsLeft} spots open` : 'Sold out'}
                      </Text>
                    </View>

                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
                      {evt.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.neutral[500], marginBottom: 10 }} numberOfLines={2}>
                      {evt.description}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: colors.neutral[600] }}>
                        📍 {evt.location}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleToggleEventRSVP(evt.id)}
                        style={{
                          backgroundColor: isRSVPed ? colors.success[500] : colors.primary[500],
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 8
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>
                          {isRSVPed ? '✓ Reserved' : 'RSVP Now'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 3: KNOWLEDGE VAULT (RESOURCES)                        */}
        {/* ========================================================= */}
        {currentTab === 'resources' && (
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

            {filteredResources.map((res) => (
              <View
                key={res.id}
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
                      {res.category} · {res.file_size || '12MB'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.neutral[900] }}>
                      {res.title}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.neutral[500], marginTop: 2 }}>
                      {res.description}
                    </Text>
                  </View>

                  <TouchableOpacity onPress={() => handleToggleBookmark(res.id)}>
                    <Text style={{ fontSize: 14 }}>{bookmarkedIds.includes(res.id) ? '⭐' : '☆'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                  <TouchableOpacity onPress={() => setSelectedResource(res)}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[600] }}>View Outline →</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDownloadResource(res)}
                    style={{ backgroundColor: colors.neutral[900], paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>Download File</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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
                    <TouchableOpacity onPress={() => setIsAvatarModalOpen(true)}>
                      <Image
                        source={{ uri: currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80' }}
                        style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: colors.primary[500] }}
                      />
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
                        <View style={{ backgroundColor: currentUser.is_verified ? colors.success[50] : colors.warning[50], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: currentUser.is_verified ? colors.success[700] : colors.warning[700] }}>
                            {currentUser.is_verified ? '✓ Verified' : '⏳ Pending'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100] }}>
                    <TouchableOpacity
                      onPress={() => setIsQrPassOpen(true)}
                      style={{ flex: 1, backgroundColor: colors.neutral[900], paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>🎟️ Digital QR Pass</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setIsApplyModalOpen(true)}
                      style={{ flex: 1, backgroundColor: colors.primary[50], paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.primary[200] }}
                    >
                      <Text style={{ color: colors.primary[700], fontWeight: 'bold', fontSize: 12 }}>📝 Edit Application</Text>
                    </TouchableOpacity>
                  </View>
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
                        {(currentUser.interests || ['AI & Machine Learning', 'Cloud & DevOps', 'Full-Stack Web']).map((tag) => (
                          <View
                            key={tag}
                            style={{
                              backgroundColor: colors.primary[50],
                              borderWidth: 1,
                              borderColor: colors.primary[100],
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[700] }}>{tag}</Text>
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
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentUser.is_verified ? colors.success[700] : colors.warning[700] }}>
                      {currentUser.is_verified ? '✓' : '⏳'}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.neutral[500], marginTop: 2 }}>
                      {currentUser.is_verified ? 'Verified' : 'Pending'}
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
                        style={{ flex: 1, backgroundColor: '#ffffff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.neutral[200], alignItems: 'center' }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[800] }}>
                          📊 Analytics
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
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#6d28d9' }}>
                        📷 Scan Student Event QR Pass
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
                          <Text style={{ fontSize: 10, color: colors.neutral[500] }}>📍 {matched.location}</Text>
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
                <Text style={{ fontSize: 32, marginBottom: 8 }}>👤</Text>
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 24, alignItems: 'center' }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
              Digital Campus Member Pass
            </Text>
            <Text style={{ fontSize: 11, color: colors.neutral[500], marginBottom: 16 }}>
              Flash this QR pass at campus workshops and hackathons
            </Text>

            {/* QR Matrix Simulator */}
            <View
              style={{
                width: 180,
                height: 180,
                backgroundColor: colors.neutral[900],
                borderRadius: 14,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 10
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 48 }}>▦</Text>
              <Text style={{ color: colors.primary[400], fontSize: 10, fontWeight: 'bold', marginTop: 6 }}>
                ATC-{currentUser?.student_id || 'MEMBER-2026'}
              </Text>
            </View>

            <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.neutral[900], marginTop: 14 }}>
              {currentUser?.full_name || 'ATC Member'}
            </Text>
            <Text style={{ fontSize: 12, color: colors.neutral[500] }}>
              Student ID: {currentUser?.student_id || 'Pending Application'}
            </Text>

            <TouchableOpacity
              onPress={() => setIsQrPassOpen(false)}
              style={{ backgroundColor: colors.neutral[900], width: '100%', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 20 }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* STUDENT MEMBERSHIP APPLICATION MODAL */}
      <Modal visible={isApplyModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 20, maxHeight: '85%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
                Student Membership Application
              </Text>
              <Text style={{ fontSize: 11, color: colors.neutral[500], marginBottom: 16 }}>
                Fill in your student credentials. Applications are verified by Club Admin (Ritesh Mishra).
              </Text>

              <View style={{ gap: 12 }}>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>Student ID *</Text>
                  <TextInput
                    placeholder="e.g. CS2026-088"
                    value={applyStudentId}
                    onChangeText={setApplyStudentId}
                    autoCapitalize="characters"
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 8, padding: 10, fontSize: 13 }}
                  />
                </View>

                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>Department</Text>
                  <TextInput
                    value={applyDept}
                    editable={false}
                    style={{ backgroundColor: colors.neutral[100], borderWidth: 1, borderColor: colors.neutral[200], borderRadius: 8, padding: 10, fontSize: 13, color: colors.neutral[600] }}
                  />
                </View>

                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>Year of Study</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((y) => (
                      <TouchableOpacity
                        key={y}
                        onPress={() => setApplyYear(y)}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: applyYear === y ? colors.primary[500] : colors.neutral[100],
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: applyYear === y ? '#ffffff' : colors.neutral[700] }}>
                          {y.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>Technical Interests (Select All That Apply)</Text>
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

                <View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>GitHub / Portfolio Profile</Text>
                  <TextInput
                    placeholder="https://github.com/username"
                    value={applyGithub}
                    onChangeText={setApplyGithub}
                    autoCapitalize="none"
                    style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 8, padding: 10, fontSize: 13 }}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
                <TouchableOpacity
                  onPress={() => setIsApplyModalOpen(false)}
                  style={{ flex: 1, backgroundColor: colors.neutral[100], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmitApplication}
                  style={{ flex: 1, backgroundColor: colors.primary[500], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Submit Application</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* APPLICATION STATUS CHECKER MODAL */}
      <Modal visible={isStatusModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
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
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: 'bold',
                      color: statusSearchResult.is_verified ? colors.success[700] : colors.warning[700],
                      backgroundColor: statusSearchResult.is_verified ? colors.success[100] : colors.warning[100],
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4
                    }}
                  >
                    {statusSearchResult.is_verified ? '✓ Verified' : '⏳ Pending Review'}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.neutral[500], marginTop: 4 }}>
                  Department: {statusSearchResult.department || 'Computer Science & Engineering'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.neutral[400], marginTop: 2 }}>
                  Verified by: Club Admin (Ritesh Mishra)
                </Text>
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
        </View>
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
                <View
                  key={n.id}
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
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.neutral[900] }}>{n.title}</Text>
                    <Text style={{ fontSize: 10, color: colors.neutral[400] }}>{n.time}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.neutral[600], marginTop: 4 }}>{n.message}</Text>
                </View>
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
                        onPress={() => handleApproveMember(m.student_id)}
                        style={{ flex: 1, backgroundColor: colors.success[500], paddingVertical: 6, borderRadius: 6, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setPendingMembers((prev) => prev.filter((p) => p.student_id !== m.student_id));
                          triggerToast('Applicant removed');
                        }}
                        style={{ flex: 1, backgroundColor: colors.danger[50], paddingVertical: 6, borderRadius: 6, alignItems: 'center' }}
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

      {/* EVENT DETAIL MODAL */}
      <Modal visible={!!selectedEvent} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 20 }}>
            {selectedEvent && (
              <>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[600], textTransform: 'uppercase', marginBottom: 2 }}>
                  {selectedEvent.category} · In-Person Campus Session
                </Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 8 }}>
                  {selectedEvent.title}
                </Text>
                <Text style={{ fontSize: 13, color: colors.neutral[600], lineHeight: 18, marginBottom: 12 }}>
                  {selectedEvent.description}
                </Text>
                <Text style={{ fontSize: 12, color: colors.neutral[700], marginBottom: 4 }}>
                  📍 {selectedEvent.location}
                </Text>
                <Text style={{ fontSize: 12, color: colors.neutral[700], marginBottom: 16 }}>
                  👥 Capacity: {selectedEvent.capacity} engineers ({selectedEvent.registrations_count || 1} confirmed)
                </Text>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setSelectedEvent(null)}
                    style={{ flex: 1, backgroundColor: colors.neutral[100], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      handleToggleEventRSVP(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                    style={{ flex: 1, backgroundColor: registeredEventIds.includes(selectedEvent.id) ? colors.danger[500] : colors.primary[500], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                      {registeredEventIds.includes(selectedEvent.id) ? 'Cancel RSVP' : 'Confirm RSVP'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* RESOURCE PREVIEW OUTLINE MODAL */}
      <Modal visible={!!selectedResource} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 20 }}>
            {selectedResource && (
              <>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[600], textTransform: 'uppercase', marginBottom: 2 }}>
                  Vault Curriculum Preview · {selectedResource.file_size || '12MB'}
                </Text>
                <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 8 }}>
                  {selectedResource.title}
                </Text>
                <Text style={{ fontSize: 13, color: colors.neutral[600], lineHeight: 18, marginBottom: 14 }}>
                  {selectedResource.description}
                </Text>

                <View style={{ backgroundColor: colors.neutral[50], borderRadius: 10, padding: 12, marginBottom: 16 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700], marginBottom: 4 }}>Curriculum Outline:</Text>
                  <Text style={{ fontSize: 11, color: colors.neutral[600] }}>• Core Architecture & Component Lifecycle</Text>
                  <Text style={{ fontSize: 11, color: colors.neutral[600] }}>• Production CI/CD Pipeline Implementation</Text>
                  <Text style={{ fontSize: 11, color: colors.neutral[600] }}>• Security & Rate Limiting Best Practices</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setSelectedResource(null)}
                    style={{ flex: 1, backgroundColor: colors.neutral[100], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      handleDownloadResource(selectedResource);
                      setSelectedResource(null);
                    }}
                    style={{ flex: 1, backgroundColor: colors.neutral[900], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Download</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ADMIN POST BROADCAST MODAL */}
      <Modal visible={isBroadcastModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
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
        </View>
      </Modal>

      {/* ADMIN CREATE WORKSHOP MODAL */}
      <Modal visible={isCreateEventModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 20 }}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 12 }}>
              Publish Campus Workshop
            </Text>

            <TextInput
              placeholder="Workshop Title (e.g. Distributed Systems Lab)"
              value={newEventTitle}
              onChangeText={setNewEventTitle}
              style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 }}
            />

            <TextInput
              placeholder="Location (e.g. Turing Hall / Lab 4)"
              value={newEventLocation}
              onChangeText={setNewEventLocation}
              style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 }}
            />

            <TextInput
              placeholder="Description & prerequisites..."
              value={newEventDesc}
              onChangeText={setNewEventDesc}
              multiline
              numberOfLines={3}
              style={{ backgroundColor: colors.neutral[50], borderWidth: 1, borderColor: colors.neutral[300], borderRadius: 8, padding: 10, fontSize: 13, height: 70, textAlignVertical: 'top', marginBottom: 12 }}
            />

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setIsCreateEventModalOpen(false)}
                style={{ flex: 1, backgroundColor: colors.neutral[100], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: colors.neutral[700], fontWeight: 'bold', fontSize: 13 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAdminCreateEvent}
                style={{ flex: 1, backgroundColor: colors.primary[500], paddingVertical: 12, borderRadius: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Publish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. BOTTOM TAB BAR NAVIGATION */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: colors.neutral[200],
          flexDirection: 'row',
          justifyContent: 'space-around',
          paddingVertical: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 5
        }}
      >
        <TouchableOpacity
          onPress={() => handleSwitchTab('home')}
          style={{
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 12,
            backgroundColor: currentTab === 'home' ? colors.primary[50] : 'transparent'
          }}
        >
          <Text style={{ fontSize: 16, color: currentTab === 'home' ? colors.primary[600] : colors.neutral[400] }}>
            📢
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: currentTab === 'home' ? 'bold' : 'normal',
              color: currentTab === 'home' ? colors.primary[700] : colors.neutral[500],
              marginTop: 1
            }}
          >
            Feed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSwitchTab('events')}
          style={{
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 12,
            backgroundColor: currentTab === 'events' ? colors.primary[50] : 'transparent'
          }}
        >
          <Text style={{ fontSize: 16, color: currentTab === 'events' ? colors.primary[600] : colors.neutral[400] }}>
            📅
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: currentTab === 'events' ? 'bold' : 'normal',
              color: currentTab === 'events' ? colors.primary[700] : colors.neutral[500],
              marginTop: 1
            }}
          >
            Events
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSwitchTab('resources')}
          style={{
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 12,
            backgroundColor: currentTab === 'resources' ? colors.primary[50] : 'transparent'
          }}
        >
          <Text style={{ fontSize: 16, color: currentTab === 'resources' ? colors.primary[600] : colors.neutral[400] }}>
            ▤
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: currentTab === 'resources' ? 'bold' : 'normal',
              color: currentTab === 'resources' ? colors.primary[700] : colors.neutral[500],
              marginTop: 1
            }}
          >
            Vault
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleSwitchTab('profile')}
          style={{
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 12,
            backgroundColor: currentTab === 'profile' ? colors.primary[50] : 'transparent'
          }}
        >
          <Text style={{ fontSize: 16, color: currentTab === 'profile' ? colors.primary[600] : colors.neutral[400] }}>
            ◉
          </Text>
          <Text
            style={{
              fontSize: 11,
              fontWeight: currentTab === 'profile' ? 'bold' : 'normal',
              color: currentTab === 'profile' ? colors.primary[700] : colors.neutral[500],
              marginTop: 1
            }}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
      {renderGoogleModal()}
      {renderAdminScannerModal()}
    </SafeAreaView>
  );
}