# CRM Authentication Update — Admin-Only Employee Creation

## Objective

The existing AOTMS Telecommunication CRM Website and Mobile Application currently have authentication functionality.

Modify the existing system so that **only authorized Admins can create new employee accounts**. Public users must not be able to register themselves through a Sign Up form.

**IMPORTANT: Do not write or display any code in your response. Inspect the existing project, implement the changes directly in the codebase, and provide a summary of the actual changes and test results. Do not just provide suggestions or an implementation plan.**

## 1. Remove Public Sign Up

- Remove or disable the public Sign Up option from the website and mobile application, wherever it exists.
- Remove Sign Up links, buttons, navigation items, and registration screens that allow public account creation.
- Keep the existing Login functionality working.
- Do not break password reset, account activation, or other required authentication flows.
- Inspect all backend registration endpoints and prevent unauthorized public account creation.
- Do not rely only on hiding the Sign Up button; enforce the restriction on the backend as well.

## 2. Admin-Only Employee Creation

Add or update the existing User Management module to provide an `Add Employee` feature for authorized Admins.

The employee creation form should support the fields already defined in the existing CRM system, including:

- Full Name
- Email Address
- Phone Number, if supported
- Department
- Designation
- Role and permissions
- Account status

Reuse the existing user model, department structure, designation values, role definitions, and validation rules. Do not introduce conflicting role names or duplicate user models.

Only authorized Admins should be able to create employee accounts or assign privileged roles.

## 3. Employee Account Setup

Implement a secure account setup process using the authentication architecture already present in the project.

Preferred workflow:
1. Admin creates an employee account.
2. The system securely generates an activation process or temporary credential.
3. The employee receives the account activation instructions through an existing supported delivery mechanism, if available.
4. The employee signs in and completes any required password setup.
5. The employee can access only the modules permitted by their assigned role.

If email or SMS delivery is not configured, do not pretend that messages were sent. Use an appropriate secure fallback and clearly report any remaining setup requirements.

Never store plain-text passwords or expose credentials in logs, API responses, or unnecessary UI elements.

## 4. Shared Website and Mobile App Authentication

- Use the existing CRM backend and database.
- The same employee account must work on both the website and mobile application.
- Reuse the existing login, token/session handling, and password reset architecture.
- Ensure employee profile information, department, designation, role, and permissions are consistent across platforms.
- Do not create duplicate accounts when the same employee is added more than once.
- Validate email uniqueness using the existing account rules.

## 5. Authorization and Security

- Enforce Admin permissions on the backend for employee creation, role changes, and account management.
- Prevent employees from changing their own role to Admin or granting themselves additional permissions.
- Prevent unauthorized users from calling registration or account creation endpoints directly.
- Preserve and verify the existing Admin account so that the organization does not lose administrative access.
- Implement account activation and deactivation using existing business rules.
- Deactivated employees must not be able to establish new sessions or access protected APIs.
- Preserve existing users, passwords, sessions, and CRM data unless a specific migration is necessary and approved.
- Do not delete user records or reset production data.

## 6. UI/UX Requirements

Maintain the existing professional CRM design system.

- Use the existing Blue, Orange, and White theme consistently.
- Keep the Login page simple and professional.
- Remove unnecessary registration-related UI.
- Provide a clean `User Management → Add Employee` workflow for Admins.
- Display clear success and error messages.
- Validate required fields and prevent duplicate submissions.
- Ensure forms work correctly on desktop, mobile browsers, and the native mobile application where applicable.

## 7. Testing Requirements

Verify the following scenarios:

1. An existing employee can log in successfully.
2. An authorized Admin can create an employee.
3. A non-Admin cannot create an employee through the UI or direct API requests.
4. Public Sign Up is unavailable across the website and mobile app.
5. Duplicate employee accounts are prevented.
6. Employee roles and permissions are applied correctly.
7. The new employee can access the website and mobile app with the same account.
8. Password reset and account activation work as configured.
9. Deactivated accounts cannot access protected resources.
10. The existing Admin account and existing employee accounts continue working.
11. Existing authentication tests and available build checks pass.

## 8. Final Deliverable

Work directly in the existing CRM repository. Inspect the current authentication and User Management implementation before modifying anything.

Implement the changes without unnecessarily rewriting working functionality. Run available tests and build checks, fix any regressions, and provide a concise summary of:

- Public Sign Up changes
- Admin-only employee creation changes
- Backend authorization and security improvements
- Files and modules changed
- Tests executed and actual results
- Any remaining configuration or deployment requirements

**Do not write code in your response. Do not merely explain how to implement it. Make the changes directly in the existing project, and never claim a test or implementation succeeded unless it was actually verified.**