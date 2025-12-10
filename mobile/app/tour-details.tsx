import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  FlatList
} from 'react-native';
import {
  tourAppointmentsService,
  tourGroupSelectionService,
  TourAppointment,
  userTypeService,
  UserType,
  authService,
  schoolService,
  School,
  locationService,
  Location,
  leadsService,
  TourParticipant
} from '@/services/supabase';
import { wsManager } from '@/services/ws';
import { appStateManager } from '@/services/appStateManager';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Image } from 'expo-image';

export default function TourDetailsScreen() {
  const router = useRouter();
  const [tour, setTour] = useState<TourAppointment | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userType, setUserType] = useState<UserType>(null);
  const [participants, setParticipants] = useState<TourParticipant[]>([]);
  const [joinedMemberIds, setJoinedMemberIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  // Function to fetch joined members
  const fetchJoinedMembers = async (tourId: string) => {
    try {
      const joinedIds = await leadsService.getJoinedMembers(tourId);
      setJoinedMemberIds(new Set(joinedIds));
    } catch (error) {
      console.error('Error fetching joined members:', error);
      setJoinedMemberIds(new Set());
    }
  };

  // Function to refresh participants and joined members
  const refreshParticipants = async () => {
    if (!tour?.id) return;
    
    try {
      setRefreshing(true);
      const [tourParticipants, joinedIds] = await Promise.all([
        leadsService.getTourParticipants(tour.id),
        leadsService.getJoinedMembers(tour.id)
      ]);
      setParticipants(tourParticipants);
      setJoinedMemberIds(new Set(joinedIds));
    } catch (error) {
      console.error('Error refreshing participants:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const type = await userTypeService.getUserType();
      setUserType(type);

      const tourId = await tourGroupSelectionService.getSelectedTourGroup();
      if (!tourId) {
        setError('No tour selected.');
        setLoading(false);
        return;
      }

      try {
        const tourDetails = await tourAppointmentsService.getTourAppointmentById(tourId);
        setTour(tourDetails);
        if (tourDetails) {
          const schoolDetails = await schoolService.getSchoolById(tourDetails.school_id);
          setSchool(schoolDetails);
          
          // Fetch tour participants (joined members will be fetched after session is created/joined)
          try {
            const tourParticipants = await leadsService.getTourParticipants(tourId);
            setParticipants(tourParticipants);
            setJoinedMemberIds(new Set());
          } catch (participantError) {
            console.error('Error fetching participants:', participantError);
            setParticipants([]);
            setJoinedMemberIds(new Set());
          }
        }
      } catch (err) {
        setError('Failed to load tour details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initialize();

    // Ensure WS connected and authenticate; then handle messages per server contract
    wsManager.connect();
    const onOpen = async () => {
      const u = await authService.getStoredUser();
      if (u?.id) {
        wsManager.authenticate(u.id);
      }
      // Create or attach to the live tour session on socket open
      const tId = await tourGroupSelectionService.getSelectedTourGroup();
      if (tId) {
        wsManager.send('create_session', {
          tourId: tId,
          initial_structure: {},
          ambassador_id: u?.id || null,
        });
        
        // Fetch joined members after a short delay to ensure session is created/ready
        // This handles the case where members joined before the ambassador loaded the screen
        setTimeout(async () => {
          const currentUserType = await userTypeService.getUserType();
          if (currentUserType === 'ambassador') {
            await fetchJoinedMembers(tId);
          }
        }, 500); // Small delay to ensure backend has processed the create_session
      }
    };
    wsManager.on('open', onOpen);
    
    // If websocket is already open, trigger onOpen immediately
    if (wsManager.getStatus() === 'open') {
      onOpen();
    }

    const onMessage = async (message: any) => {
      // Handle session creation/joining - fetch joined members after session is ready
      const currentUserType = await userTypeService.getUserType();
      
      if (currentUserType === 'ambassador' && message?.type === 'session_created') {
        const tId = await tourGroupSelectionService.getSelectedTourGroup();
        if (tId) {
          // Session created, now fetch joined members (including those who joined before)
          await fetchJoinedMembers(tId);
        }
      }
      if (currentUserType === 'ambassador-led' && message?.type === 'session_joined') {
        const tId = await tourGroupSelectionService.getSelectedTourGroup();
        if (tId) {
          // Session joined, fetch joined members (for ambassador view if they're viewing)
          await fetchJoinedMembers(tId);
        }
        console.log('Successfully joined session');
      }

      if (userType === 'ambassador' && message?.type === 'tour_started') {
        // Update app state with generated tour before navigating
        try {
          const schoolId = await schoolService.getSelectedSchool();
          if (schoolId && Array.isArray(message?.payload?.generated_tour_order)) {
            const allLocations = await locationService.getTourStops(schoolId);
            const ordered: Location[] = message.payload.generated_tour_order
              .map((id: string) => allLocations.find((loc: Location) => loc.id === id))
              .filter((loc: Location | undefined): loc is Location => Boolean(loc));
            // Update app state with the generated tour
            appStateManager.updateState({
              tourState: {
                stops: ordered,
                selectedInterests: [], // Will be set when user selects interests
                visitedLocations: [],
                currentStopIndex: 0,
                tourStarted: false,
                tourFinished: false,
                isEditingTour: false,
              },
            });
          }
        } catch (e) {
          console.error('Failed to persist generated tour:', e);
        }
        router.replace('/map');
      }
      if (userType === 'ambassador' && message?.type === 'member_joined' && message?.lead) {
        // Add new member to joined set and update participants list
        const newLead = message.lead;
        setJoinedMemberIds(prev => new Set([...prev, newLead.id]));
        
        // Check if this participant is already in the list
        setParticipants(prev => {
          const exists = prev.some(p => p.id === newLead.id);
          if (exists) {
            // Update existing participant
            return prev.map(p => p.id === newLead.id ? { ...p, ...newLead } : p);
          } else {
            // Add new participant
            return [...prev, { ...newLead, interests: [] } as TourParticipant];
          }
        });
      }
      if (userType === 'ambassador' && message?.type === 'member_left' && message?.leadId) {
        // Remove member from joined set
        setJoinedMemberIds(prev => {
          const updated = new Set(prev);
          updated.delete(message.leadId);
          return updated;
        });
      }
      if (userType === 'ambassador-led' && message?.type === 'tour_started') {
        // Navigate to map when tour actually starts
        router.replace('/map');
      }
    };
    wsManager.on('message', onMessage);

    // If member, send join_session once when screen loads
    (async () => {
      const tId = await tourGroupSelectionService.getSelectedTourGroup();
      if (userType === 'ambassador-led' && tId) {
        const leadId = await leadsService.getStoredLeadId();
        if (leadId) {
          // Wait for websocket to be open before sending
          if (wsManager.getStatus() === 'open') {
            wsManager.send('join_session', { tourId: tId, leadId });
          } else {
            // Wait for connection to open
            const onOpenForJoin = () => {
              wsManager.send('join_session', { tourId: tId, leadId });
              wsManager.off('open', onOpenForJoin);
            };
            wsManager.on('open', onOpenForJoin);
          }
        } else {
          console.error('No leadId found. Cannot join session.');
        }
      }
    })();

    return () => {
      wsManager.off('open', onOpen);
      wsManager.off('message', onMessage);
    }
  }, [userType]);

  const handleStartTour = async () => {
    if (!tour) return;
    const user = await authService.getStoredUser();
    if (!user) {
      Alert.alert("Error", "You must be logged in to start a tour.");
      return;
    }

    if (wsManager.getStatus() !== 'open') {
      // Try to connect; wsManager will queue the send
      wsManager.connect();
    }

    // Only start the tour; server generates structure and returns it in 'tour_started'
    wsManager.send('tour:start', { tourId: tour.id });
    // Navigate after 'tour_started' message
  };



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text>Loading tour details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text>{error}</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {tour && (
        <>
          <View style={styles.header}>
            {/* <Image source={{ uri: school?.logo_url }} style={styles.schoolLogo} /> */}
            <Text style={styles.title}>{tour.title || 'Tour Details'}</Text>
            {/* <Text style={styles.subtitle}>
              Led by {tour.profiles?.full_name || 'TBA'}
            </Text> */}
          </View>
          <View style={styles.memberHeader}>
            <Text style={styles.memberHeaderText}>
              Tour Members ({joinedMemberIds.size}/{tour?.max_participants || '∞'})
            </Text>

          </View>
          <View style={styles.content}>
            {userType === 'ambassador' ? (
              <>
                {/* Member List Section */}
                <View style={styles.memberListSection}>
                  
                  
                  {/* Capacity indicator */}
                  {tour?.max_participants && (
                    <View style={styles.capacityIndicator}>
                      <View style={styles.capacityBar}>
                        <View 
                          style={[
                            styles.capacityFill, 
                            { width: `${Math.min((joinedMemberIds.size / tour.max_participants) * 100, 100)}%` }
                          ]} 
                        />
                      </View>
                      <Text style={styles.capacityText}>
                        {tour.max_participants - joinedMemberIds.size} spots remaining
                      </Text>
                      <TouchableOpacity 
                        style={styles.refreshButton} 
                        onPress={refreshParticipants}
                        disabled={refreshing}
                      >
                        <IconSymbol 
                          name="arrow.clockwise" 
                          size={16} 
                          color={refreshing ? "#666" : "#fff"} 
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {participants.length > 0 ? (
                    <FlatList
                      data={participants}
                      keyExtractor={(item) => item.id || item.email}
                      renderItem={({ item }) => {
                        const isJoined = item.id && joinedMemberIds.has(item.id);
                        return (
                          <View style={styles.memberItem}>
                            <View style={styles.memberInfo}>
                              <Text style={styles.memberName}>{item.name}</Text>
                              <Text style={styles.memberEmail}>{item.email}</Text>
                              {item.interests && item.interests.length > 0 && (
                                <Text style={styles.memberInterests}>
                                  Interests: {item.interests.join(', ')}
                                </Text>
                              )}
                            </View>
                            {isJoined && (
                              <View style={styles.memberStatus}>
                                <IconSymbol name="checkmark.circle.fill" size={12} color="#fff" />
                                <Text style={styles.memberStatusText}>Joined</Text>
                              </View>
                            )}
                          </View>
                        );
                      }}
                      style={styles.memberList}
                      contentContainerStyle={styles.memberListContent}
                      refreshing={refreshing}
                      onRefresh={refreshParticipants}
                    />
                  ) : (
                    <View style={styles.noMembersContainer}>
                      <IconSymbol name="person.3.fill" size={32} color="#666" />
                      <Text style={styles.noMembersText}>No members have joined yet</Text>
                      <Text style={styles.noMembersSubtext}>Members will appear here once they join the tour</Text>
                    </View>
                  )}
                </View>
                
                <TouchableOpacity style={styles.button} onPress={handleStartTour}>
                  <Text style={styles.buttonText}>Start Tour</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.waitingContainer}>
                <ActivityIndicator size="large" />
                <Text style={styles.waitingText}>Waiting for the ambassador to start the tour...</Text>
              </View>
            )}
          </View>
        </>
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#282828',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  schoolLogo: {
    width: 250,
    height: 125,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 18,
    color: '#ccc',
  },
  content: {
    alignItems: 'center',
    width: '95%',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 15,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  waitingContainer: {
    alignItems: 'center',
  },
  waitingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#ccc',
  },
  memberListSection: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 15,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  memberHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  memberItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
    marginRight: 10,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 2,
  },
  memberInterests: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  memberStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberStatusText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  memberList: {
    maxHeight: 450, // Limit height so it doesn't take up too much space
  },
  memberListContent: {
    paddingBottom: 10,
  },
  noMembersContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  noMembersText: {
    fontSize: 16,
    color: '#ccc',
    fontStyle: 'italic',
  },
  noMembersSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: '#333',
    borderRadius: 6,
  },
  capacityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  capacityBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#555',
    borderRadius: 4,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  capacityText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 10,
    fontWeight: '600',
  },

});
