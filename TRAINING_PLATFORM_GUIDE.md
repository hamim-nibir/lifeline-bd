# Emergency Response Training Platform - Complete Implementation Guide

## 🎯 Overview

A complete mobile emergency response training platform integrated into the Lifeline BD app. Users can enroll in courses, watch videos, track progress, and earn certificates.

---

## 📁 Project Structure

### Backend Files Created
```
backend/src/
├── services/trainingService.js       # Business logic for training operations
├── routes/training.js                # API endpoints for training
└── server.js                         # Updated to include training routes
```

### Frontend Files Created
```
app/(feat)/
├── training-resources.tsx            # Main training hub with tabs
├── training-courses.tsx              # Course listing and filtering
├── training-course-detail.tsx        # Course details with videos
├── training-video-player.tsx         # Video player with progress tracking
└── training-certificates.tsx         # View earned certificates

components/training/
└── CourseCard.tsx                    # Reusable course card component

services/
└── training.ts                       # API client for frontend

store/
└── trainingStore.ts                  # Zustand state management

types/
└── index.ts                          # TypeScript interfaces for training
```

---

## 🔧 Setup Instructions

### 1. Backend Setup

**Install dependencies** (if not already installed):
```bash
cd backend
npm install axios
```

**Environment Setup:**
Add to `.env` file (if not present):
```
PORT=8080
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-email@iam.gserviceaccount.com
```

**Start Backend Server:**
```bash
npm run dev
# Backend runs on http://localhost:8080
```

### 2. Frontend Setup

**Update API URL:**
In `.env` or `app.json`, set:
```
EXPO_PUBLIC_API_URL=http://localhost:8080/api/training
# For production, change to your backend URL
```

**Install Frontend Dependencies** (if needed):
```bash
npm install react-native-webview
```

**Start Frontend:**
```bash
npx expo start
```

### 3. Seed Sample Data

Call the seed endpoint to populate sample courses, videos, and achievements:

```bash
# Using curl
curl -X POST http://localhost:8080/api/training/seed-data

# Or from Postman
POST http://localhost:8080/api/training/seed-data
```

This creates:
- ✅ 4 Complete courses (Beginner & Intermediate levels)
- ✅ 22 Sample videos with YouTube URLs
- ✅ 4 Achievement badges

---

## 📚 API Endpoints

### Courses
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/training/courses` | GET | Fetch all courses (optional: `?level=Beginner`) |
| `/api/training/courses/:id` | GET | Get course details with videos |
| `/api/training/courses/:id/videos` | GET | Get all videos for a course |

### Enrollments
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/training/enroll` | POST | Enroll user in course |
| `/api/training/my-courses/:userId` | GET | Get user's enrolled courses |

### Progress
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/training/progress` | POST | Update video progress |
| `/api/training/complete-course` | POST | Mark course as complete (issue certificate) |

### Achievements & Certificates
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/training/achievements/:userId` | GET | Get user's achievements |
| `/api/training/certificates/:userId` | GET | Get user's certificates |

