#!/bin/bash

npx supabase db dump --schema public --schema auth --schema storage > supabase_schema.sql
