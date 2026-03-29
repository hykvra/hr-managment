-- Phase 2C: Add clock-in / clock-out time columns to attendance
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS clock_in_time  TIME,
  ADD COLUMN IF NOT EXISTS clock_out_time TIME;