### Admin/Seed
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/training/seed-data` | POST | Populate sample data (dev only) |

---

## 🎮 Usage Flow

### 1. Browse Courses
- User goes to **Training Resources** tab
- Clicks **Browse All Courses** or arrow on hero banner
- Sees filtered list (All/Beginner/Intermediate)
- Each card shows title, description, level, and enrollment status

### 2. Enroll in Course
```typescript
// Frontend automatically handles enrollment
const handleEnroll = async (courseId: string) => {
  await enrollInCourse(user.uid, courseId);
  // Course added to enrollments with 0% progress
}
```

### 3. Watch Videos
- User clicks course card → Course Detail page
- Sees list of videos with progress
- Clicks video → Opens video player
- YouTube video embedded and plays
- Progress tracked automatically (80%+ of video watched = marked as complete)

### 4. Track Progress
- Progress bar updates as videos are completed
- When progress = 100%, course is marked as **completed**
- Certificate automatically issued
- Achievement unlocked

### 5. View Certificates
- User goes to **Achievements** tab
- Clicks **View Certificates**
- Sees all earned certificates with:
  - Certificate number
  - Issue date
  - Expiration date (1 year from issue)
  - Share button to spread on social

---

## 💾 Database Schema (Firestore)

### Collections Overview

**`training/courses`** - Course definitions
```javascript
{
  id: "first-aid-cpr",
  title: "First Aid & CPR",
  description: "Learn essential first aid techniques and CPR",
  level: "Beginner",
  icon: "🏥",
  backgroundColor: "#E3F2FD",
  duration: 240, // in minutes
  videoCount: 5,
  enrolledCount: 2543
}
```

**`training/courses/{courseId}/videos`** - Videos subcollection
```javascript
{
  id: "v1",
  title: "CPR Step-by-Step Demonstration",
  videoUrl: "https://www.youtube.com/embed/...",
  duration: 750, // in seconds
  order: 1,
  thumbnail: "https://..."
}
```

**`training/enrollments`** - User enrollment records
```javascript
{
  id: "enroll-123",
  userId: "user-456",
  courseId: "first-aid-cpr",
  status: "in-progress", // locked | in-progress | completed
  progress: 45,
  lastWatchedVideoId: "v1",
  enrolledAt: timestamp,
  completedAt: null,
  certificateId: null
}
```

**`training/progress_history`** - Video watch records
```javascript
{
  userId: "user-456",
  courseId: "first-aid-cpr",
  videoId: "v1",
  watchedDuration: 600,
  totalDuration: 750,
  progress: 80,
  timestamp: timestamp
}
```

**`training/certificates`** - Issued certificates
```javascript
{
  id: "cert-123",
  userId: "user-456",
  courseId: "first-aid-cpr",
  certificateNumber: "CERT-2026-ABC123",
  issuedAt: timestamp,
  expiresAt: timestamp, // 1 year later
  status: "active"
}
```

**`training/achievements`** - Achievement definitions
```javascript
{
  id: "first-responder",
  title: "First Responder",
  description: "Completed First Aid & CPR",
  icon: "🏅",
  requirementType: "course_completion",
  courseId: "first-aid-cpr"
}
```

**`training/user_achievements`** - User achievement progress
```javascript
{
  userId: "user-456",
  achievementId: "first-responder",
  unlockedAt: timestamp,
  progress: 100
}
```

---

## 🔐 Security Rules

Firestore security rules are configured to:
- ✅ Allow anyone to read courses and achievements
- ✅ Allow signed-in users to create enrollments and progress records
- ✅ Only allow users to read/update their own data
- ✅ Prevent deletion of critical records (certificates, history)
- ✅ Allow operators to create/update all training content

---

## 🎨 UI Components

### CourseCard Component
```typescript
<CourseCard
  id={course.id}
  title={course.title}
  icon={course.icon}
  status="in-progress"
  progress={45}
  onPress={() => navigateToCourseDetail()}
  onEnroll={() => handleEnroll()}
/>
```

Shows:
- Course icon and title
- Progress bar (for enrolled users)
- Level badge
- Enrollment count
- Action button (Enroll Now / Continue Learning / Completed)

---

## 📊 State Management

### useTrainingStore (Zustand)
```typescript
const {
  courses,           // All available courses
  enrollments,       // User's enrollments
  currentCourse,     // Currently viewing course
  achievements,      // User's achievements
  certificates,      // User's certificates
  isLoading,         // Loading state
  error,             // Error message
  
  // Actions
  fetchCourses,
  fetchCourseDetail,
  enrollInCourse,
  fetchMyCourses,
  updateProgress,
  fetchAchievements,
  fetchCertificates,
} = useTrainingStore();
```

---

## 🚀 Key Features

### ✅ Implemented Features
1. **Course Management**
   - Create, read, update, delete courses
   - Multiple difficulty levels (Beginner, Intermediate)
   - Video organization by course

2. **Enrollment System**
   - Prevent duplicate enrollments
   - Track enrollment status
   - Display progress to users

3. **Video Player**
   - YouTube video embedding
   - Progress tracking (80%+ watched = complete)
   - Video navigation (Previous/Next)
   - Related videos sidebar

4. **Progress Tracking**
   - Automatic calculation (videos completed / total)
   - Real-time progress updates
   - Resume from last watched video
   - Detailed progress history

5. **Certificates**
   - Automatic issuance on course completion
   - Unique certificate numbers
   - 1-year expiration
   - Share functionality

6. **Achievements**
   - Badge-based achievement system
   - Automatic unlock on course completion
   - Visual achievement display

7. **Filtering & Tabs**
   - Filter by difficulty level
   - Separate tabs for Courses/Videos/Achievements
   - Responsive UI

---

## 🔄 Data Flow

```
User Enrolls in Course
        ↓
