import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from './supa.js';
import 'react-native-url-polyfill/auto';

// Supabase configuration


// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth interfaces
export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    role?: string;
    user_type?: string;
    school_id?: string;
  };
}

export interface AuthResponse {
  user: AuthUser | null;
  error: string | null;
}

// Authentication service
export const authService = {
  // Sign in with email and password
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Sign in error:', error);
        return { user: null, error: error.message };
      }

      console.log('Sign in successful:', data.user?.email);
      return { user: data.user as AuthUser, error: null };
    } catch (error) {
      console.error('Exception during sign in:', error);
      return { user: null, error: 'An unexpected error occurred' };
    }
  },

  // Sign up with email, password, and metadata
  async signUp(email: string, password: string, name: string, userType: string, schoolId: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            user_type: userType,
            school_id: schoolId
          }
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        return { user: null, error: error.message };
      }

      console.log('Sign up successful:', data.user?.email);
      return { user: data.user as AuthUser, error: null };
    } catch (error) {
      console.error('Exception during sign up:', error);
      return { user: null, error: 'An unexpected error occurred' };
    }
  },

  // Sign out
  async signOut(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        return { error: error.message };
      }

      console.log('Sign out successful');
      return { error: null };
    } catch (error) {
      console.error('Exception during sign out:', error);
      return { error: 'An unexpected error occurred' };
    }
  },

  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        // Only log non-critical errors (session missing is normal)
        if (error.message !== 'Auth session missing!') {
          console.error('Get user error:', error);
        }
        return null;
      }

      return user as AuthUser;
    } catch (error) {
      // Only log unexpected errors
      if (error instanceof Error && error.message !== 'Auth session missing!') {
        console.error('Exception getting current user:', error);
      }
      return null;
    }
  },

  // Get current session
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        // Only log non-critical errors (session missing is normal)
        if (error.message !== 'Auth session missing!') {
          console.error('Get session error:', error);
        }
        return null;
      }

      return session;
    } catch (error) {
      // Only log unexpected errors
      if (error instanceof Error && error.message !== 'Auth session missing!') {
        console.error('Exception getting current session:', error);
      }
      return null;
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  // AsyncStorage-based authentication state management
  
  // Save user authentication data to AsyncStorage
  async saveAuthState(user: AuthUser): Promise<void> {
    try {
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      console.log('Auth state saved to AsyncStorage');
    } catch (error) {
      console.error('Error saving auth state:', error);
    }
  },

  // Get authenticated user from AsyncStorage
  async getStoredUser(): Promise<AuthUser | null> {
    try {
      const userData = await AsyncStorage.getItem(AUTH_USER_KEY);
      // console.log('userData', userData);
      if (userData) {
        return JSON.parse(userData) as AuthUser;
      }
      return null;
    } catch (error) {
      console.error('Error getting stored user:', error);
      return null;
    }
  },

  // Check if user is authenticated (from AsyncStorage)
  async isAuthenticated(): Promise<boolean> {
    try {
      const userData = await AsyncStorage.getItem(AUTH_USER_KEY);
      return userData !== null;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  },

  // Check if stored user is an ambassador
  async isStoredUserAmbassador(): Promise<boolean> {
    try {
      const user = await this.getStoredUser();
      return user?.user_metadata?.user_type === 'ambassador';
    } catch (error) {
      console.error('Error checking if user is ambassador:', error);
      return false;
    }
  },

  // Clear authentication state from AsyncStorage
  async clearAuthState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AUTH_USER_KEY);
      await AsyncStorage.removeItem(AUTH_SESSION_KEY);
      console.log('Auth state cleared from AsyncStorage');
    } catch (error) {
      console.error('Error clearing auth state:', error);
    }
  },

  // Enhanced sign in that saves to AsyncStorage
  async signInAndStore(email: string, password: string): Promise<AuthResponse> {
    const response = await this.signIn(email, password);
    
    if (response.user && !response.error) {
      await this.saveAuthState(response.user);
    }
    
    return response;
  },

  // Enhanced sign out that clears AsyncStorage
  async signOutAndClear(): Promise<{ error: string | null }> {
    await this.clearAuthState();
    return await this.signOut();
  }
};

