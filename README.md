# Elective Course Selector

## Setup

### Backend
1. Navigate to `backend` folder.
2. Run `npm install`.
3. Create a `.env` file with:
   ```
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   ```
4. Run `npm start`.

### Frontend
1. Navigate to `frontend` folder.
2. Run `npm install`.
3. Run `npm run dev`.

## Features
- **Student Login**: Use Roll Number and Password (initially Roll Number).
- **Admin Login**: Use Username and Password.
- **Course Selection**: Real-time updates using WebSockets. Limit 20 students per course.
- **Admin Dashboard**: 
    - Manage Students (Add, Edit, Delete, Filter by Year/Sem).
    - Manage Courses (Add, Edit, Delete, Assign to Semester).
    - Bulk Upload Students via CSV.
    - Export Students to JSON.

## CSV Format for Students
Headers: `Name`, `RollNumber`, `Year`, `Semester`, `Batch`
Example:
```
Name,RollNumber,Year,Semester,Batch
John Doe,123456,1,1,2024
Jane Smith,123457,2,3,2023
```
