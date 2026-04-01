# 📚 Learning Management System (LMS)

A full-stack **Learning Management System** built with **Django REST Framework** and **React.js**, featuring role-based access control, video-based course delivery, interactive quizzes, team management, and rich analytics dashboards.

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication (access + refresh tokens)
- Role-based access control — **Admin** and **Student** roles
- Protected routes with automatic redirection

### 👨‍💼 Admin Panel
- **Dashboard** — Overview stats: total users, active courses, teams, enrollments, recent activity
- **User Management** — Create, update, and delete users; assign roles and teams
- **Course Management** — Full CRUD for courses with video uploads and quiz creation
- **Category Management** — Organize courses into categories
- **Team Management** — Create teams, assign members, and assign courses to teams
- **Analytics** — User registration trends, course performance, quiz score distribution, team comparisons

### 🎓 Student Portal
- **Dashboard** — Personalized view with enrolled courses, progress tracking, and recent activity
- **Course Catalog** — Browse and search available courses filtered by team assignment
- **My Courses** — Track enrolled courses and completion status
- **Course Viewer** — Stream videos with progress tracking, take quizzes after each video, and attempt final exams
- **Performance** — Detailed analytics on quiz scores, course progress history, and completion stats

### 📹 Video-Based Learning
- Video uploads with automatic duration detection (via MoviePy)
- Sequential video progress tracking
- Watch time persistence
- Video completion validation before quiz access

### 📝 Quizzes & Assessments
- Per-video quizzes and final course exams
- Multiple-choice questions with JSON-based answer storage
- Configurable passing scores
- Automatic progress updates upon passing
- Quiz attempt history and score tracking

### 👥 Team Management
- Create and manage teams
- Assign/remove team members
- Assign courses to teams (students only see courses assigned to their team)
- Team-level analytics and performance comparison

---

## 🛠️ Tech Stack

| Layer        | Technology                                                                 |
|--------------|----------------------------------------------------------------------------|
| **Frontend** | React 19, Material UI (MUI) 7, React Router 7, Axios, React Player        |
| **Backend**  | Django 5, Django REST Framework, Simple JWT, MoviePy                       |
| **Database** | SQLite (development)                                                       |
| **Auth**     | JWT (JSON Web Tokens) via `djangorestframework-simplejwt`                  |
| **Styling**  | MUI Theming with custom palette, typography, and component overrides        |

---

## 📁 Project Structure

```
Learning-Management-System/
├── lms-frontend/                  # React frontend
│   ├── public/
│   ├── src/
│   │   ├── api/                   # Axios API client & endpoint helpers
│   │   │   ├── index.js           # Base Axios instance with JWT interceptors
│   │   │   ├── auth.js            # Auth API calls
│   │   │   └── courses.js         # Course API calls
│   │   ├── components/
│   │   │   ├── layouts/           # Admin & Student layout wrappers
│   │   │   └── VideoProgressBar.js
│   │   ├── contexts/
│   │   │   └── AuthContext.js     # Auth state management (React Context)
│   │   ├── pages/
│   │   │   ├── admin/             # Admin pages
│   │   │   │   ├── Dashboard.js
│   │   │   │   ├── UserManagement.js
│   │   │   │   ├── CourseManagement.js
│   │   │   │   ├── CategoryManagement.js
│   │   │   │   ├── TeamManagement.js
│   │   │   │   └── Analytics.js
│   │   │   ├── auth/              # Login & Register
│   │   │   └── student/           # Student pages
│   │   │       ├── Dashboard.js
│   │   │       ├── CourseCatalog.js
│   │   │       ├── MyCourses.js
│   │   │       ├── CourseView.js
│   │   │       └── Performance.js
│   │   ├── services/
│   │   │   └── authService.js     # Token management utilities
│   │   ├── theme.js               # MUI theme configuration
│   │   ├── App.js                 # Root component with routing
│   │   └── index.js               # React entry point
│   └── package.json
│
├── lms_project/                   # Django backend
│   ├── lms_project/               # Django project config
│   │   ├── settings.py            # Settings (DB, JWT, CORS, etc.)
│   │   ├── urls.py                # Root URL configuration
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── lms_backend/               # Main Django app
│   │   ├── models.py              # Data models (User, Course, Video, Quiz, etc.)
│   │   ├── serializers.py         # DRF serializers
│   │   ├── views.py               # API views & ViewSets
│   │   ├── urls.py                # App-level URL routing
│   │   ├── permissions.py         # Custom permission classes
│   │   ├── utils.py               # Helper functions (progress, analytics)
│   │   ├── admin.py               # Django admin configuration
│   │   └── migrations/            # Database migrations
│   ├── media/                     # Uploaded video files
│   └── manage.py
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python** 3.10+
- **Node.js** 18+
- **npm** 9+
- **pip**

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Learning-Management-System.git
cd Learning-Management-System
```

### 2. Backend Setup

```bash
# Navigate to the Django project
cd lms_project

# Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers moviepy

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Create a superuser (Admin account)
python manage.py createsuperuser

# Start the development server
python manage.py runserver
```

