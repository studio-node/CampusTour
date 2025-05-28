import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Supabase configuration
const supabaseUrl = 'https://xtntfkpwowsmzfgtjqxe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0bnRma3B3b3dzbXpmZ3RqcXhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzODM2MjYsImV4cCI6MjA2Mzk1OTYyNn0.SiTNU_aOs5dyLLig6sbgCNlo3pjWw1j3DBl5DjS6RVM';

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Current selected school ID - hardcoded for now 
export const CURRENT_SCHOOL_ID = 'e5a9dfd2-0c88-419e-b891-0a62283b8abd';

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
}

export const locationService = {
  async getLocations(): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('school_id', CURRENT_SCHOOL_ID)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching locations:', error);
        return [];
      }
      // console.log('IN GETLOCATIONS data:', data);
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
        order_index: item.order_index
      }));
    } catch (error) {
      console.error('Exception fetching locations:', error);
      return [];
    }
  },

  async getTourStops(): Promise<Location[]> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('school_id', CURRENT_SCHOOL_ID)
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
        order_index: item.order_index
      }));
    } catch (error) {
      console.error('Exception fetching tour stops:', error);
      return [];
    }
  }
}; 