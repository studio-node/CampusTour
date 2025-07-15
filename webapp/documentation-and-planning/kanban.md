# 🧭 Admin Dashboard Kanban – Campus Tour Analytics

## 🟢 TODO
---

## 🔧 IN PROGRESS
---

## ✅ DONE

### 📊 Charts & Data Sections


### 🛠️ Project Setup
- [x] Install `@supabase/supabase-js`
- [x] Install `vue-chartjs` and `chart.js`
- [x] Set up Supabase client with provided keys
- [x] Create Tailwind setup for modern UI
- [x] Supabase client config file (`supabase.js`)
- [x] Page layout component (dashboard grid or flex)
- [x] Chart wrapper Vue components for reuse

#### Interests Popularity
- [x] Query `analytics-events` where `event_type = 'interests-chosen'`
- [x] Aggregate counts per `metadata.interest`
- [x] Display with a bar chart (horizontal or vertical)

#### Most Popular Locations by Average Visit Time
- [x] Query `analytics-events` where `event_type = 'location-duration'`
- [x] Group by `location_id`, calculate average `metadata.duration`

#### Tours Started vs Finished
- [x] Count events by type: `tour-start` and `tour-finish` and display as pie chart

#### Average Tour Length
- [x] Pair `tour-start` and `tour-finish` by `session_id`
- [x] Calculate average time difference between matched events
- [x] Display in area chart

#### Most Popular Times of Day
- [x] Query `tour-start` events
- [x] Bucket timestamps into 2-hour ranges (e.g., 8–10 AM, 10 AM–12 PM, etc.)
- [x] Display as a bar chart or area chart

#### Schools Being Visited
- [x] Query `tour-start` events grouped by `school_id`
- [x] Join/lookup school names (if needed)
- [x] Display with a ranked bar chart
---

## 📝 Notes

- Use `metadata` field for custom data (e.g., `duration`, `interest`, etc.)
- Use `timestamp` field for time-based aggregation
- For now, no login/auth — all data is publicly accessed