// Storage keys
const SELECTED_SCHOOL_KEY = 'SELECTED_SCHOOL_ID';
const AUTH_USER_KEY = 'AUTHENTICATED_USER';
const AUTH_SESSION_KEY = 'AUTH_SESSION_DATA';
const LEAD_ID_KEY = 'LEAD_ID';

// Region interface for map coordinates
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

// School interface
export interface School {
  id: string;
  name: string;
  city: string;
  state: string;
  primary_color?: string;
  coordinates?: Region;
  logo_url?: string;
}

// School service
export const schoolService = {
  async getSchools(): Promise<School[]> {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*');

      if (error) {
        console.error('Error fetching schools:', error);
        return [];
      }

      // console.log('schools data:', data);
      return data;
    } catch (error) {
      console.error('Exception fetching schools:', error);
      return [];
    }
  },

  async getSchoolById(schoolId: string): Promise<School | null> {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single();

      if (error) {
        console.error('Error fetching school by ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception fetching school by ID:', error);
      return null;
    }
  },

  async getSelectedSchool(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(SELECTED_SCHOOL_KEY);
    } catch (error) {
      console.error('Error getting selected school:', error);
      return null;
    }
  },

  async setSelectedSchool(schoolId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(SELECTED_SCHOOL_KEY, schoolId);
    } catch (error) {
      console.error('Error setting selected school:', error);
    }
  },

  async clearSelectedSchool(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SELECTED_SCHOOL_KEY);
    } catch (error) {
      console.error('Error clearing selected school:', error);
    }
  },

  
  async getClosestSchools(latitude: number, longitude: number): Promise<School[]> {
    const { data, error } = await supabase
      .rpc('schools_ordered_by_distance', {
        user_lat: latitude,
        user_lon: longitude
    });

    if (error) {
      console.error('Error fetching closest schools:', error);
      return [];
    }

    return data;
  }
};

// Location media interface
export interface LocationMedia {
  id: string;
  location_id: string;
  stored_in_supabase: boolean;
  media_type: string;
  url: string;
  created_at: string;
}

// Location service
export interface Location {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  image: string; // Primary image URL for backward compatibility
  media?: LocationMedia[]; // Array of all media items
  description: string;
  interests: string[];
  careers?: string[];
  talking_points?: string[];
  features?: string[];
  isTourStop: boolean;
  order_index?: number;
  type?: string;
}

export const locationService = {
  // Helper function to get primary image from media array
  getPrimaryImage(media: LocationMedia[]): string {
    if (!media || media.length === 0) return '';
    
    // Find the primary image type media item
    const primaryImage = media.find(item => item.media_type === 'primaryImage');
    return primaryImage ? primaryImage.url : '';
  },

  async getLocations(schoolId: string): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select(`
          *,
          location_media (
            id,
            location_id,
            stored_in_supabase,
            media_type,
            url,
            created_at
          )
        `)
        .eq('school_id', schoolId)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching locations:', error);
        return [];
      }
      
      // Transform database data to match our app's Location interface
      return data.map(item => {
        const media: LocationMedia[] = item.location_media || [];
        return {
          id: item.id,
          name: item.name,
          coordinates: {
            latitude: item.latitude,
            longitude: item.longitude
          },
          image: this.getPrimaryImage(media), // Get primary image from media
          media: media,
          description: item.description,
          interests: item.interests || [],
          careers: item.careers || [],
          talking_points: item.talking_points || [],
          features: item.features || [],
          isTourStop: item.default_stop,
          order_index: item.order_index,
          type: item.type
        };
      });
    } catch (error) {
      console.error('Exception fetching locations:', error);
      return [];
    }
  },

  async getTourStops(schoolId: string): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select(`
          *,
          location_media (
            id,
            location_id,
            stored_in_supabase,
            media_type,
            url,
            created_at
          )
        `)
        .eq('school_id', schoolId)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching tour stops:', error);
        return [];
      }

      // Transform database data to match our app's Location interface
      return data.map(item => {
        const media: LocationMedia[] = item.location_media || [];
        return {
          id: item.id,
          name: item.name,
          coordinates: {
            latitude: item.latitude,
            longitude: item.longitude
          },
          image: this.getPrimaryImage(media), // Get primary image from media
          media: media,
          description: item.description,
          interests: item.interests || [],
          careers: item.careers || [],
          talking_points: item.talking_points || [],
          features: item.features || [],
          isTourStop: item.default_stop,
          order_index: item.order_index,
          type: item.type
        };
      });
    } catch (error) {
      console.error('Exception fetching tour stops:', error);
      return [];
    }
  },

  getMarkerColor(type: string | undefined): string {
    switch (type) {
      case 'building':
        return 'tomato';
      case 'landmark':
        return 'orange';
      case 'housing':
        return 'yellow';
      case 'dining':
        return 'gold';
      case 'athletics':
        return 'wheat';
      case 'academics':
        return 'tan';
      case 'administration':
        return 'linen';
      case 'outdoor_space':
        return 'green';
      case 'historical':
        return 'aqua';
      case 'service':
        return 'violet';
      default:
        return 'black';
    }
  }
};

