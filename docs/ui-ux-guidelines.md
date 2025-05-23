# UI/UX Design Guidelines

This document provides User Interface (UI) and User Experience (UX) guidelines for the Utah Tech Campus Tour App, based on Section 9 of the [main requirements document](../planning/utah-tech-tour-app-requirements.md).

## 1. Overall Design Philosophy

- **Clean and Modern**: The app should have a contemporary look and feel, avoiding clutter and outdated design patterns.
- **Simplicity**: Navigation and interaction should be intuitive and straightforward, requiring minimal learning curve for new users.
- **Brand Alignment**: The design must incorporate Utah Tech University's branding elements.

## 2. Navigation

- **Tab-Based**: The primary navigation structure will consist of two main tabs:
  - **Map Tab**: For exploring campus geographically.
  - **Tour Tab**: For guided and interest-based tour experiences.
- **Consistent Icons and Labels**: Icons and text labels used for navigation and interactive elements must be clear, consistent, and easily understandable throughout the app.

## 3. Visual Design

### 3.1 Color Palette

- Utilize **Utah Tech branding colors**. Specific hex codes or color guidelines should be obtained from Utah Tech's official branding resources.
  - Primary colors for backgrounds, headers, and active states.
  - Secondary/accent colors for buttons, highlights, and calls to action.

### 3.2 Typography

- Use **Utah Tech branding fonts**. Similar to colors, font family names and usage guidelines (weights, sizes for headings vs. body text) should be sourced from official branding materials.
- Ensure readability across different screen sizes and resolutions.

### 3.3 Imagery

- Building images should be of good quality, clear, and representative.
- Icons should be consistent in style (e.g., filled vs. outline, stroke weight) and easily recognizable.

## 4. User Experience (UX)

- **Intuitive Flow**: The navigation flow (as outlined in Section 10 of the main requirements document) should feel natural and logical to the user.
  ```
  [Launch App]
      |
      |---> [Map Tab] --(Click Marker)--> [Building Info Page]
      |
      |---> [Tour Tab]
               |
               |---> [Select Interests] --(Skip or Confirm)-->
               |
               |---> [Tour Overview] --(Details / Location)--> [Info Page or Map Tab]
  ```
- **Feedback**: Provide visual feedback for user interactions (e.g., button presses, loading states).
- **Performance**: Fast load times and smooth transitions contribute significantly to a positive UX (as per non-functional requirements).
- **Offline Experience**: Clearly communicate to the user when functionality is limited due to lack of internet connection, and ensure cached content is readily accessible.

## 5. Key Screens & Elements (High-Level)

- **Map Tab View**:
  - Clear map markers with legible labels.
  - Easily accessible "recenter" button.
- **Tour Tab View**:
  - Intuitive interest selection interface (if applicable).
  - Clear presentation of tour stops with image, name, description, and action buttons ("Details", "Location").
- **Building Info Page**:
  - Well-structured layout for displaying building name, image, description, and other relevant details.
  - Easy navigation back to the map or tour.

## 6. Accessibility

- While the main requirements document states "Accessibility support can be added in a future version," basic accessibility considerations should be kept in mind where feasible during initial development (e.g., sufficient color contrast, legible font sizes). Full WCAG compliance or advanced accessibility features are deferred.

## 7. Branding Resources

- **Action Item**: Obtain official Utah Tech University branding guidelines, including:
  - Color palettes (Hex codes, RGB values)
  - Approved fonts and their usage
  - Logo assets and usage guidelines (if any are to be used in-app)

These guidelines will be refined as mockups and prototypes are developed.