enrollInCourse() API called
        ↓
Creates new Enrollment document (progress: 0)
        ↓
User watches video
        ↓
updateProgress() API called when video is 80% watched
        ↓
Creates Progress History record
        ↓
Calculates course progress (videos watched / total)
        ↓
Updates Enrollment progress
        ↓
If progress === 100%:
  ├─ Mark enrollment as completed
  ├─ Issue certificate
  └─ Unlock achievement
        ↓
User sees progress update in real-time
```

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Backend server starts on port 8080
- [ ] Seed data creates 4 courses with videos
- [ ] Can fetch all courses via API
- [ ] Can enroll in course
- [ ] Can view course details and videos
- [ ] Can open video player and play YouTube videos
- [ ] Progress updates when scrolling through video
- [ ] Progress bar shows correct percentage
- [ ] Course completion triggers certificate
- [ ] Certificate appears in certificates tab
- [ ] Achievement unlocks and displays
- [ ] Can filter courses by level
- [ ] Can navigate between tabs

### API Testing (using Postman)
```bash
# Get all courses
GET http://localhost:8080/api/training/courses

# Get beginner courses only
GET http://localhost:8080/api/training/courses?level=Beginner

# Enroll in course
POST http://localhost:8080/api/training/enroll
Body: { "userId": "user123", "courseId": "first-aid-cpr" }

# Update progress
POST http://localhost:8080/api/training/progress
Body: {
  "userId": "user123",
  "courseId": "first-aid-cpr",
  "videoId": "v1",
  "watchedDuration": 600,
  "totalDuration": 750
}

# Get user certificates
GET http://localhost:8080/api/training/certificates/user123
```

---

## 📝 Notes

- **Videos**: Using YouTube embed URLs. Can be replaced with other CDNs
- **Progress Tracking**: Marks video as watched when 80%+ of duration watched
- **Certificates**: Valid for 1 year from issuance
- **Achievements**: Automatically unlocked on course completion
- **Offline**: Features work online; consider adding offline support for download

---

## 🐛 Troubleshooting

**Issue**: Videos not loading
- Check YouTube video URL format
- Ensure WebView is properly installed
- Check CORS settings on backend

**Issue**: Progress not updating
- Verify API endpoint is correct
- Check Firebase Firestore write permissions
- Ensure user is authenticated

**Issue**: Enrollment fails
- Check if user already enrolled (prevents duplicates)
- Verify Firebase is initialized correctly
- Check network connectivity

---

## 🎓 Sample Courses Included

1. **First Aid & CPR** (Beginner) - 5 videos
2. **Fire Prevention & Emergency Response** (Beginner) - 4 videos
3. **Disaster Response & Preparedness** (Intermediate) - 6 videos
4. **Advanced Rescue Operations** (Intermediate) - 7 videos

---

## 📞 Support

For issues or questions, check:
1. Backend logs for API errors
2. Firestore console for data/permission issues
3. Browser console for frontend errors
4. Firebase security rules configuration

---

Created: 2026-05-16
Updated: 2026-05-16
Version: 1.0.0