// building
// landmark
// housing
// dining
// athletics
// academics
// administration
// outdoor_space
// historical
// service

// Lead interface
export interface Lead {
  id?: string;
  created_at?: string;
  school_id: string;
  name: string;
  identity: string;
  address: string;
  email: string;
  date_of_birth?: string | null;
  gender?: string | null;
  grad_year?: number | null;
  tour_type?: string | null;
  tour_appointment_id?: string | null;
}

// Tour participant interface (extended from Lead)
export interface TourParticipant extends Lead {
  interests?: string[];
}

// Leads service
export const leadsService = {
  async createLead(lead: Omit<Lead, 'id' | 'created_at'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert([{
          school_id: lead.school_id,
          name: lead.name,
          identity: lead.identity,
          address: lead.address,
          email: lead.email,
          date_of_birth: lead.date_of_birth,
          gender: lead.gender,
          grad_year: lead.grad_year,
          tour_type: lead.tour_type,
          tour_appointment_id: lead.tour_appointment_id,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error('Error creating lead:', error);
        return { success: false, error: error.message };
      }

      const inserted = Array.isArray(data) && data.length > 0 ? data[0] : null;
      console.log('Lead created successfully:', inserted);
      return { success: true, id: inserted?.id };
    } catch (error) {
      console.error('Exception creating lead:', error);
      return { success: false, error: 'Failed to save lead information' };
    }
  },
  async saveLeadId(leadId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LEAD_ID_KEY, leadId);
    } catch (e) {
      console.error('Error saving lead id:', e);
    }
  },
  async getStoredLeadId(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(LEAD_ID_KEY);
    } catch (e) {
      console.error('Error reading lead id:', e);
      return null;
    }
  },
  async clearStoredLeadId(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LEAD_ID_KEY);
    } catch (e) {
      console.error('Error clearing lead id:', e);
    }
  },

  /**
   * Get participants (leads) for a specific tour appointment
   * @param tourAppointmentId - The tour appointment ID
   * @returns Promise<TourParticipant[]>
   */
  async getTourParticipants(tourAppointmentId: string): Promise<TourParticipant[]> {
    try {
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('tour_appointment_id', tourAppointmentId)
        .order('created_at', { ascending: true });

      if (leadsError) {
        console.error('Error fetching tour participants:', leadsError);
        throw leadsError;
      }

      // Fetch interests for each participant from analytics events
      const participantsWithInterests = await Promise.all(
        (leads || []).map(async (lead) => {
          const interests = await this.getParticipantInterests(lead.id as string, tourAppointmentId);
          return {
            ...lead,
            interests
          } as TourParticipant;
        })
      );

      return participantsWithInterests;
    } catch (error) {
      console.error('Error fetching tour participants:', error);
      throw error;
    }
  },

  /**
   * Get interests selected by a participant (from analytics events)
   * @param participantEmail - The participant's email
   * @param tourAppointmentId - The tour appointment ID
   * @returns Promise<string[]>
   */
  async getParticipantInterests(leadId: string, tourAppointmentId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('metadata')
        .eq('event_type', 'interests-chosen')
        .eq('lead_id', leadId)
        .eq('tour_appointment_id', tourAppointmentId)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching participant interests:', error);
        return [];
      }

      if (data && data.length > 0 && data[0].metadata?.selected_interests) {
        return data[0].metadata.selected_interests;
      }

      return [];
    } catch (error) {
      console.error('Exception fetching participant interests:', error);
      return [];
    }
  },

  /**
   * Verify confirmation code for a tour appointment
   * @param confirmationCode - The 6-character confirmation code
   * @param tourAppointmentId - The tour appointment ID
   * @returns Promise<{ success: boolean; lead?: Lead; error?: string }>
   */
  async verifyConfirmationCode(confirmationCode: string, tourAppointmentId: string): Promise<{ success: boolean; lead?: Lead; error?: string }> {
    try {
      console.log('confirmationCode', confirmationCode);
      console.log('tourAppointmentId', tourAppointmentId);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('appointment_confirmation', confirmationCode)
        .eq('tour_appointment_id', tourAppointmentId)
        .single();

      if (error) {
        console.log('error', error);
        if (error.code === 'PGRST116') {
          // No rows returned
          return { success: false, error: 'Invalid confirmation code' };
        }
        console.error('Error verifying confirmation code:', error);
        return { success: false, error: 'Failed to verify confirmation code' };
      }

      console.log('data', data);

      if (data) {
        return { success: true, lead: data };
      }

      return { success: false, error: 'Invalid confirmation code' };
    } catch (error) {
      console.error('Exception verifying confirmation code:', error);
      return { success: false, error: 'Failed to verify confirmation code' };
    }
  }
};

