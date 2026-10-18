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
  Platform
} from 'react-native';
import { initialProfiles, initialAnnouncements, initialEvents, initialResources } from '@atc/shared/mockData';
import { colors } from '@atc/shared/theme';

export default function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState('home'); // 'home' | 'events' | 'resources' | 'profile'

  // Active User Profile
  const [currentUser, setCurrentUser] = useState(initialProfiles[0]); // Default: Ritesh Mishra (Super Admin)
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';
  const isSuperAdmin = currentUser.role === 'super_admin';

  // Feed & Events State
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [events, setEvents] = useState(initialEvents);
  const [resources, setResources] = useState(initialResources);
  const [registeredEventIds, setRegisteredEventIds] = useState(['evt-1']);

  // Admin Bottom Sheet Modal
  const [isFabModalOpen, setIsFabModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState('general');

  // Push Token Status
  const [pushStatus, setPushStatus] = useState('Simulated ExponentPushToken active');

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
      Alert.alert('RSVP Confirmed! 🎉', 'You are registered for this event. 1-tap confirmation saved.');
    }
  };

  // Admin Quick Announcement Post
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
      pinned: false,
      author_name: currentUser.full_name,
      author_role: currentUser.role === 'super_admin' ? 'President' : 'Lead',
      author_avatar: currentUser.avatar_url,
      created_at: new Date().toISOString()
    };
    setAnnouncements((prev) => [created, ...prev]);
    setIsFabModalOpen(false);
    setNewTitle('');
    setNewBody('');
    Alert.alert('Broadcast Sent', 'Announcement published and pushed to all connected members.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral[50] }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Header Bar */}
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
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: colors.primary[500],
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>ATC</Text>
          </View>
          <View>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: colors.neutral[900] }}>
              Advanced Tech Club
            </Text>
            <Text style={{ fontSize: 10, color: colors.neutral[500] }}>
              Student Mobile Hub · Realtime
            </Text>
          </View>
        </View>

        {/* Demo Switcher Quick Pill */}
        <TouchableOpacity
          onPress={() => {
            const nextIndex = (initialProfiles.findIndex((p) => p.id === currentUser.id) + 1) % 3;
            setCurrentUser(initialProfiles[nextIndex]);
          }}
          style={{
            backgroundColor: colors.neutral[100],
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: colors.neutral[200]
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[600] }}>
            {currentUser.role.toUpperCase()} ⟳
          </Text>
        </TouchableOpacity>
      </View>

      {/* TAB 1: HOME (Announcements Feed) */}
      {currentTab === 'home' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          {/* Welcome Card */}
          <View
            style={{
              backgroundColor: colors.neutral[900],
              padding: 16,
              borderRadius: 14,
              marginBottom: 16
            }}
          >
            <Text style={{ color: colors.primary[400], fontSize: 11, fontWeight: 'bold' }}>
              ● REALTIME WEBSOCKET PUSH ACTIVE
            </Text>
            <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>
              Hi, {currentUser.full_name.split(' ')[0]} 👋
            </Text>
            <Text style={{ color: colors.neutral[300], fontSize: 12, marginTop: 4 }}>
              Stay updated with campus hackathons, engineering workshops, and slide decks.
            </Text>
          </View>

          {/* Announcements Feed */}
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 12 }}>
            Recent Broadcasts
          </Text>

          {announcements.map((item) => (
            <View
              key={item.id}
              style={{
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: item.pinned ? colors.primary[300] : colors.neutral[200],
                borderRadius: 12,
                padding: 14,
                marginBottom: 12
              }}
            >
              {item.pinned && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[600] }}>
                    📌 PINNED ANNOUNCEMENT
                  </Text>
                </View>
              )}

              <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
                {item.title}
              </Text>

              <Text style={{ fontSize: 13, color: colors.neutral[600], lineHeight: 18, marginBottom: 8 }}>
                {item.body}
              </Text>

              {item.media_url && (
                <Image
                  source={{ uri: item.media_url }}
                  style={{ width: '100%', height: 160, borderRadius: 8, marginBottom: 8 }}
                  resizeMode="cover"
                />
              )}

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  borderTopWidth: 1,
                  borderTopColor: colors.neutral[100],
                  paddingTop: 8
                }}
              >
                <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                  By {item.author_name}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[600], textTransform: 'uppercase' }}>
                  {item.category}
                </Text>
              </View>
            </View>
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* TAB 2: EVENTS (Events List + 1-Tap Quick RSVP) */}
      {currentTab === 'events' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
            Upcoming Workshops & Hackathons
          </Text>
          <Text style={{ fontSize: 12, color: colors.neutral[500], marginBottom: 16 }}>
            Tap the button to RSVP with 1-tap instant confirmation.
          </Text>

          {events.map((evt) => {
            const isReg = registeredEventIds.includes(evt.id);
            return (
              <View
                key={evt.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: colors.neutral[200],
                  borderRadius: 12,
                  overflow: 'hidden',
                  marginBottom: 16
                }}
              >
                <Image
                  source={{ uri: evt.banner_url }}
                  style={{ width: '100%', height: 130 }}
                  resizeMode="cover"
                />

                <View style={{ padding: 14 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[600], textTransform: 'uppercase', marginBottom: 2 }}>
                    {evt.category}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 6 }}>
                    {evt.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.neutral[600], marginBottom: 8 }} numberOfLines={2}>
                    {evt.description}
                  </Text>

                  <Text style={{ fontSize: 11, color: colors.neutral[500], marginBottom: 4 }}>
                    📍 {evt.location}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.neutral[500], marginBottom: 12 }}>
                    👥 {evt.registrations_count || 0} / {evt.capacity} students attending
                  </Text>

                  <TouchableOpacity
                    onPress={() => handleToggleEventRSVP(evt.id)}
                    style={{
                      backgroundColor: isReg ? colors.danger[50] : colors.primary[500],
                      borderWidth: isReg ? 1 : 0,
                      borderColor: colors.danger[200],
                      paddingVertical: 10,
                      borderRadius: 8,
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
                </View>
              </View>
            );
          })}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* TAB 3: RESOURCES */}
      {currentTab === 'resources' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
            Knowledge & Slide Decks
          </Text>
          <Text style={{ fontSize: 12, color: colors.neutral[500], marginBottom: 16 }}>
            Download slides, cheat sheets, and architecture patterns.
          </Text>

          {resources.map((res) => (
            <View
              key={res.id}
              style={{
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: colors.neutral[200],
                borderRadius: 12,
                padding: 14,
                marginBottom: 12
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: colors.primary[600], textTransform: 'uppercase' }}>
                  {res.category}
                </Text>
                <Text style={{ fontSize: 11, color: colors.neutral[400] }}>
                  {res.file_size}
                </Text>
              </View>

              <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.neutral[900], marginBottom: 4 }}>
                {res.title}
              </Text>
              <Text style={{ fontSize: 12, color: colors.neutral[500], marginBottom: 12 }}>
                {res.description}
              </Text>

              <TouchableOpacity
                onPress={() => Alert.alert('Downloading File', `Downloading ${res.title} (${res.file_size}).`)}
                style={{
                  backgroundColor: colors.neutral[100],
                  paddingVertical: 8,
                  borderRadius: 6,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: colors.neutral[800], fontWeight: 'bold', fontSize: 12 }}>
                  Download Resource ({res.download_count} dl)
                </Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* TAB 4: PROFILE */}
      {currentTab === 'profile' && (
        <ScrollView style={{ flex: 1, padding: 16 }}>
          <View
            style={{
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: colors.neutral[200],
              borderRadius: 14,
              padding: 18,
              alignItems: 'center',
              marginBottom: 16
            }}
          >
            <Image
              source={{ uri: currentUser.avatar_url }}
              style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 10 }}
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
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.primary[200]
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary[600], textTransform: 'uppercase' }}>
                {currentUser.role.replace('_', ' ')}
              </Text>
            </View>
          </View>

          {/* Device & Notification Token Info */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: colors.neutral[200],
              borderRadius: 14,
              padding: 16,
              marginBottom: 16
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[800], marginBottom: 6 }}>
              Push Notification Status
            </Text>
            <Text style={{ fontSize: 11, color: colors.success[700], marginBottom: 8 }}>
              ✓ {pushStatus}
            </Text>
            <TouchableOpacity
              onPress={() => Alert.alert('Push Notifications', 'Expo Push Notifications permissions are active on this device.')}
              style={{
                backgroundColor: colors.primary[50],
                paddingVertical: 8,
                borderRadius: 8,
                alignItems: 'center'
              }}
            >
              <Text style={{ color: colors.primary[600], fontWeight: 'bold', fontSize: 12 }}>
                Request / Test Notification
              </Text>
            </TouchableOpacity>
          </View>

          {/* My Registrations */}
          <View
            style={{
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: colors.neutral[200],
              borderRadius: 14,
              padding: 16
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.neutral[800], marginBottom: 8 }}>
              My Active Event RSVPs ({registeredEventIds.length})
            </Text>
            {registeredEventIds.map((id) => {
              const matched = events.find((e) => e.id === id);
              if (!matched) return null;
              return (
                <View key={id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.neutral[900] }}>{matched.title}</Text>
                  <Text style={{ fontSize: 10, color: colors.neutral[500] }}>{matched.location}</Text>
                </View>
              );
            })}
          </View>
          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* Floating Admin FAB (Visible to Admins & Super Admin) */}
      {isAdmin && (
        <TouchableOpacity
          onPress={() => setIsFabModalOpen(true)}
          style={{
            position: 'absolute',
            bottom: 74,
            right: 20,
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: colors.primary[500],
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 4
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 26, fontWeight: 'bold', lineHeight: 30 }}>+</Text>
        </TouchableOpacity>
      )}

      {/* Admin Quick Post Bottom Sheet Modal */}
      <Modal visible={isFabModalOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.neutral[900] }}>
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
                borderRadius: 8,
                padding: 10,
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
                borderRadius: 8,
                padding: 10,
                fontSize: 13,
                textAlignVertical: 'top',
                marginBottom: 14
              }}
            />

            <TouchableOpacity
              onPress={handleAdminPost}
              style={{
                backgroundColor: colors.primary[500],
                paddingVertical: 12,
                borderRadius: 8,
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

      {/* Bottom Tab Navigator */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: colors.neutral[200],
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center'
        }}
      >
        <TouchableOpacity onPress={() => setCurrentTab('home')} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 18 }}>🔔</Text>
          <Text style={{ fontSize: 10, fontWeight: currentTab === 'home' ? 'bold' : 'normal', color: currentTab === 'home' ? colors.primary[500] : colors.neutral[500] }}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setCurrentTab('events')} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 18 }}>📅</Text>
          <Text style={{ fontSize: 10, fontWeight: currentTab === 'events' ? 'bold' : 'normal', color: currentTab === 'events' ? colors.primary[500] : colors.neutral[500] }}>
            Events
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setCurrentTab('resources')} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 18 }}>📁</Text>
          <Text style={{ fontSize: 10, fontWeight: currentTab === 'resources' ? 'bold' : 'normal', color: currentTab === 'resources' ? colors.primary[500] : colors.neutral[500] }}>
            Resources
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setCurrentTab('profile')} style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 18 }}>👤</Text>
          <Text style={{ fontSize: 10, fontWeight: currentTab === 'profile' ? 'bold' : 'normal', color: currentTab === 'profile' ? colors.primary[500] : colors.neutral[500] }}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
