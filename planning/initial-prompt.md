I need you to help build an a mobile app. All the important context for the app is in the "docs" folder and in @utah-tech-tour-app-requirements.md. We left off on our task list in @kanban.md on the first task of the "Map Tab Functionality" section. We are going to work one task at a time, and not move on until I tell you the task is done and I mark it done in @kanban.md. Start working on the "Integrate Apple Maps (iOS) / Google Maps (Android)." task.



## For the agent

I have decided that I am going to make this app available and configurable for any university that wants to use it. Ultimately, I want this app to be useable by many different schools where they just need to supply their own location data. I have created a Supabase database called "CampusTour" that has two tables: The first contains schools, the second contains all location data where each location has a column that references the school to which it belongs. Here are their schemas:

```
-- Create a "schools" table
create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  state text,
  created_at timestamp with time zone default now()
);

-- Create a "locations" table
create table locations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  image_url text,
  description text,
  interests text[], -- e.g., ['Computing', 'Arts']
  is_tour_stop boolean default true,
  order_index integer, -- used for tour ordering
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (optional but recommended)
alter table schools enable row level security;
alter table locations enable row level security;
```

I want to insert the data I have currenlty in CHANGEME into the "locations" table. Can you create a sql query that inserts all of the locations I have in CHANGEME into into the "locations" table without specifying an id for the locations becaue that is automatically populated, and using "e5a9dfd2-0c88-419e-b891-0a62283b8abd" as the `school_id`. 