I am ready to create the admin dashboard I have discussed with you here in this chat. I have created the SupaBase table and have added all the necessary exporting from my app. I need your help making a Kanban board to assist me in AI coding this website. I have created a vue project for this already. Here are the requirements:

- Use `vue-chartjs` to display aggregated data
- For now, do not use user validation to get the data from the table, this will be added later
- Must look modern and attractive
- Connect to Supabase table `analytics-events` using keys that I will provide you
- **Required charts and information sections for the following topics**
    - Interests and their popularities (using `interests-chosen`)
    - Most popular locations ranked by longest average visit time (using `location-duration`)
    - How many tours are started vs. how many are finished (using `tour-start` and `tour-finish` )
    - Average tour length (using `tour-start` and `tour-finish` )
    - Most popular times of day to start a tour (found using 2 hour blocks and `tour-start`)
    - Schools being visited (ranked using `tour-start` per school)


# Prompting Section

I am creating an admin dashboard for a mobile app I am making. The app is for self-guided campus tours of universities. This dashboard will query a Supabase DB that I have set up to display data that is exported from the mobile app. It has a table called `analytics-events` that contains info about all the events I want you to aggregate data for. You can find the schema for that table in @supabase-table-schemas.md . The actual data for each query we need is in the `metadata` column.

I have created a Vue project and starting configuring it, and finished some tasks. You can find all the tasks needed to complete this project in @kanban.md . Together, we will work through these tasks one by one, and you will not move on or mark a task as complete until. Lets start with our first task: "Create Tailwind setup for modern UI".