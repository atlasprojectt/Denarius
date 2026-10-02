-- Denarius — account settings.
-- Adds the user-facing display name for profile settings. Profile avatars are
-- added by the later private-storage migration 20261001100000_profile_avatar.

alter table public.app_user
  add column display_name text;
