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
  Platform
} from 'react-native';
import { initialProfiles, initialAnnouncements, initialEvents, initialResources } from '@atc/shared/mockData';
import { colors } from '@atc/shared/theme';

export default function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState('home'); // 'home' | 'events' | 'resources' | 'profile'

  // Active User Profile
  const [currentUser, setCurrentUser] = useState(initialProfiles[0]); // Default: Ritesh Mishra
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  // Rule 4 Helper: Format role strictly as 'Admin' or 'Member'
  const getDisplayRole = (role) => {
    if (role === 'admin' || role === 'super_admin') return 'Admin';
    return 'Member';
  };

  // Feed & Events State
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [events, setEvents] = useState(initialEvents);
  const [resources, setResources] = useState(initialResources);
  const [registeredEventIds, setRegisteredEventIds] = useState(['evt-1']);
  const [reactions, setReactions] = useState({ 'ann-1': { fire: 42, rocket: 28 }, 'ann-2': { fire: 19, rocket: 35 } });

  // Admin Bottom Sheet Modal
  const [isFabModalOpen, setIsFabModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState('hackathon');
  const [newPinned, setNewPinned] = useState(false);

  // Push Token Status
  const [pushStatus, setPushStatus] = useState('ExponentPushToken active');

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
      Alert.alert('RSVP Cancelled', 'You have been removed from this event.');
    } else {
      setRegisteredEventIds((prev) => [...prev, eventId]);
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, registrations_count: (e.registrations_count || 0) + 1 }
            : e
        )
      );
      Alert.alert('RSVP Confirmed! 🎉', 'You are registered! Your campus 1-tap confirmation has been saved.');
    }
  };

  // Reactions toggle
  const handleReact = (annId, type) => {
    setReactions((prev) => {
      const current = prev[annId] || { fire: 0, rocket: 0 };
      return {
        ...prev,
        [annId]: {
          ...current,
          [type]: current[type] + 1
        }
      };
    });
  };

  // Admin Quick Announcement Post (Rule 4 compliant: author_role is strictly 'Admin')
  const handleAdminPost = () => {
    if (!newTitle.trim() || !newBody.trim()) {
      Alert.alert('Required', 'Please enter a title and message.');
      return;
    }
    const created = {
      id: `ann-${Date.now()}`,
      title: newTitle.trim(),
      body: newBody.trim(),
      category: newCategory,
      pinned: newPinned,
      author_name: currentUser.full_name,
      author_role: 'Admin',
      author_avatar: currentUser.avatar_url,
      created_at: new Date().toISOString()
    };
    setAnnouncements((prev) => [created, ...prev]);
    setIsFabModalOpen(false);
    setNewTitle('');
    setNewBody('');
    setNewPinned(false);
    Alert.alert('Broadcast Sent', 'Announcement published and pushed to all connected student devices.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

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
            <Text style={{ fontSize: 11, color: colors.neutral[500], marginTop: 1 }}>
              Official Student Mobile Hub
            </Text>
          </View>
        </View>

        {/* Demo Switcher Quick Pill (Rule 4 compliant: displays 'Admin' or 'Member') */}
        <TouchableOpacity
          onPress={() => {
            const nextIndex = (initialProfiles.findIndex((p) => p.id === currentUser.id) + 1) % 3;
            setCurrentUser(initialProfiles[nextIndex]);
          }}
          style={{
            backgroundColor: colors.primary[50],
            paddingHorizontal: 10,
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
          <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 12 }}>
            Recent Broadcasts
          </Text>

          {announcements.map((item) => {
            const rx = reactions[item.id] || { fire: 12, rocket: 8 };
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

                {/* Author Info */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Image
                    source={{ uri: item.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }}
                    style={{ width: 32, height: 32, borderRadius: 16 }}
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

                {/* Reaction Chips & Category Footer */}
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
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleReact(item.id, 'fire')}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
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
                        gap: 4,
                        backgroundColor: colors.neutral[100],
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8
                      }}
                    >
                      <Text style={{ fontSize: 12 }}>🚀</Text>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[700] }}>{rx.rocket}</Text>
                    </TouchableOpacity>
                  </View>

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
            );
          })}
          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* 3. TAB 2: EVENTS (Events List + 1-Tap Quick RSVP) */}
      {currentTab === 'events' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
            Workshops & Hackathons
          </Text>
          <Text style={{ fontSize: 12, color: colors.neutral[500], marginBottom: 16 }}>
            Tap the button to RSVP with 1-tap instant campus confirmation.
          </Text>

          {events.map((evt) => {
            const isReg = registeredEventIds.includes(evt.id);
            const spotsLeft = Math.max(0, evt.capacity - (evt.registrations_count || 0));
            const fillRatio = Math.min(1, (evt.registrations_count || 0) / evt.capacity);

            return (
              <View
                key={evt.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: colors.neutral[200],
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
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.neutral[500] }}>
                      {spotsLeft} spots left
                    </Text>
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

                  <TouchableOpacity
                    onPress={() => handleToggleEventRSVP(evt.id)}
                    style={{
                      backgroundColor: isReg ? colors.danger[50] : colors.primary[500],
                      borderWidth: isReg ? 1 : 0,
                      borderColor: colors.danger[200],
                      paddingVertical: 11,
                      borderRadius: 10,
                      alignItems: 'center',
                      marginTop: 6
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
                </View>
              </View>
            );
          })}
          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* 4. TAB 3: RESOURCES */}
      {currentTab === 'resources' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
            Knowledge & Slide Decks
          </Text>
          <Text style={{ fontSize: 12, color: colors.neutral[500], marginBottom: 16 }}>
            Download slides, cheat sheets, and architecture blueprints.
          </Text>

          {resources.map((res) => (
            <View
              key={res.id}
              style={{
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: colors.neutral[200],
                borderRadius: 14,
                padding: 16,
                marginBottom: 12
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[600], textTransform: 'uppercase' }}>
                  {res.category}
                </Text>
                <Text style={{ fontSize: 11, color: colors.neutral[400], fontWeight: 'bold' }}>
                  {res.file_size}
                </Text>
              </View>

              <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
                {res.title}
              </Text>
              <Text style={{ fontSize: 12, color: colors.neutral[500], marginBottom: 12 }}>
                {res.description}
              </Text>

              <TouchableOpacity
                onPress={() => Alert.alert('Downloading File', `Downloading ${res.title} (${res.file_size}).`)}
                style={{
                  backgroundColor: colors.neutral[100],
                  paddingVertical: 9,
                  borderRadius: 8,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: colors.neutral[800], fontWeight: 'bold', fontSize: 12 }}>
                  Download Resource ({res.download_count} dl)
                </Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* 5. TAB 4: PROFILE */}
      {currentTab === 'profile' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: colors.neutral[200],
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
              marginBottom: 16
            }}
          >
            <Image
              source={{ uri: currentUser.avatar_url }}
              style={{ width: 84, height: 84, borderRadius: 42, marginBottom: 12, borderWidth: 3, borderColor: colors.primary[100] }}
            />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900] }}>
              {currentUser.full_name}
            </Text>
            <Text style={{ fontSize: 12, color: colors.neutral[500], marginTop: 2 }}>
              {currentUser.department}
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
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18, width: '100%' }}>
              <View style={{ flex: 1, backgroundColor: colors.neutral[50], padding: 10, borderRadius: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900] }}>{registeredEventIds.length}</Text>
                <Text style={{ fontSize: 10, color: colors.neutral[500] }}>RSVPs</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.neutral[50], padding: 10, borderRadius: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900] }}>Verified</Text>
                <Text style={{ fontSize: 10, color: colors.success[600] }}>Active</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.neutral[50], padding: 10, borderRadius: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900] }}>Spring '26</Text>
                <Text style={{ fontSize: 10, color: colors.neutral[500] }}>Semester</Text>
              </View>
            </View>
          </View>

          {/* Device & Notification Token Info */}
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
              onPress={() => Alert.alert('Test Push Notification', 'Simulated Expo push notification sent to device: "⚡ Hackathon announcement received!"')}
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
                Send Simulated Test Push Notification
              </Text>
            </TouchableOpacity>
          </View>

          {/* My Active Event RSVPs */}
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
                <View key={id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[900] }}>{matched.title}</Text>
                  <Text style={{ fontSize: 11, color: colors.neutral[500], marginTop: 2 }}>📍 {matched.location}</Text>
                </View>
              );
            })}
          </View>
          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* Floating Admin FAB (Visible strictly to Admin) */}
      {isAdmin && (
        <TouchableOpacity
          onPress={() => setIsFabModalOpen(true)}
          style={{
            position: 'absolute',
            bottom: 74,
            right: 20,
            width: 54,
            height: 54,
            borderRadius: 27,
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

      {/* Admin Quick Post Bottom Sheet Modal */}
      <Modal visible={isFabModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: 'bold', color: colors.neutral[900] }}>
                Admin Quick Broadcast
              </Text>
              <TouchableOpacity onPress={() => setIsFabModalOpen(false)}>
                <Text style={{ fontSize: 14, color: colors.neutral[500] }}>✕ Close</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Announcement Title..."
              value={newTitle}
              onChangeText={setNewTitle}
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
              value={newBody}
              onChangeText={setNewBody}
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
              onPress={handleAdminPost}
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

      {/* 6. BOTTOM TAB NAVIGATOR WITH POLISHED PILLS */}
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
          onPress={() => setCurrentTab('home')}
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
          onPress={() => setCurrentTab('events')}
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
          onPress={() => setCurrentTab('resources')}
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
          onPress={() => setCurrentTab('profile')}
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
