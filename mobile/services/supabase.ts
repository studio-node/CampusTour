import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from './supa.js';
import 'react-native-url-polyfill/auto';

// Supabase configuration


// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage keys
const SELECTED_SCHOOL_KEY = 'SELECTED_SCHOOL_ID';

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
}

// Leads service
export const leadsService = {
  async createLead(lead: Omit<Lead, 'id' | 'created_at'>): Promise<{ success: boolean; error?: string }> {
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
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error('Error creating lead:', error);
        return { success: false, error: error.message };
      }

      console.log('Lead created successfully:', data);
      return { success: true };
    } catch (error) {
      console.error('Exception creating lead:', error);
      return { success: false, error: 'Failed to save lead information' };
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
  async exportEvent(event: AnalyticsEvent): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .insert([{
          event_type: event.event_type,
          session_id: event.session_id,
          school_id: event.school_id,
          location_id: event.location_id || null,
          metadata: event.metadata || null,
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
  async exportInterestsChosen(schoolId: string, selectedInterests: string[]): Promise<boolean> {
    try {
      const sessionId = await this.getSessionId();
      
      const event: AnalyticsEvent = {
        event_type: 'interests-chosen',
        session_id: sessionId,
        school_id: schoolId,
        metadata: {
          selected_interests: selectedInterests,
          interest_count: selectedInterests.length
        }
      };

      return await this.exportEvent(event);
    } catch (error) {
      console.error('Error exporting interests-chosen event:', error);
      return false;
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