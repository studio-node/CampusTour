// import { SupabaseClient } from "@supabase/supabase-js";

// export interface Region {
//     latitude: number;
//     longitude: number;
//     latitudeDelta: number;
//     longitudeDelta: number;
// }
// export interface School {
//     id: string;
//     name: string;
//     city: string;
//     state: string;
//     primary_color?: string;
//     coordinates?: Region;
//     logo_url?: string;
// }
// export interface Location {
//     id: string;
//     name: string;
//     coordinates: {
//       latitude: number;
//       longitude: number;
//     };
//     image: string;
//     description: string;
//     interests: string[];
//     isTourStop: boolean;
//     order_index?: number;
//     type?: string;
// }

export async function getLocations(schoolId, supabase) {
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
}
