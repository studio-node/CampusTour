#!/bin/bash

# This script pulls the whole supabase schema and saves it to supabase_schema.sql
# You need to have supabase cli installed and be logged in to your supabase project 
# and also have Docker Engine running

npx -y supabase db dump --schema public --schema auth --schema storage > supabase_schema.sql