The backend API will be available at `http://localhost:8000/api/`

### 3. Frontend Setup

```bash
# Navigate to the frontend directory (from project root)
cd lms-frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend will be available at `http://localhost:3000`

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint               | Description            |
|--------|------------------------|------------------------|
| POST   | `/api/token/`          | Obtain JWT token pair  |
| POST   | `/api/token/refresh/`  | Refresh access token   |

### Users
| Method | Endpoint              | Description           |
|--------|-----------------------|-----------------------|
| GET    | `/api/users/`         | List all users        |
| POST   | `/api/users/`         | Create a new user     |
| GET    | `/api/users/{id}/`    | Get user details      |
| GET    | `/api/users/me/`      | Get current user      |

### Courses
| Method | Endpoint                              | Description                  |
|--------|---------------------------------------|------------------------------|
| GET    | `/api/courses/`                       | List courses                 |
| POST   | `/api/courses/`                       | Create a course              |
| GET    | `/api/courses/{id}/`                  | Get course details           |
| POST   | `/api/courses/{id}/enroll/`           | Enroll in a course           |
| GET    | `/api/courses/{id}/enrollment_status/`| Check enrollment status      |
| GET    | `/api/courses/{id}/progress/`         | Get course progress          |
| GET    | `/api/courses/{id}/detailed_progress/`| Get detailed progress        |
| GET    | `/api/courses/{id}/videos/`           | List course videos           |

### Videos
| Method | Endpoint                        | Description               |
|--------|---------------------------------|---------------------------|
| GET    | `/api/videos/`                  | List all videos           |
| POST   | `/api/videos/`                  | Upload a video            |
| POST   | `/api/videos/{id}/watch/`       | Update watch progress     |
| POST   | `/api/videos/{id}/mark_complete/`| Mark video as completed  |
| GET    | `/api/videos/{id}/progress/`    | Get video progress        |

### Quizzes
| Method | Endpoint                        | Description               |
|--------|---------------------------------|---------------------------|
| GET    | `/api/quizzes/`                 | List quizzes              |
| POST   | `/api/quizzes/`                 | Create a quiz             |
| GET    | `/api/quizzes/{id}/can_attempt/`| Check if quiz is available|
| POST   | `/api/quizzes/{id}/attempt/`    | Submit quiz attempt       |

### Teams
| Method | Endpoint                                    | Description                |
|--------|---------------------------------------------|----------------------------|
| GET    | `/api/teams/`                               | List all teams             |
| POST   | `/api/teams/`                               | Create a team              |
| POST   | `/api/teams/{id}/members/`                  | Add member to team         |
| DELETE | `/api/teams/{id}/members/{user_id}/`        | Remove member from team    |
| PUT    | `/api/teams/{id}/assign_courses/`           | Assign courses to team     |

### Analytics & Dashboards
| Method | Endpoint                         | Description                 |
|--------|----------------------------------|-----------------------------|
| GET    | `/api/admin/dashboard-stats/`    | Admin dashboard statistics  |
| GET    | `/api/student/dashboard/`        | Student dashboard data      |
| GET    | `/api/student/performance/`      | Student performance metrics |
| GET    | `/api/analytics/users/`          | User analytics              |
| GET    | `/api/analytics/courses/`        | Course analytics            |
| GET    | `/api/analytics/teams/`          | Team analytics              |

---

## 📊 Data Models

```
User ──────── Enrollment ──────── Course ──────── Category
  │                                  │
  │                                  ├── Video ──── Quiz ──── Question
  │                                  │
  └── Team ────────────────────── Course (M2M)
  │
  ├── QuizAttempt
  └── VideoProgress
```

| Model          | Description                                         |
|----------------|-----------------------------------------------------|
| **User**       | Custom user with `ADMIN` / `STUDENT` roles, team FK |
| **Team**       | Groups of students with assigned courses (M2M)      |
| **Category**   | Course categorization                                |
| **Course**     | Core entity with title, description, categories      |
| **Video**      | Course videos with ordering and duration tracking    |
| **Quiz**       | Per-video quizzes and final course exams             |
| **Question**   | Multiple-choice questions with JSON choices          |
| **Enrollment** | User-course enrollment with progress status          |
| **QuizAttempt**| Records quiz scores and pass/fail status             |
| **VideoProgress** | Tracks watch time and completion per user-video   |

---

## ⚙️ Configuration

### Environment Variables

| Variable                  | Default               | Description                      |
|---------------------------|-----------------------|----------------------------------|
| `SECRET_KEY`              | (set in settings.py)  | Django secret key                |
| `DEBUG`                   | `True`                | Debug mode                       |
| `ALLOWED_HOSTS`           | `localhost, 127.0.0.1`| Allowed host names               |
| `CORS_ALLOWED_ORIGINS`   | `http://localhost:3000`| Frontend origin for CORS         |

### JWT Configuration (in `settings.py`)

- **Access Token Lifetime**: 60 minutes
- **Refresh Token Lifetime**: 1 day
- **Token Rotation**: Enabled

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Ajay Vairam**

- GitHub: [@ajayvairam](https://github.com/ajayvairam)
