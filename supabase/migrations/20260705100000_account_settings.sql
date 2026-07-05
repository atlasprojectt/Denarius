-- Denarius — account settings.
-- Adds a user-facing display name for profile settings. Avatar upload is
-- deliberately out of scope for this slice; initials are derived in the UI.

alter table public.app_user
  add column display_name text;
