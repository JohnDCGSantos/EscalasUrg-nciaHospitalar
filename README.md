# Gestão de Urgências Hospitalar (Emergency MedShift Scheduler)

- [Description](#description)
- [Key Features](#key-features)
- [Vacation and Shift Rules](#vacation-and-shift-rules)
- [Distribution Rules](#distribution-rules)
- [Security](#security)
- [Usage](#usage)
- [Customization for Specific Requirements](#customization-for-specific-requirements)
- [Contact](#contact)

## Description

This application was created to meet the specific needs of a hospital, streamlining the distribution of doctors in emergency schedules. The app follows the hospital's rules to ensure an efficient and fair distribution of medical professionals.

## Key Features

- **Random Schedule Generation:**
  - Click to generate random emergency schedules, adhering to the hospital's established rules.
- **Add Doctors:**
  - Use the option to add doctors, specifying their details and vacation days, seamlessly integrating them into the system.
- **Doctor Details:**
  - View the list of available doctors and explore individual doctor details, including vacation days and shift schedules displayed on a calendar.
- **Update and Manage Doctors:**
  - Modify doctor details, add or remove doctors as needed.
- **Schedule Visualization:**
  - View organized schedules in a table format, sortable by name, date, or shift.
- **PDF Download:**
  - Generate and download emergency schedules in PDF format.
- **Administrative Controls:**
  - Access to schedule deletion and detailed doctor information is restricted to administrators.
- **User Authentication:**
  - Only registered users can access the application. Administrators have additional privileges, while non-administrative users can only view their own details. Note: When adding a doctor, ensure that the doctor's email matches the user's email for access to individual details.

## Vacation and Shift Rules

- Doctors with three consecutive days of vacation in a week do not participate in emergency shifts during that week.
- Doctors on vacation on a Friday and the following Monday do not work emergency shifts during that weekend.

## Distribution Rules

The distribution of doctors in emergency schedules follows these rules:

- Each doctor can only take one emergency shift per week.
- Each day must have at least one doctor on day shift and one on night shift.
- If more doctors are available in the week, they are distributed to day shifts in a secondary hospital.
- If additional doctors are still available after the distribution in the secondary hospital, they are assigned to day shifts in the main hospital, which then has two doctors on day shift and one on night shift.

## Security

We prioritize the security of your data. Here are some security features implemented in our application:

- **Password Hashing:**
  - We use bcrypt, a robust and secure hashing algorithm, to securely store and manage user passwords. This ensures that sensitive information remains protected.

Feel free to explore our codebase to learn more about our security practices. If you have any security-related concerns or suggestions, please contact us.

## Usage

The application is designed for simplicity. Here are the key operations users can perform:

- **Add Doctors:**
  - Use the "Add Doctors" option to include new professionals in the database, specifying their vacation dates. Ensure that the doctor's email matches the user's email for access to individual details.
- **View Doctor List:**
  - Access the complete list of doctors available for schedule distribution.
- **View Doctor Details:**
  - Click on a doctor's name to see specific details, including vacation days, shifts, and more.
- **Update and Delete Doctor:**
  - Within individual doctor details, use the options to update or delete information.
- **Create schedule:**
  - Select a minimum of 14 doctors and choose start and end dates to generate an emergency schedule.
- **View Schedules:**
  - See the list of available schedules, organized by name, date, or shift. The list displays the title of the schedule, representing the start and end dates.
- **View Schedules Details:**
  - Click on the title of a chedule to get a detailed view of the assigned doctors, their shifts, and corresponding dates.
- **PDF Download of Roster:**
  - Within the schedule view, download the schedule in PDF format.
- **Delete Schedule:**
  - Remove schedules that are no longer needed.

Remember that hospital rules are automatically applied during schedule generation. For a more personalized experience or additional adjustments, contact us.

To get started, sign up and log in to the application.

## Customization for Specific Requirements

If your hospital has specific requirements not fully addressed by the default configuration of the application, feel free to get in touch. We are open to customizing the application to meet your specific needs.

## Contact

For any inquiries or feedback, feel free to reach out to us at [jdcg.santos@gmail.com](mailto:jdcg.santos@gmail.com).