// Analytics interface
export interface AnalyticsEvent {
  event_type: string;
  session_id: string;
  school_id: string;
  location_id?: string;
  metadata?: Record<string, any>;
  tour_appointment_id?: string;
}

// Analytics service
export const analyticsService = {
  // Generate a daily session ID
  async getSessionId(): Promise<string> {
    const SESSION_KEY = 'DAILY_SESSION_ID';
    const SESSION_DATE_KEY = 'SESSION_DATE';
    
    try {
      const storedSessionId = await AsyncStorage.getItem(SESSION_KEY);
      const storedDate = await AsyncStorage.getItem(SESSION_DATE_KEY);
      const currentDate = new Date().toDateString();
      
      // If we have a session ID and it's from today, use it
      if (storedSessionId && storedDate === currentDate) {
        return storedSessionId;
      }
      
      // Generate a new session ID for today
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(SESSION_KEY, newSessionId);
      await AsyncStorage.setItem(SESSION_DATE_KEY, currentDate);
      
      return newSessionId;
    } catch (error) {
      console.error('Error managing session ID:', error);
      // Fallback to timestamp-based session ID
      return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  },

  // Calculate distance between two coordinates in miles
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  },

  // Convert degrees to radians
  toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  },

  // Check if user is within geofence radius (0.025 miles) of a location
  isWithinGeofence(userLat: number, userLon: number, locationLat: number, locationLon: number): boolean {
    const GEOFENCE_RADIUS_MILES = 0.025;
    const distance = this.calculateDistance(userLat, userLon, locationLat, locationLon);
    return distance <= GEOFENCE_RADIUS_MILES;
  },

  // Export an analytics event
  async exportEvent(event: AnalyticsEvent & { lead_id?: string | null }): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .insert([{
          event_type: event.event_type,
          session_id: event.session_id,
          school_id: event.school_id,
          location_id: event.location_id || null,
          metadata: event.metadata || null,
          tour_appointment_id: event.tour_appointment_id || null,
          lead_id: event.lead_id || null,
          timestamp: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error exporting analytics event:', error);
        return false;
      }

      console.log('Analytics event exported successfully:', event.event_type);
      return true;
    } catch (error) {
      console.error('Exception exporting analytics event:', error);
      return false;
    }
  },

  // Export interests-chosen event
  async exportInterestsChosen(schoolId: string, selectedInterests: string[], tourAppointmentId: string | null = null, leadId: string | null = null): Promise<{success: boolean, error?: string}> {
    try {
      const sessionId = await this.getSessionId();
      
      const event: AnalyticsEvent = {
        event_type: 'interests-chosen',
        session_id: sessionId,
        school_id: schoolId,
        tour_appointment_id: tourAppointmentId || undefined,
        metadata: {
          selected_interests: selectedInterests,
          interest_count: selectedInterests.length,
          source: 'mobile'
        }
      };

      const success = await this.exportEvent({ ...event, lead_id: leadId || null });
      
      if (success) {
        console.log('Interest selection analytics exported:', {
          interests: selectedInterests,
          tourAppointmentId,
          schoolId
        });
        return { success: true };
      } else {
        return { success: false, error: 'Failed to export analytics event' };
      }
    } catch (error) {
      console.error('Error exporting interests-chosen event:', error);
      return { success: false, error: 'Failed to export interest selection analytics' };
    }
  },

  // Export tour-start event
  async exportTourStart(schoolId: string, firstLocationId: string, firstLocationName: string): Promise<boolean> {
    try {
      const sessionId = await this.getSessionId();
      
      const event: AnalyticsEvent = {
        event_type: 'tour-start',
        session_id: sessionId,
        school_id: schoolId,
        location_id: firstLocationId,
        metadata: {
          first_location_name: firstLocationName,
          started_at: new Date().toISOString()
        }
      };

      return await this.exportEvent(event);
    } catch (error) {
      console.error('Error exporting tour-start event:', error);
      return false;
    }
  },

  // Export tour-finish event
  async exportTourFinish(schoolId: string, totalStops: number, completedStops: string[]): Promise<boolean> {
    try {
      const sessionId = await this.getSessionId();
      
      const event: AnalyticsEvent = {
        event_type: 'tour-finish',
        session_id: sessionId,
        school_id: schoolId,
        metadata: {
          total_stops: totalStops,
          completed_stops: completedStops,
          completed_count: completedStops.length,
          finished_at: new Date().toISOString()
        }
      };

      return await this.exportEvent(event);
    } catch (error) {
      console.error('Error exporting tour-finish event:', error);
      return false;
    }
  },

  // Export location duration event (when user leaves a location)
  async exportLocationDuration(schoolId: string, locationId: string, locationName: string, durationSeconds: number): Promise<boolean> {
    try {
      const sessionId = await this.getSessionId();
      
      // Convert duration to minutes for better readability
      const durationMinutes = Math.round(durationSeconds / 60 * 100) / 100; // Round to 2 decimal places
      
      const event: AnalyticsEvent = {
        event_type: 'location-duration',
        session_id: sessionId,
        school_id: schoolId,
        location_id: locationId,
        metadata: {
          location_name: locationName,
          duration: durationSeconds, // Duration in seconds as requested
          duration_minutes: durationMinutes, // Also include minutes for convenience
          left_at: new Date().toISOString()
        }
      };

      return await this.exportEvent(event);
    } catch (error) {
      console.error('Error exporting location-duration event:', error);
      return false;
    }
  }
};

