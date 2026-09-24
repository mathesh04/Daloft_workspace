-- Fix working-day calculation for leave requests (including work-from-home).
--
-- Root cause: some deployments had SUNDAY (and/or SATURDAY) accidentally enabled
-- in the WORKING_DAYS system setting. Because HolidayService.isWorkingDay()
-- counts every day listed in WORKING_DAYS (minus holidays), this made:
--   * leave requests count weekend days as working days
--     (e.g. 25-09-2026 to 30-09-2026 returned 5 instead of 4)
--   * the office calendar display Sunday as a working day
--
-- The organization baseline is Monday-Friday, so any value that includes
-- Saturday or Sunday is repaired back to the five-day week.
UPDATE system_settings
SET setting_value = 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY'
WHERE setting_key = 'WORKING_DAYS'
  AND (upper(coalesce(setting_value, '')) LIKE '%SUNDAY%'
    OR upper(coalesce(setting_value, '')) LIKE '%SATURDAY%');
