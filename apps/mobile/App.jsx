import React, { useState } from 'react';
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
  Share
} from 'react-native';
import { initialProfiles, initialAnnouncements, initialEvents, initialResources } from '@atc/shared/mockData';
import { colors } from '@atc/shared/theme';
import { Analytics } from '@atc/shared/utils/analytics';

export default function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState('home'); // 'home' | 'events' | 'resources' | 'profile'

  const handleSwitchTab = (tab) => {
    setCurrentTab(tab);
    Analytics.screenView(tab);
  };

  // Active User Profile
  const [currentUser, setCurrentUser] = useState(initialProfiles[0]); // Default: Ritesh Mishra
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  // Rule 4 Helper: Format role strictly as 'Admin' or 'Member'
  const getDisplayRole = (role) => {
    if (role === 'admin' || role === 'super_admin') return 'Admin';
    return 'Member';
  };

  // Feed, Events & Resources Data State
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [events, setEvents] = useState(initialEvents);
  const [resources, setResources] = useState(initialResources);
  const [pendingMembers, setPendingMembers] = useState(
    initialProfiles.filter((p) => !p.is_verified || p.verification_status === 'pending')
  );

  // User Interactive State
  const [registeredEventIds, setRegisteredEventIds] = useState(['evt-1']);
  const [bookmarkedIds, setBookmarkedIds] = useState(['ann-1']);
  const [reactions, setReactions] = useState({
    'ann-1': { fire: 42, rocket: 28, heart: 16 },
    'ann-2': { fire: 19, rocket: 35, heart: 22 },
    'ann-3': { fire: 12, rocket: 14, heart: 9 }
  });

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [feedCategory, setFeedCategory] = useState('all');
  const [eventCategory, setEventCategory] = useState('all');
  const [resourceCategory, setResourceCategory] = useState('all');
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // In-App Toast State
  const [toastText, setToastText] = useState(null);
  const triggerToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(null), 2500);
  };

  // Modals State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [isQrPassOpen, setIsQrPassOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isVerificationsModalOpen, setIsVerificationsModalOpen] = useState(false);

  // Form States for Admin Creators
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnBody, setNewAnnBody] = useState('');
  const [newAnnCategory, setNewAnnCategory] = useState('hackathon');
  const [newAnnPinned, setNewAnnPinned] = useState(false);

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventCategory, setNewEventCategory] = useState('workshop');
  const [newEventCapacity, setNewEventCapacity] = useState('80');

  // Push Telemetry State
  const [pushStatus, setPushStatus] = useState('Active · ExponentPushToken synced');

  // Quick 1-tap event registration
  const handleToggleEventRSVP = (eventId) => {
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

  // Bookmark toggle
  const handleToggleBookmark = (id) => {
    if (bookmarkedIds.includes(id)) {
      setBookmarkedIds((prev) => prev.filter((i) => i !== id));
      triggerToast('Removed from Saved');
    } else {
      setBookmarkedIds((prev) => [...prev, id]);
      triggerToast('Saved to My Bookmarks ⭐');
    }
  };

  // Reactions toggle
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

  // Admin Quick Announcement Post
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
      author_name: currentUser.full_name,
      author_role: 'Admin',
      author_avatar: currentUser.avatar_url,
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
      author_name: currentUser.full_name,
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

  // Share Content Helper
  const handleShare = async (title, body) => {
    try {
      await Share.share({
        message: `${title}\n\n${body}\n\nShared via Advanced Tech Club Mobile App`
      });
    } catch (e) {
      triggerToast('Share completed');
    }
  };

  // Avatar Presets
  const avatarPresets = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'
  ];

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
              Student Mobile Hub · Spring 2026
            </Text>
          </View>
        </View>

        {/* Right Header Actions */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
            title="Digital Member Pass"
          >
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[800] }}>
              🎟️ Pass
            </Text>
          </TouchableOpacity>

          {/* Persona Switcher Pill (Rule 4 compliant: displays 'Admin' or 'Member') */}
          <TouchableOpacity
            onPress={() => {
              const nextIndex = (initialProfiles.findIndex((p) => p.id === currentUser.id) + 1) % 3;
              setCurrentUser(initialProfiles[nextIndex]);
              triggerToast(`Switched persona to ${getDisplayRole(initialProfiles[nextIndex].role)}`);
            }}
            style={{
              backgroundColor: colors.primary[50],
              paddingHorizontal: 9,
              paddingVertical: 5,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.primary[200]
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[700] }}>
              {getDisplayRole(currentUser.role)} ⟳
            </Text>
          </TouchableOpacity>
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

        {/* Saved Filter Pill Toggle */}
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
              ['all', 'Slides', 'Cheat Sheets', 'Code Samples', 'Roadmaps'].map((cat) => (
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
                      color: resourceCategory === cat ? '#ffffff' : colors.neutral[600]
                    }}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>

          <TouchableOpacity
            onPress={() => setShowSavedOnly(!showSavedOnly)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: showSavedOnly ? colors.warning[50] : 'transparent',
              borderWidth: 1,
              borderColor: showSavedOnly ? colors.warning[200] : 'transparent',
              marginLeft: 8
            }}
          >
            <Text style={{ fontSize: 11 }}>⭐</Text>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: showSavedOnly ? colors.warning[700] : colors.neutral[500] }}>
              Saved
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. TAB 1: HOME (Announcements Feed) */}
      {currentTab === 'home' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          {/* Welcome Card with Deep VooDoo Gradient */}
          <View
            style={{
              backgroundColor: colors.neutral[900],
              padding: 18,
              borderRadius: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.neutral[800]
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.primary[400]
                }}
              />
              <Text style={{ color: colors.primary[400], fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5 }}>
                REALTIME WEBSOCKET ACTIVE
              </Text>
            </View>
            <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginTop: 6 }}>
              Hi, {currentUser.full_name.split(' ')[0]} 👋
            </Text>
            <Text style={{ color: colors.neutral[300], fontSize: 13, marginTop: 4, lineHeight: 18 }}>
              Stay updated with campus hackathons, engineering workshops, and slide decks.
            </Text>

            {/* Quick Actions in Banner */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <TouchableOpacity
                onPress={() => setIsQrPassOpen(true)}
                style={{
                  backgroundColor: colors.primary[500],
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>Check-in Pass</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCurrentTab('events')}
                style={{
                  backgroundColor: colors.neutral[800],
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8
                }}
              >
                <Text style={{ color: colors.neutral[200], fontWeight: 'bold', fontSize: 12 }}>View Workshops →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <View style={{ flex: 1, backgroundColor: '#ffffff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200] }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.neutral[400], textTransform: 'uppercase' }}>Members</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900], marginTop: 2 }}>380+ Students</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#ffffff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.neutral[200] }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.neutral[400], textTransform: 'uppercase' }}>Hackathon</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary[600], marginTop: 2 }}>$5,000 Prizes</Text>
            </View>
          </View>

          {/* Announcements Feed Section */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.neutral[900] }}>
              Recent Broadcasts ({filteredAnnouncements.length})
            </Text>
            {isAdmin && (
              <TouchableOpacity
                onPress={() => setIsBroadcastModalOpen(true)}
                style={{
                  backgroundColor: colors.primary[50],
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: colors.primary[200]
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[700] }}>+ Broadcast</Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredAnnouncements.length === 0 ? (
            <View style={{ backgroundColor: '#ffffff', padding: 32, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.neutral[200] }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>🔍</Text>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.neutral[800] }}>No announcements found</Text>
              <Text style={{ fontSize: 12, color: colors.neutral[500], marginTop: 2 }}>Try clearing your search query or saved filter.</Text>
            </View>
          ) : (
            filteredAnnouncements.map((item) => {
              const rx = reactions[item.id] || { fire: 12, rocket: 8, heart: 4 };
              const isSaved = bookmarkedIds.includes(item.id);

              return (
                <View
                  key={item.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderWidth: 1,
                    borderColor: item.pinned ? colors.primary[300] : colors.neutral[200],
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 14,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                    elevation: 1
                  }}
                >
                  {/* Pinned Pill Header */}
                  {item.pinned && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.primary[50],
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        alignSelf: 'flex-start',
                        marginBottom: 10
                      }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[700] }}>
                        📌 PINNED ANNOUNCEMENT
                      </Text>
                    </View>
                  )}

                  {/* Author Info & Save Action */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Image
                        source={{ uri: item.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }}
                        style={{ width: 34, height: 34, borderRadius: 17 }}
                      />
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>
                            {item.author_name}
                          </Text>
                          <View style={{ backgroundColor: colors.primary[50], paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: colors.primary[600] }}>
                              {getDisplayRole(item.author_role)}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 10, color: colors.neutral[400] }}>
                          Campus Engineering Lead
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleToggleBookmark(item.id)}
                      style={{ padding: 6 }}
                    >
                      <Text style={{ fontSize: 16 }}>{isSaved ? '★' : '☆'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Title & Body */}
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 6 }}>
                    {item.title}
                  </Text>

                  <Text style={{ fontSize: 13, color: colors.neutral[600], lineHeight: 19, marginBottom: 10 }}>
                    {item.body}
                  </Text>

                  {/* Optional Media Image */}
                  {item.media_url && (
                    <Image
                      source={{ uri: item.media_url }}
                      style={{ width: '100%', height: 160, borderRadius: 10, marginBottom: 12 }}
                      resizeMode="cover"
                    />
                  )}

                  {/* Reaction Chips & Footer Actions */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTopWidth: 1,
                      borderTopColor: colors.neutral[100],
                      paddingTop: 10
                    }}
                  >
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        onPress={() => handleReact(item.id, 'fire')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3,
                          backgroundColor: colors.neutral[100],
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8
                        }}
                      >
                        <Text style={{ fontSize: 12 }}>🔥</Text>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700] }}>{rx.fire}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleReact(item.id, 'rocket')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3,
                          backgroundColor: colors.neutral[100],
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8
                        }}
                      >
                        <Text style={{ fontSize: 12 }}>🚀</Text>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700] }}>{rx.rocket}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleReact(item.id, 'heart')}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3,
                          backgroundColor: colors.neutral[100],
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8
                        }}
                      >
                        <Text style={{ fontSize: 12 }}>❤️</Text>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700] }}>{rx.heart}</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => handleShare(item.title, item.body)}
                        style={{ padding: 4 }}
                      >
                        <Text style={{ fontSize: 12 }}>📤</Text>
                      </TouchableOpacity>

                      <View
                        style={{
                          backgroundColor: colors.primary[50],
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 6
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[700], textTransform: 'uppercase' }}>
                          {item.category}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* 3. TAB 2: EVENTS (Events List + 1-Tap Quick RSVP + Details) */}
      {currentTab === 'events' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900] }}>
              Workshops & Sprints
            </Text>
            {isAdmin && (
              <TouchableOpacity
                onPress={() => setIsCreateEventModalOpen(true)}
                style={{
                  backgroundColor: colors.primary[50],
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: colors.primary[200]
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[700] }}>+ Workshop</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={{ fontSize: 12, color: colors.neutral[500], marginBottom: 16 }}>
            Tap any card to view agenda, venue logistics, or RSVP with 1-tap.
          </Text>

          {filteredEvents.map((evt) => {
            const isReg = registeredEventIds.includes(evt.id);
            const spotsLeft = Math.max(0, evt.capacity - (evt.registrations_count || 0));
            const fillRatio = Math.min(1, (evt.registrations_count || 0) / evt.capacity);

            return (
              <TouchableOpacity
                key={evt.id}
                activeOpacity={0.9}
                onPress={() => setSelectedEvent(evt)}
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: isReg ? colors.primary[300] : colors.neutral[200],
                  borderRadius: 16,
                  overflow: 'hidden',
                  marginBottom: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 1
                }}
              >
                <Image
                  source={{ uri: evt.banner_url }}
                  style={{ width: '100%', height: 140 }}
                  resizeMode="cover"
                />

                <View style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[600], textTransform: 'uppercase' }}>
                      {evt.category}
                    </Text>
                    {isReg ? (
                      <View style={{ backgroundColor: colors.success[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.success[700] }}>✓ RSVP Confirmed</Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[500] }}>
                        {spotsLeft} spots left
                      </Text>
                    )}
                  </View>

                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 6 }}>
                    {evt.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.neutral[600], marginBottom: 10, lineHeight: 17 }} numberOfLines={2}>
                    {evt.description}
                  </Text>

                  <Text style={{ fontSize: 11, color: colors.neutral[500], marginBottom: 3 }}>
                    📍 {evt.location}
                  </Text>

                  {/* Spots Fill Meter */}
                  <View style={{ height: 4, backgroundColor: colors.neutral[100], borderRadius: 2, marginVertical: 8, overflow: 'hidden' }}>
                    <View style={{ width: `${fillRatio * 100}%`, height: '100%', backgroundColor: colors.primary[500] }} />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <TouchableOpacity
                      onPress={() => handleToggleEventRSVP(evt.id)}
                      style={{
                        flex: 1,
                        backgroundColor: isReg ? colors.danger[50] : colors.primary[500],
                        borderWidth: isReg ? 1 : 0,
                        borderColor: colors.danger[200],
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: 'center'
                      }}
                    >
                      <Text
                        style={{
                          color: isReg ? colors.danger[700] : '#ffffff',
                          fontWeight: 'bold',
                          fontSize: 13
                        }}
                      >
                        {isReg ? 'Cancel Registration' : '1-Tap Quick RSVP'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => setSelectedEvent(evt)}
                      style={{
                        backgroundColor: colors.neutral[100],
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: 10,
                        justifyContent: 'center'
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.neutral[700] }}>Details →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* 4. TAB 3: RESOURCES (Knowledge Vault) */}
      {currentTab === 'resources' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
            Knowledge & Slide Decks
          </Text>
          <Text style={{ fontSize: 12, color: colors.neutral[500], marginBottom: 16 }}>
            Download slides, cheat sheets, and architecture blueprints curated by club leads.
          </Text>

          {filteredResources.map((res) => {
            const isSaved = bookmarkedIds.includes(res.id);
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
                  padding: 16,
                  marginBottom: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 1
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[600], textTransform: 'uppercase' }}>
                    {res.category}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 11, color: colors.neutral[400], fontWeight: 'bold' }}>
                      {res.file_size}
                    </Text>
                    <TouchableOpacity onPress={() => handleToggleBookmark(res.id)}>
                      <Text style={{ fontSize: 14 }}>{isSaved ? '★' : '☆'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
                  {res.title}
                </Text>
                <Text style={{ fontSize: 12, color: colors.neutral[500], marginBottom: 12 }} numberOfLines={2}>
                  {res.description}
                </Text>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      triggerToast(`Downloaded ${res.title} (${res.file_size})`);
                      Alert.alert('Download Complete 📥', `Saved ${res.title} to device downloads folder.`);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: colors.neutral[100],
                      paddingVertical: 9,
                      borderRadius: 8,
                      alignItems: 'center'
                    }}
                  >
                    <Text style={{ color: colors.neutral[800], fontWeight: 'bold', fontSize: 12 }}>
                      Download ({res.download_count} dl)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setSelectedResource(res)}
                    style={{
                      backgroundColor: colors.primary[50],
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      borderRadius: 8,
                      justifyContent: 'center'
                    }}
                  >
                    <Text style={{ color: colors.primary[700], fontWeight: 'bold', fontSize: 12 }}>Preview</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* 5. TAB 4: PROFILE & DIGITAL STUDENT PASS */}
      {currentTab === 'profile' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          {/* Profile Card */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: colors.neutral[200],
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2
            }}
          >
            <TouchableOpacity onPress={() => setIsAvatarModalOpen(true)} style={{ position: 'relative' }}>
              <Image
                source={{ uri: currentUser.avatar_url }}
                style={{ width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.primary[200] }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: colors.primary[500],
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: '#ffffff'
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 12 }}>✎</Text>
              </View>
            </TouchableOpacity>

            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900], marginTop: 10 }}>
              {currentUser.full_name}
            </Text>
            <Text style={{ fontSize: 12, color: colors.neutral[500], marginTop: 2 }}>
              {currentUser.department} · {currentUser.student_id}
            </Text>

            <View
              style={{
                marginTop: 8,
                backgroundColor: colors.primary[50],
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.primary[200]
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[700], textTransform: 'uppercase' }}>
                {getDisplayRole(currentUser.role)}
              </Text>
            </View>

            {/* Quick Stats Grid */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18, width: '100%' }}>
              <View style={{ flex: 1, backgroundColor: colors.neutral[50], padding: 10, borderRadius: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900] }}>{registeredEventIds.length}</Text>
                <Text style={{ fontSize: 10, color: colors.neutral[500] }}>Active RSVPs</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.neutral[50], padding: 10, borderRadius: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900] }}>{bookmarkedIds.length}</Text>
                <Text style={{ fontSize: 10, color: colors.neutral[500] }}>Saved Items</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.neutral[50], padding: 10, borderRadius: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.success[600] }}>Verified</Text>
                <Text style={{ fontSize: 10, color: colors.neutral[500] }}>Campus Status</Text>
              </View>
            </View>

            {/* Launch QR Pass Trigger Button */}
            <TouchableOpacity
              onPress={() => setIsQrPassOpen(true)}
              style={{
                marginTop: 16,
                backgroundColor: colors.neutral[900],
                paddingVertical: 11,
                paddingHorizontal: 16,
                borderRadius: 10,
                width: '100%',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <Text style={{ fontSize: 13 }}>🎟️</Text>
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>
                View Digital Event Pass
              </Text>
            </TouchableOpacity>
          </View>

          {/* Admin Management Hub (Strictly visible to Admin) */}
          {isAdmin && (
            <View
              style={{
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: colors.neutral[200],
                borderRadius: 16,
                padding: 16,
                marginBottom: 16
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.neutral[900] }}>
                  Admin Operations Console
                </Text>
                <View style={{ backgroundColor: colors.warning[100], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.warning[800] }}>ADMIN ONLY</Text>
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setIsVerificationsModalOpen(true)}
                  style={{
                    backgroundColor: colors.neutral[50],
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.neutral[200],
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>
                      Student Membership Verifications
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                      Review applicants requesting portal access
                    </Text>
                  </View>
                  {pendingMembers.length > 0 && (
                    <View style={{ backgroundColor: colors.warning[500], paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: 'bold' }}>{pendingMembers.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsCreateEventModalOpen(true)}
                  style={{
                    backgroundColor: colors.neutral[50],
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.neutral[200]
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>
                    + Publish New Campus Workshop
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                    Schedule sprints, set venue & capacity
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Device Telemetry Card */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: colors.neutral[200],
              borderRadius: 16,
              padding: 16,
              marginBottom: 16
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[800], marginBottom: 6 }}>
              Push Notification Telemetry
            </Text>
            <Text style={{ fontSize: 11, color: colors.success[700], marginBottom: 10 }}>
              ✓ {pushStatus}
            </Text>
            <TouchableOpacity
              onPress={() => {
                triggerToast('Push Broadcast Emitted');
                Alert.alert('Simulated Notification Received 🔔', 'ATC Emergency Notice: "Registration open for the 2026 AI Hackathon!"');
              }}
              style={{
                backgroundColor: colors.primary[50],
                paddingVertical: 10,
                borderRadius: 10,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: colors.primary[200]
              }}
            >
              <Text style={{ color: colors.primary[700], fontWeight: 'bold', fontSize: 12 }}>
                Simulate Push Notification Test
              </Text>
            </TouchableOpacity>
          </View>

          {/* Active Event RSVPs */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: colors.neutral[200],
              borderRadius: 16,
              padding: 16
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[800], marginBottom: 10 }}>
              My Active Event RSVPs ({registeredEventIds.length})
            </Text>
            {registeredEventIds.map((id) => {
              const matched = events.find((e) => e.id === id);
              if (!matched) return null;
              return (
                <View
                  key={id}
                  style={{
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.neutral[100],
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>{matched.title}</Text>
                    <Text style={{ fontSize: 11, color: colors.neutral[500], marginTop: 2 }}>📍 {matched.location}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleToggleEventRSVP(id)}
                    style={{ backgroundColor: colors.danger[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
                  >
                    <Text style={{ color: colors.danger[700], fontSize: 11, fontWeight: 'bold' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* Account & Authentication Hub */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: colors.neutral[200],
              borderRadius: 16,
              padding: 16,
              marginTop: 16
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[800] }}>
                Account & Authentication Hub
              </Text>
              <View style={{ backgroundColor: colors.primary[50], paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[700] }}>FIREBASE AUTH</Text>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: colors.neutral[500], marginBottom: 12 }}>
              Signed in as {currentUser.full_name} ({currentUser.email || `${currentUser.student_id?.toLowerCase()}@techclub.edu`})
            </Text>

            <View style={{ gap: 8 }}>
              {/* Google Sign-In Link */}
              <TouchableOpacity
                onPress={() => {
                  triggerToast('Google Account Synchronized');
                  Alert.alert(
                    'Google Sign-In Active',
                    `Authenticated with Firebase project at-club-001.\n\nAccount: ${currentUser.full_name} (${currentUser.email || 'student@techclub.edu'})\nStudent ID: ${currentUser.student_id}\nProvider: Google Firebase Auth`
                  );
                }}
                style={{
                  backgroundColor: colors.neutral[50],
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.neutral[200],
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                <Text style={{ fontSize: 13 }}>🌐</Text>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.neutral[800] }}>
                  Google Account Synced · at-club-001
                </Text>
              </TouchableOpacity>

              {/* Persona Switch / Log In as Other Member */}
              <TouchableOpacity
                onPress={() => {
                  // Switch to next demo profile or prompt
                  const nextUser = initialProfiles.find((p) => p.id !== currentUser.id) || initialProfiles[0];
                  setCurrentUser(nextUser);
                  triggerToast(`Switched account to ${nextUser.full_name}`);
                }}
                style={{
                  backgroundColor: colors.primary[50],
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.primary[200],
                  alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary[700] }}>
                  Switch Account / Log In Persona
                </Text>
              </TouchableOpacity>

              {/* Log Out Button */}
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Log Out',
                    'Are you sure you want to sign out of the Advanced Tech Club campus app?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Log Out',
                        style: 'destructive',
                        onPress: () => {
                          triggerToast('Signed out of ATC Mobile');
                        }
                      }
                    ]
                  );
                }}
                style={{
                  backgroundColor: colors.danger[50],
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.danger[200],
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: colors.danger[700], fontWeight: 'bold', fontSize: 12 }}>
                  Log Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FLOATING ADMIN FAB (Visible strictly to Admin) */}
      {isAdmin && (
        <TouchableOpacity
          onPress={() => setIsBroadcastModalOpen(true)}
          style={{
            position: 'absolute',
            bottom: 78,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.primary[500],
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 6,
            shadowColor: colors.primary[500],
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 6
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 26, fontWeight: 'bold', lineHeight: 28 }}>+</Text>
        </TouchableOpacity>
      )}

      {/* 6. MODAL: EVENT DETAILS & ATTENDEE ROSTER */}
      <Modal visible={!!selectedEvent} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' }}>
            {selectedEvent && (
              <ScrollView>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[600], textTransform: 'uppercase' }}>
                    {selectedEvent.category} · CAMPUS WORKSHOP
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedEvent(null)}>
                    <Text style={{ fontSize: 16, color: colors.neutral[400], fontWeight: 'bold' }}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Image
                  source={{ uri: selectedEvent.banner_url }}
                  style={{ width: '100%', height: 150, borderRadius: 12, marginBottom: 12 }}
                  resizeMode="cover"
                />

                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 8 }}>
                  {selectedEvent.title}
                </Text>

                <Text style={{ fontSize: 13, color: colors.neutral[600], lineHeight: 19, marginBottom: 16 }}>
                  {selectedEvent.description}
                </Text>

                {/* Logistics Bar */}
                <View style={{ backgroundColor: colors.neutral[50], padding: 12, borderRadius: 12, gap: 6, marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, color: colors.neutral[700] }}>
                    📍 <strong>Venue:</strong> {selectedEvent.location}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.neutral[700] }}>
                    👥 <strong>Attendance:</strong> {selectedEvent.registrations_count || 0} / {selectedEvent.capacity} students confirmed
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.neutral[700] }}>
                    🎓 <strong>Coordinated by:</strong> Ritesh Mishra (Admin)
                  </Text>
                </View>

                {/* Schedule Agenda */}
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[800], marginBottom: 6 }}>
                  Workshop Agenda
                </Text>
                <View style={{ gap: 6, marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, color: colors.neutral[600] }}>• 05:30 PM — Check-in & Badge Issuance</Text>
                  <Text style={{ fontSize: 12, color: colors.neutral[600] }}>• 06:00 PM — Hands-on Code Walkthrough</Text>
                  <Text style={{ fontSize: 12, color: colors.neutral[600] }}>• 07:15 PM — Q&A, Networking & Swag distribution</Text>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      handleToggleEventRSVP(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: registeredEventIds.includes(selectedEvent.id)
                        ? colors.danger[50]
                        : colors.primary[500],
                      paddingVertical: 13,
                      borderRadius: 10,
                      alignItems: 'center'
                    }}
                  >
                    <Text
                      style={{
                        color: registeredEventIds.includes(selectedEvent.id)
                          ? colors.danger[700]
                          : '#ffffff',
                        fontWeight: 'bold',
                        fontSize: 14
                      }}
                    >
                      {registeredEventIds.includes(selectedEvent.id)
                        ? 'Cancel Registration'
                        : '1-Tap Quick RSVP'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setIsQrPassOpen(true);
                      setSelectedEvent(null);
                    }}
                    style={{
                      backgroundColor: colors.neutral[900],
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      justifyContent: 'center'
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Pass 🎟️</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 7. MODAL: DIGITAL EVENT CHECK-IN & CAMPUS MEMBER PASS */}
      <Modal visible={isQrPassOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 24,
              padding: 24,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 10
            }}
          >
            <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success[500] }} />
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.success[700], letterSpacing: 0.5 }}>
                  VERIFIED CAMPUS PASS
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsQrPassOpen(false)}>
                <Text style={{ fontSize: 16, color: colors.neutral[400], fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Image
              source={{ uri: currentUser.avatar_url }}
              style={{ width: 72, height: 72, borderRadius: 36, marginBottom: 8, borderWidth: 2, borderColor: colors.primary[300] }}
            />

            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900] }}>
              {currentUser.full_name}
            </Text>
            <Text style={{ fontSize: 12, color: colors.neutral[500], marginTop: 1 }}>
              {currentUser.student_id} · {currentUser.department}
            </Text>

            {/* QR Simulation Card */}
            <View
              style={{
                backgroundColor: colors.neutral[900],
                borderRadius: 16,
                padding: 16,
                marginVertical: 18,
                alignItems: 'center',
                width: 200,
                height: 200,
                justifyContent: 'center'
              }}
            >
              <View style={{ width: 140, height: 140, backgroundColor: '#ffffff', borderRadius: 8, padding: 8, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ width: 36, height: 36, backgroundColor: colors.neutral[900], borderRadius: 4 }} />
                  <View style={{ width: 36, height: 36, backgroundColor: colors.neutral[900], borderRadius: 4 }} />
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 12, color: colors.primary[600] }}>ATC PASS</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ width: 36, height: 36, backgroundColor: colors.neutral[900], borderRadius: 4 }} />
                  <View style={{ width: 36, height: 36, backgroundColor: colors.primary[500], borderRadius: 4 }} />
                </View>
              </View>
              <Text style={{ color: colors.neutral[400], fontSize: 10, marginTop: 8, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                AUTH-PASS-2026-ATC
              </Text>
            </View>

            <Text style={{ fontSize: 11, color: colors.neutral[500], textAlign: 'center', lineHeight: 16, paddingHorizontal: 10 }}>
              Present this code at Innovation Lab Room 302 or Turing Auditorium gate scanners for instant workshop attendance check-in.
            </Text>

            <TouchableOpacity
              onPress={() => {
                triggerToast('Pass verified by gate simulator ✓');
                setIsQrPassOpen(false);
              }}
              style={{
                marginTop: 18,
                backgroundColor: colors.primary[500],
                paddingVertical: 11,
                width: '100%',
                borderRadius: 12,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 8. MODAL: AVATAR CUSTOMIZER */}
      <Modal visible={isAvatarModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900] }}>
                Choose Profile Avatar
              </Text>
              <TouchableOpacity onPress={() => setIsAvatarModalOpen(false)}>
                <Text style={{ fontSize: 14, color: colors.neutral[500] }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: colors.neutral[500], marginBottom: 14 }}>
              Select a campus developer avatar preset:
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
              {avatarPresets.map((uri, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setCurrentUser((prev) => ({ ...prev, avatar_url: uri }));
                    setIsAvatarModalOpen(false);
                    triggerToast('Avatar updated!');
                  }}
                  style={{
                    borderWidth: currentUser.avatar_url === uri ? 3 : 1,
                    borderColor: currentUser.avatar_url === uri ? colors.primary[500] : colors.neutral[200],
                    borderRadius: 35,
                    padding: 2
                  }}
                >
                  <Image source={{ uri }} style={{ width: 60, height: 60, borderRadius: 30 }} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* 9. MODAL: ADMIN STUDENT VERIFICATIONS REVIEW SHEET */}
      <Modal visible={isVerificationsModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900] }}>
                Pending Student Applications ({pendingMembers.length})
              </Text>
              <TouchableOpacity onPress={() => setIsVerificationsModalOpen(false)}>
                <Text style={{ fontSize: 14, color: colors.neutral[500] }}>✕</Text>
              </TouchableOpacity>
            </View>

            {pendingMembers.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 24, marginBottom: 6 }}>✓</Text>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.neutral[800] }}>All caught up!</Text>
                <Text style={{ fontSize: 12, color: colors.neutral[500] }}>No pending student verification requests.</Text>
              </View>
            ) : (
              <ScrollView>
                {pendingMembers.map((m) => (
                  <View
                    key={m.id}
                    style={{
                      borderWidth: 1,
                      borderColor: colors.neutral[200],
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 10,
                      backgroundColor: colors.neutral[50]
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <Image source={{ uri: m.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.neutral[900] }}>{m.full_name}</Text>
                        <Text style={{ fontSize: 11, color: colors.neutral[500] }}>{m.department} · {m.student_id}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.neutral[600], marginBottom: 8 }}>{m.bio}</Text>
                    <TouchableOpacity
                      onPress={() => handleApproveMember(m.student_id)}
                      style={{
                        backgroundColor: colors.success[500],
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 12 }}>Approve & Verify Student</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 10. MODAL: ADMIN BROADCAST POST SHEET */}
      <Modal visible={isBroadcastModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900] }}>
                Admin Quick Broadcast
              </Text>
              <TouchableOpacity onPress={() => setIsBroadcastModalOpen(false)}>
                <Text style={{ fontSize: 14, color: colors.neutral[500] }}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Announcement Title..."
              value={newAnnTitle}
              onChangeText={setNewAnnTitle}
              style={{
                borderWidth: 1,
                borderColor: colors.neutral[300],
                borderRadius: 10,
                padding: 12,
                fontSize: 13,
                marginBottom: 10
              }}
            />

            <TextInput
              placeholder="Announcement details & instructions..."
              value={newAnnBody}
              onChangeText={setNewAnnBody}
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1,
                borderColor: colors.neutral[300],
                borderRadius: 10,
                padding: 12,
                fontSize: 13,
                textAlignVertical: 'top',
                marginBottom: 14
              }}
            />

            <TouchableOpacity
              onPress={handleAdminPostAnnouncement}
              style={{
                backgroundColor: colors.primary[500],
                paddingVertical: 13,
                borderRadius: 10,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                Publish & Trigger Mobile Push
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 11. MODAL: ADMIN WORKSHOP CREATOR SHEET */}
      <Modal visible={isCreateEventModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900] }}>
                Schedule Campus Workshop
              </Text>
              <TouchableOpacity onPress={() => setIsCreateEventModalOpen(false)}>
                <Text style={{ fontSize: 14, color: colors.neutral[500] }}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Workshop Title (e.g. AI Agentic Systems)"
              value={newEventTitle}
              onChangeText={setNewEventTitle}
              style={{
                borderWidth: 1,
                borderColor: colors.neutral[300],
                borderRadius: 10,
                padding: 12,
                fontSize: 13,
                marginBottom: 10
              }}
            />

            <TextInput
              placeholder="Campus Venue / Room (e.g. Turing Auditorium Room 302)"
              value={newEventLocation}
              onChangeText={setNewEventLocation}
              style={{
                borderWidth: 1,
                borderColor: colors.neutral[300],
                borderRadius: 10,
                padding: 12,
                fontSize: 13,
                marginBottom: 10
              }}
            />

            <TextInput
              placeholder="Short Description & Requirements"
              value={newEventDesc}
              onChangeText={setNewEventDesc}
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1,
                borderColor: colors.neutral[300],
                borderRadius: 10,
                padding: 12,
                fontSize: 13,
                textAlignVertical: 'top',
                marginBottom: 14
              }}
            />

            <TouchableOpacity
              onPress={handleAdminCreateEvent}
              style={{
                backgroundColor: colors.primary[500],
                paddingVertical: 13,
                borderRadius: 10,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                Publish Event & Open RSVPs
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 12. BOTTOM TAB NAVIGATOR WITH POLISHED PILLS */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: colors.neutral[200],
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
          paddingBottom: Platform.OS === 'ios' ? 10 : 0
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
            ●
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
            ◈
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
    </SafeAreaView>
  );
}
