import { supabase } from '../supabase.js';

// Analytics service for webapp
export const analyticsService = {
  // Generate a session ID for the current browser session
  getSessionId() {
    const SESSION_KEY = 'CAMPUS_TOUR_SESSION_ID';
    
    try {
      // Check if we already have a session ID in sessionStorage
      let sessionId = sessionStorage.getItem(SESSION_KEY);
      
      if (!sessionId) {
        // Generate a new session ID for this browser session
        sessionId = `web_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem(SESSION_KEY, sessionId);
      }
      
      return sessionId;
    } catch (error) {
      console.error('Error managing session ID:', error);
      // Fallback to timestamp-based session ID
      return `web_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  },

  // Export an analytics event to the database
  async exportEvent(eventData) {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .insert([{
          event_type: eventData.event_type,
          session_id: eventData.session_id,
          school_id: eventData.school_id,
          location_id: eventData.location_id || null,
          metadata: eventData.metadata || null,
          tour_appointment_id: eventData.tour_appointment_id || null,
          timestamp: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error exporting analytics event:', error);
        return { success: false, error: error.message };
      }

      console.log('Analytics event exported successfully:', eventData.event_type);
      return { success: true, data };
    } catch (error) {
      console.error('Exception exporting analytics event:', error);
      return { success: false, error: 'Failed to export analytics event' };
    }
  },

  // Export interests-chosen event
  async exportInterestsChosen(schoolId, selectedInterests, tourAppointmentId = null) {
    try {
      const sessionId = this.getSessionId();
      
      const eventData = {
        event_type: 'interests-chosen',
        session_id: sessionId,
        school_id: schoolId,
        tour_appointment_id: tourAppointmentId,
        metadata: {
          selected_interests: selectedInterests,
          interest_count: selectedInterests.length,
          source: 'webapp'
        }
      };

      const result = await this.exportEvent(eventData);
      
      if (result.success) {
        console.log('Interest selection analytics exported:', {
          interests: selectedInterests,
          tourAppointmentId,
          schoolId
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error exporting interests-chosen event:', error);
      return { success: false, error: 'Failed to export interest selection analytics' };
    }
  }
};

/**
 * Query interests popularity data
 * Gets analytics-events where event_type = 'interests-chosen' 
 * and aggregates counts per metadata.interest
 */
export async function getInterestsPopularity() {
  try {
    // Query all interests-chosen events
    const { data, error } = await supabase
      .from('analytics_events')
      .select('metadata')
      .eq('event_type', 'interests-chosen')

    if (error) {
      throw error
    }

    // Aggregate interests from metadata
    const interestCounts = {}
    
    data.forEach(event => {
      if (event.metadata && event.metadata.selected_interests && Array.isArray(event.metadata.selected_interests)) {
        // Each event can have multiple selected interests, count each one
        event.metadata.selected_interests.forEach(interest => {
          if (interest && typeof interest === 'string') {
            interestCounts[interest] = (interestCounts[interest] || 0) + 1
          }
        })
      }
    })

    // Convert to arrays for chart consumption
    const sortedInterests = Object.entries(interestCounts)
      .sort(([,a], [,b]) => b - a) // Sort by count descending
      .slice(0, 10) // Take top 10

    console.log('Interests aggregation:', interestCounts) // Debug: show all counts
    console.log('Sorted interests:', sortedInterests) // Debug: show sorted pairs
    
    const labels = sortedInterests.map(([interest]) => interest)
    const chartData = sortedInterests.map(([, count]) => count)
    
    console.log('Final interests labels:', labels) // Debug: final labels array
    console.log('Final interests data:', chartData) // Debug: final data array
    console.log('Labels/data alignment check:', labels.map((label, i) => `${label}: ${chartData[i]}`)) // Debug: alignment

    return {
      labels,
      data: chartData,
      total: data.length
    }

  } catch (error) {
    console.error('Error fetching interests popularity:', error)
    throw error
  }
}

/**
 * Query locations popularity data
 * Gets analytics-events where event_type = 'location-duration'
 * Groups by location_id and calculates average metadata.duration
 */
export async function getLocationsPopularity() {
  try {
    // Query analytics-events where event_type = 'location-duration'
    const { data, error } = await supabase
      .from('analytics_events')
      .select(`
        location_id,
        metadata,
        locations (
          name
        )
      `)
      .eq('event_type', 'location-duration')
      .not('location_id', 'is', null)

    if (error) {
      throw error
    }

    console.log('Raw location-duration events:', data.slice(0, 3)) // Debug: show sample data

    // Group by location_id and aggregate durations
    const locationData = {}
    
    data.forEach(event => {
      if (event.location_id && event.metadata) {
        const locationId = event.location_id
        const locationName = event.locations?.name || `Location ${locationId}`
        
        // Get duration from metadata (prefer duration_minutes, fallback to duration in seconds)
        let duration = null
        if (event.metadata.duration_minutes) {
          duration = parseFloat(event.metadata.duration_minutes)
        } else if (event.metadata.duration) {
          // Convert seconds to minutes
          duration = parseFloat(event.metadata.duration) / 60
        }

        if (duration && duration > 0) {
          if (!locationData[locationId]) {
            locationData[locationId] = {
              name: locationName,
              durations: [],
              visitCount: 0
            }
          }
          locationData[locationId].durations.push(duration)
          locationData[locationId].visitCount++
        }
      }
    })

    console.log('Processed location data:', Object.keys(locationData).length, 'locations') // Debug

    // Calculate average duration per location and sort by average visit time
    const sortedLocations = Object.entries(locationData)
      .map(([locationId, location]) => ({
        id: locationId,
        name: location.name,
        avgDuration: location.durations.reduce((a, b) => a + b, 0) / location.durations.length,
        totalVisits: location.visitCount,
        durations: location.durations
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration) // Sort by highest average duration
      .slice(0, 8) // Top 8 locations

    console.log('Top locations by avg duration:', sortedLocations.map(l => `${l.name}: ${l.avgDuration.toFixed(1)}min`)) // Debug

    return {
      labels: sortedLocations.map(loc => loc.name),
      data: sortedLocations.map(loc => Math.round(loc.avgDuration * 10) / 10), // Round to 1 decimal place
      total: data.length,
      details: sortedLocations // Include detailed data for debugging
    }

  } catch (error) {
    console.error('Error fetching locations popularity:', error)
    throw error
  }
}

/**
 * Query tour completion data
 * Gets counts of tour-start vs tour-finish events
 */
export async function getTourCompletion() {
  try {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('event_type')
      .in('event_type', ['tour-start', 'tour-finish'])

    if (error) {
      throw error
    }

    const counts = {
      'tour-start': 0,
      'tour-finish': 0
    }

    data.forEach(event => {
      counts[event.event_type]++
    })

    const completed = counts['tour-finish']
    const abandoned = counts['tour-start'] - counts['tour-finish']

    return {
      labels: ['Completed', 'Abandoned'],
      data: [completed, Math.max(0, abandoned)], // Ensure no negative values
      total: counts['tour-start']
    }

  } catch (error) {
    console.error('Error fetching tour completion:', error)
    throw error
  }
}

/**
 * Query tour start times and bucket into time ranges
 */
export async function getPopularTimes() {
  try {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('timestamp')
      .eq('event_type', 'tour-start')

    if (error) {
      throw error
    }

    // Time buckets (2-hour ranges)
    const timeBuckets = {
      '8-10 AM': 0,
      '10 AM-12 PM': 0,
      '12-2 PM': 0,
      '2-4 PM': 0,
      '4-6 PM': 0,
      '6-8 PM': 0
    }

    data.forEach(event => {
      const date = new Date(event.timestamp)
      const hour = date.getHours()

      if (hour >= 8 && hour < 10) timeBuckets['8-10 AM']++
      else if (hour >= 10 && hour < 12) timeBuckets['10 AM-12 PM']++
      else if (hour >= 12 && hour < 14) timeBuckets['12-2 PM']++
      else if (hour >= 14 && hour < 16) timeBuckets['2-4 PM']++
      else if (hour >= 16 && hour < 18) timeBuckets['4-6 PM']++
      else if (hour >= 18 && hour < 20) timeBuckets['6-8 PM']++
    })

    return {
      labels: Object.keys(timeBuckets),
      data: Object.values(timeBuckets),
      total: data.length
    }

  } catch (error) {
    console.error('Error fetching popular times:', error)
    throw error
  }
}

/**
 * Query schools being visited
 */
export async function getSchoolsVisited() {
  try {
    // First, let's get all tour-start events with school_id and see what we have
    const { data, error } = await supabase
      .from('analytics_events')
      .select(`
        school_id,
        schools (
          name
        )
      `)
      .eq('event_type', 'tour-start')
      .not('school_id', 'is', null)

    if (error) {
      throw error
    }

    console.log('Raw schools data (all):', data.length, 'records') // Debug: total count
    console.log('Sample raw schools data:', data.slice(0, 10)) // Debug: show more sample data

    // Let's also see which school_ids don't have matching schools
    const withoutSchoolName = data.filter(event => !event.schools || !event.schools.name)
    const withSchoolName = data.filter(event => event.schools && event.schools.name)
    
    console.log('Events without school name:', withoutSchoolName.length, withoutSchoolName.slice(0, 3))
    console.log('Events with school name:', withSchoolName.length, withSchoolName.slice(0, 3))

    // Count tours per school
    const schoolCounts = {}
    
    data.forEach(event => {
      if (event.school_id) {
        // Use school name if available, otherwise fallback to school_id
        const schoolName = event.schools?.name || `School ${event.school_id}`
        schoolCounts[schoolName] = (schoolCounts[schoolName] || 0) + 1
      }
    })

    console.log('School counts:', schoolCounts) // Debug: show aggregated counts

    // Sort and format
    const sortedSchools = Object.entries(schoolCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)

    console.log('Top schools:', sortedSchools.map(([school, count]) => `${school}: ${count} tours`)) // Debug

    return {
      labels: sortedSchools.map(([school]) => school),
      data: sortedSchools.map(([, count]) => count),
      total: data.length
    }

  } catch (error) {
    console.error('Error fetching schools visited:', error)
    throw error
  }
}

/**
 * Calculate average tour length by pairing tour-start and tour-finish events
 */
export async function getAverageTourLength() {
  try {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('session_id, event_type, timestamp')
      .in('event_type', ['tour-start', 'tour-finish'])
      .order('timestamp', { ascending: true })

    if (error) {
      throw error
    }

    // Group by session_id
    const sessions = {}
    data.forEach(event => {
      if (!sessions[event.session_id]) {
        sessions[event.session_id] = {}
      }
      sessions[event.session_id][event.event_type] = new Date(event.timestamp)
    })

    // Calculate durations for completed tours
    const durations = []
    Object.values(sessions).forEach(session => {
      if (session['tour-start'] && session['tour-finish']) {
        const duration = (session['tour-finish'] - session['tour-start']) / (1000 * 60) // minutes
        if (duration > 0 && duration < 300) { // Filter out unrealistic durations (0-5 hours)
          durations.push(duration)
        }
      }
    })

    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

    return {
      average: Math.round(avgDuration * 10) / 10, // Round to 1 decimal
      completedTours: durations.length,
      totalSessions: Object.keys(sessions).length
    }

  } catch (error) {
    console.error('Error calculating average tour length:', error)
    throw error
  }
}

/**
 * Get general dashboard stats
 */
export async function getDashboardStats() {
  try {
    // Get total tours started
    const { data: toursData, error: toursError } = await supabase
      .from('analytics_events')
      .select('session_id')
      .eq('event_type', 'tour-start')

    if (toursError) throw toursError

    // Get unique schools
    const { data: schoolsData, error: schoolsError } = await supabase
      .from('schools')
      .select('id')

    if (schoolsError) throw schoolsError

    // Get tour completion data
    const tourCompletion = await getTourCompletion()
    const avgTourLength = await getAverageTourLength()

    const totalTours = toursData.length
    const completionRate = totalTours > 0 ? tourCompletion.data[0] / totalTours : 0

    return {
      totalTours,
      activeSchools: schoolsData.length,
      avgDuration: avgTourLength.average,
      completionRate
    }

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    throw error
  }
} 