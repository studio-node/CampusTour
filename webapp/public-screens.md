# Public Screens Requirements

## User Journey Flow
1. **School Selection** (`/select-school`) → 
2. **Lead Capture** (`/information`) → 
3. **Tour Groups** (`/tour-groups`) → 
4. **Interest Selection** (`/select-interests`)

---

## 1. School Selection Screen (`/select-school`)

### Purpose
Allow users to select which school/campus they want to tour from available options.

### Requirements

#### Data & API
- Fetch schools from `schoolService.getClosestSchools()` (similar to mobile app)
- Store selected school using `schoolService.setSelectedSchool()`
- Display school name, city, state, and logo
- Get school data from existing Supabase `schools` table

#### UI Components
- **Hero section** with campus tour branding and hero image
- **School dropdown/selector** with:
  - School name as primary text
  - City, state as secondary text  
  - School logo image
  - Modal or dropdown interface for selection
- **Continue button** (disabled until school selected)
- **Back navigation** (if coming from external link)

#### Functionality
- Load schools on page mount
- Handle school selection with visual feedback
- Validate selection before allowing continue
- Save selected school to storage/state
- Navigate to lead capture screen after selection

#### Responsive Design
- Mobile-first design
- Works on tablets and desktop
- Touch-friendly school selection interface

---

## 2. Lead Capture Screen (`/information`)

### Purpose
Collect user information for tour personalization and lead generation.

### Requirements

#### Data & API
- Get selected school ID from previous step
- Save lead data using `leadsService.createLead()` 
- Connect to existing Supabase `leads` table
- Validate required vs optional fields

#### Form Fields
**Required Fields:**
- **Identity** (dropdown): Prospective Student, Friend/Family of Prospective Student, Just Touring Campus
- **Full Name** (text input)
- **Address** (multiline text input) 
- **Email** (email input with validation)

**Optional Fields:**
- **Date of Birth** (date input, MM/DD/YYYY format)
- **Gender** (dropdown): Male, Female, Non-binary, Prefer not to say
- **Phone Number** (phone input) - Note: Not saved to database per mobile app
- **Expected Graduation Year** (number input)

#### UI Components
- **Header** with title "Tell us about yourself" and subtitle
- **Form fields** with proper labels and validation
- **Dropdown modals** for identity and gender selection
- **Continue button** (disabled until required fields complete)
- **Field validation** with error messages
- **Loading state** during form submission

#### Functionality
- Real-time form validation
- Handle dropdown selections
- Format date properly for database (YYYY-MM-DD)
- Show loading state during submission
- Error handling for failed submissions
- Navigate to tour groups screen after successful submission

#### Validation Rules
- Email format validation
- Date format validation (MM/DD/YYYY)
- Required field checking
- Character limits for text fields

---

## 3. Tour Groups Screen (`/tour-groups`)

### Purpose
Display available tour groups/times for the selected school and allow users to join one.

### Requirements

#### Data & API
- Fetch available tour groups for selected school
- Connect to existing `tour_appointments` table or create new tour groups system
- Show tour details: date, time, ambassador name, max participants, available spots
- Handle tour group joining/registration

#### UI Components
- **Header** with selected school information
- **Tour groups list** with:
  - Date and time
  - Tour type (Ambassador-led vs Self-guided)
  - Ambassador name and photo (if applicable)
  - Available spots / max participants
  - Duration
  - Meeting location
- **Join buttons** for available tours
- **Filtering options** (by date, type, etc.)
- **"No tours available" state** with alternative options

#### Functionality
- Load tour groups for selected school
- Show real-time availability
- Handle tour group selection and joining
- Update available spots when user joins
- Navigate to interest selection after joining tour
- Handle edge cases (tour full, tour cancelled, etc.)

#### Special Cases
- **No tours available:** Show message with options to:
  - Continue with self-guided tour (go to interest selection)
  - Contact school to schedule tour
  - Download mobile app
- **Tour group full:** Show waitlist option or suggest other tours
- **Past tours:** Filter out expired tour times

---

## 4. Interest Selection Screen (`/select-interests`) - EXISTING

### Purpose
Allow users to select their interests for a personalized tour experience.

### Current Implementation
- ✅ Interest tags matching mobile app
- ✅ Multi-select functionality with visual feedback
- ✅ Generate tour and default tour options
- ✅ Next steps with app download and ambassador booking

### Potential Enhancements for Integration
- Show selected school context
- Show joined tour group information (if applicable)
- Customize interest options based on school's available locations
- Generate tour based on school-specific locations
- Store selections for tour generation

---

## Technical Requirements

### Routing Structure
```
/select-school → /information → /tour-groups → /select-interests
```

### State Management
- **School selection:** Persist selected school across all screens
- **User information:** Store for tour personalization
- **Tour group:** Track joined tour group
- **Interest selections:** Pass to tour generation

### Data Persistence
- Use localStorage/sessionStorage for user flow state
- Save critical data to Supabase at appropriate steps
- Handle page refresh gracefully

### Navigation
- **Progressive flow:** Each step requires completion of previous
- **Back navigation:** Allow users to go back and modify selections
- **Exit points:** Clear navigation to download app or contact support

### Error Handling
- Network errors during data fetching
- Form validation errors
- Failed data submissions
- Graceful degradation for empty states

### Analytics Integration
- Track user progress through funnel
- Monitor drop-off points
- Record interest selections
- Track tour group joins

---

## Integration Points

### Mobile App Compatibility
- Use same interest categories as mobile app
- Compatible data structures for cross-platform analytics
- Consistent user experience with mobile app

### Admin Dashboard
- View web registrations in admin panel
- Track conversion rates from web to mobile
- Manage tour groups from admin interface

### Existing Services
- Leverage existing Supabase services (`schoolService`, `leadsService`)
- Integrate with current analytics system
- Use existing location and tour data
