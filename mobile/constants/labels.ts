// Centralized label mappings for interests and identities

// Interest mapping for pretty display with emojis
export const interestLabels: { [key: string]: string } = {
  "science_and_labs": "🔬 Science & Labs",
  "engineering": "⚙️ Engineering",
  "business": "💼 Business",
  "computing": "💻 Computing",
  "arts_and_theater": "🎭 Arts & Theater",
  "music": "🎶 Music",
  "athletics": "🏟️ Athletics",
  "recreation_and_fitness": "🏋️ Recreation & Fitness",
  "dorm-life": "🛏️ Dorm Life",
  "campus-dining": "🍔 Campus Dining",
  "clubs": "🧑‍🤝‍🧑 Student Clubs",
  "library_and_study-spaces": "📚 Library & Study Spaces",
  "nature_and_outdoor-spots": "🌳 Nature & Outdoor Spots",
  "history_and_landmarks": "🏰 History & Landmarks",
  "health_and_wellness": "🩺 Health & Wellness",
  "faith_and_spirituality": "✝️ Faith & Spirituality",
  "community": "🤝 Community",
  "career-services": "🎓 Career Services"
};

// Identity mapping for pretty display
export const identityLabels: { [key: string]: string } = {
  "prospective-student": "Prospective Student",
  "friend-family": "Friends/Family",
  "touring-campus": "Just Touring"
};

// Interest data for selection screens (ID + label pairs)
export const interests = [
  { id: "science_and_labs", name: "🔬 Science & Labs" },
  { id: "engineering", name: "⚙️ Engineering" },
  { id: "business", name: "💼 Business" },
  { id: "computing", name: "💻 Computing" },
  { id: "arts_and_theater", name: "🎭 Arts & Theater" },
  { id: "music", name: "🎶 Music" },
  { id: "athletics", name: "🏟️ Athletics" },
  { id: "recreation_and_fitness", name: "🏋️ Recreation & Fitness" },
  { id: "dorm-life", name: "🛏️ Dorm Life" },
  { id: "campus-dining", name: "🍔 Campus Dining" },
  { id: "clubs", name: "🧑‍🤝‍🧑 Student Clubs" },
  { id: "library_and_study-spaces", name: "📚 Library & Study Spaces" },
  { id: "nature_and_outdoor-spots", name: "🌳 Nature & Outdoor Spots" },
  { id: "history_and_landmarks", name: "🏰 History & Landmarks" },
  { id: "health_and_wellness", name: "🩺 Health & Wellness" },
  { id: "faith_and_spirituality", name: "✝️ Faith & Spirituality" },
  { id: "community", name: "🤝 Community" },
  { id: "career-services", name: "🎓 Career Services" }
];

// Utility functions for formatting
export const formatInterest = (interest: string): string => {
  return interestLabels[interest] || interest.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

export const formatIdentity = (identity: string): string => {
  return identityLabels[identity] || identity.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};