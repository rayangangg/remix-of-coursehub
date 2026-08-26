# EduForFree - Web source update

## What will change
- Merge the uploaded JSON course-management feature into the existing admin panel without replacing generated backend client files or unrelated project code.
- Add JSON upload, validation, preview, export, and create/update support for courses, sections, lessons, videos, and materials.
- Rename all user-facing defaults and metadata to **EduForFree - Web**, including the database-backed default site name.
- Fix free enrollment so regular signed-in users call the protected enrollment function instead of inserting directly into the enrollment table.
- Preserve paid purchasing through the existing order form, with ownership derived from the active signed-in account.

## Verification
- Run focused tests and the project’s automatic build checks.
- Test logged-out and signed-in course actions in the preview.
- Verify free enrollment creates access for the signed-in user, paid order submission succeeds, and a caller cannot assign another owner.
- Verify the JSON course manager is visible only to admins and can validate the uploaded format.

## Technical details
- Apply the uploaded source selectively: `JsonCourseManager`, its course JSON parser, and the related admin navigation.
- Use the existing `enroll_in_free_course` security-definer database function for free courses; do not add a permissive enrollment insert policy.
- Update the existing site settings record to the new name after frontend defaults are merged.
