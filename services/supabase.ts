import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Supabase configuration
const supabaseUrl = 'https://xtntfkpwowsmzfgtjqxe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0bnRma3B3b3dzbXpmZ3RqcXhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzODM2MjYsImV4cCI6MjA2Mzk1OTYyNn0.SiTNU_aOs5dyLLig6sbgCNlo3pjWw1j3DBl5DjS6RVM';

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
  }
};

// Location service
export interface Location {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  image: string;
  description: string;
  interests: string[];
  isTourStop: boolean;
  order_index?: number;
  type?: string;
}

export const locationService = {
  async getLocations(schoolId: string): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('school_id', schoolId)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching locations:', error);
        return [];
      }
      
      // Transform database data to match our app's Location interface
      return data.map(item => ({
        id: item.id,
        name: item.name,
        coordinates: {
          latitude: item.latitude,
          longitude: item.longitude
        },
        image: item.image_url,
        description: item.description,
        interests: item.interests || [],
        isTourStop: item.is_tour_stop,
        order_index: item.order_index,
        type: item.type
      }));
    } catch (error) {
      console.error('Exception fetching locations:', error);
      return [];
    }
  },

  async getTourStops(schoolId: string): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('school_id', schoolId)
        .eq('is_tour_stop', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching tour stops:', error);
        return [];
      }

      // Transform database data to match our app's Location interface
      return data.map(item => ({
        id: item.id,
        name: item.name,
        coordinates: {
          latitude: item.latitude,
          longitude: item.longitude
        },
        image: item.image_url,
        description: item.description,
        interests: item.interests || [],
        isTourStop: item.is_tour_stop,
        order_index: item.order_index,
        type: item.type
      }));
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