// User type definitions
export type UserType = 'self-guided' | 'ambassador-led' | 'ambassador' | null;

// Storage key for tour type
const TOUR_TYPE_STORAGE_KEY = 'selectedTourType';

// User type service
export const userTypeService = {
  // Get the current user type from storage
  async getUserType(): Promise<UserType> {
    try {
      const storedType = await AsyncStorage.getItem(TOUR_TYPE_STORAGE_KEY);
      return storedType as UserType;
    } catch (error) {
      console.error('Error getting user type:', error);
      return null;
    }
  },

  // Set the user type in storage
  async setUserType(userType: UserType): Promise<void> {
    try {
      if (userType) {
        await AsyncStorage.setItem(TOUR_TYPE_STORAGE_KEY, userType);
      } else {
        await AsyncStorage.removeItem(TOUR_TYPE_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error setting user type:', error);
    }
  },

  // Check if current user is an ambassador
  async isAmbassador(): Promise<boolean> {
    const userType = await this.getUserType();
    return userType === 'ambassador';
  },

  // Clear the stored user type
  async clearUserType(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOUR_TYPE_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing user type:', error);
    }
  }
};

// Tour Appointment interface
export interface TourAppointment {
  id: string;
  school_id: string;
  ambassador_id: string;
  title?: string;
  description?: string;
  scheduled_date: string;
  status: string;
  max_participants: number;
  participants_signed_up: number;
  qr_code_token?: string;
  created_at?: string;
  updated_at?: string;
  profiles?: {
    full_name: string;
  };
  schools?: {
    name: string;
    city: string;
    state: string;
  };
}

// Tour appointments service
export const tourAppointmentsService = {
  /**
   * Get tours assigned to a specific ambassador (current day or future)
   * @param ambassadorId - The ambassador's user ID
   * @returns Promise<TourAppointment[]>
   */
  async getAmbassadorTours(ambassadorId: string): Promise<TourAppointment[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      const todayISO = today.toISOString();
      
      const { data, error } = await supabase
        .from('tour_appointments')
        .select(`
          *,
          profiles (
            full_name
          ),
          schools (
            name,
            city,
            state
          )
        `)
        .eq('ambassador_id', ambassadorId)
        .in('status', ['scheduled', 'active'])
        .gte('scheduled_date', todayISO)
        .order('scheduled_date', { ascending: true });

      if (error) {
        console.error('Error fetching ambassador tours:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching ambassador tours:', error);
      throw error;
    }
  },

  /**
   * Get available tour appointments for a specific school
   * @param schoolId - The school ID to filter by
   * @returns Promise<TourAppointment[]>
   */
  async getAvailableTourGroups(schoolId: string): Promise<TourAppointment[]> {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('tour_appointments')
        .select(`
          *,
          profiles (
            full_name
          )
        `)
        .eq('school_id', schoolId)
        .eq('status', 'scheduled')
        .gte('scheduled_date', now)
        .order('scheduled_date', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching available tour groups:', error);
      throw error;
    }
  },

  /**
   * Get tour appointment details by ID
   * @param appointmentId - The appointment ID
   * @returns Promise<TourAppointment | null>
   */
  async getTourAppointmentById(appointmentId: string): Promise<TourAppointment | null> {
    try {
      const { data, error } = await supabase
        .from('tour_appointments')
        .select(`
          *,
          profiles (
            full_name
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching tour appointment by ID:', error);
      throw error;
    }
  },

  /**
   * Check if tour appointment has available spots
   * @param appointment - The tour appointment object
   * @returns boolean
   */
  hasAvailableSpots(appointment: TourAppointment): boolean {
    return appointment.participants_signed_up < appointment.max_participants;
  },

  /**
   * Format tour date and time for display
   * @param scheduledDate - ISO date string
   * @returns Formatted date and time object
   */
  formatTourDateTime(scheduledDate: string) {
    const date = new Date(scheduledDate);
    
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
      shortDate: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    };
  },

  /**
   * Join a tour group (for now, just return success - could track participants later)
   * @param appointmentId - The appointment ID to join
   * @param userInfo - User information
   * @returns Promise with success status
   */
  async joinTourGroup(appointmentId: string, userInfo: any): Promise<{success: boolean, error?: string, message?: string}> {
    try {
      // For now, we'll just return success
      // In the future, this could:
      // 1. Add the user to a tour_participants table
      // 2. Check if tour is full
      // 3. Send confirmation emails
      // 4. Generate QR codes for check-in
      
      return {
        success: true,
        message: 'Successfully joined tour group!'
      };
    } catch (error) {
      console.error('Error joining tour group:', error);
      return {
        success: false,
        error: 'Failed to join tour group. Please try again.'
      };
    }
  }
};

// Storage key for selected tour group
const SELECTED_TOUR_GROUP_KEY = 'selectedTourGroup';

// Tour group selection service
export const tourGroupSelectionService = {
  async getSelectedTourGroup(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(SELECTED_TOUR_GROUP_KEY);
    } catch (error) {
      console.error('Error getting selected tour group:', error);
      return null;
    }
  },

  async setSelectedTourGroup(appointmentId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(SELECTED_TOUR_GROUP_KEY, appointmentId);
    } catch (error) {
      console.error('Error setting selected tour group:', error);
    }
  },

  async clearSelectedTourGroup(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SELECTED_TOUR_GROUP_KEY);
    } catch (error) {
      console.error('Error clearing selected tour group:', error);
    }
  }
};

