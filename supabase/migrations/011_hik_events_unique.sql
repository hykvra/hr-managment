-- Prevent duplicate Hikvision events (same employee + same timestamp on same device)
ALTER TABLE hikvision_events
  ADD CONSTRAINT hikvision_events_unique_scan
  UNIQUE (device_id, hik_employee_no, event_time);
