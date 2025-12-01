# ElevateU

ElevateU is a **MERN stack job portal** designed for students and recruiters.
Students can build profiles, upload resumes, apply to jobs, and track applications, while recruiters can post jobs, manage applicants, and create company profiles.

---

# Live Demo

**Frontend (Vercel):**
🔗 [https://elevate-u-jobs.vercel.app/](https://elevate-u-jobs.vercel.app/)

---

# Features

## Authentication

* Role-based registration and login for **Students** and **Recruiters**
* Secure session or token-based authentication
* Logout functionality to securely end sessions

---

## Recruiter Features

* Register and log in as a recruiter
* Create and manage job listings
* View **all applications** for a specific job
* **Accept or reject** student applications
* Edit or update job listings
* View student profiles and resumes
* Logout securely

---

## Student Features

* Register and log in as a student
* View and update profile: **bio, skills, resume, profile picture**
* Search jobs by **title or keyword**
* Filter jobs by **location and job type**
* View **detailed job descriptions**
* **Apply to jobs** with a single click
* See the **latest job openings** on the homepage
* Track all **applied jobs and their application status**
* Logout securely

---

## Job Listings

* Real-time job search
* Smart filtering by:

  * **Location**
  * **Type of job**
* Stay updated with the latest job postings

---

# Tech Stack

## **Frontend**

* HTML, CSS, JavaScript, Tailwind
* React.js

## **Backend**

* Node.js
* Express
* Cloudinary

## **Database**

* MongoDB

## **Authentication**

* JWT / Sessions

---

# Setup & Installation

## **1. Clone the Repository**

```bash
git clone https://github.com/Virag-Koradiya/ElevateU.git
cd ElevateU
```

---

## **2. Create a `.env` file in the backend directory with:**

```
MONGO_URI = your_database_url
PORT = port_number
SECRET_KEY = your_secret_key

CLOUD_NAME = your_cloudinary_name
API_KEY = your_cloudinary_API_key
API_SECRET = your_cloudinary_API_secret
```

---

## **3. Setup Backend**

```bash
cd backend
npm install
npm run dev
```

---

## **4. Setup Frontend**

```bash
cd frontend
npm install
npm run dev
```

---

Absolutely — I'll create a **clean, well-formatted Project Structure section** for your `README.md` based on the screenshots you provided.
This version is **copy-paste ready** and follows professional open-source README standards.

---

# 📁 Project Structure

```
ElevateU/
│
├── backend/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── node_modules/
│   ├── public/
│   ├── routes/
│   ├── utils/
│   ├── views/
│   ├── .env
│   ├── .gitignore         
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── node_modules/
│   ├── public/ 
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   ├── shared/ 
│   │   │   └── ui/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── redux/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   └── App.css
│   ├── .gitignore
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── Resources/
│   ├── class_diagram.png
│   └── ClassDiagram.md 
│
└── README.md 
```

---

# API Documentation — ElevateU Job Portal

This document explains all backend API endpoints used in the ElevateU Job Portal.
The API supports **Students** and **Recruiters**, including user authentication, profile management, company management, job postings, and job applications.

---

## Base URL

```
http://localhost:3000/api
https://elevate-u-jobs.vercel.app/
```

---

## USER API ENDPOINTS

### ➤ **Register User**

**POST** `/user/register`
Registers a new student or recruiter.

#### Request Body (JSON)

```json
{
  "fullname": "John Doe",
  "email": "john@example.com",
  "phoneNumber": 9876543210,
  "password": "Password@123",
  "role": "student"
}
```

---

### ➤ **Login User**

**POST** `/user/login`
Logs the user in and sets an authentication cookie.

#### Request Body (JSON)

```json
{
  "email": "john@example.com",
  "password": "Password@123",
  "role": "student"
}
```

---

### ➤ **Logout User**

**GET** `/user/logout`
Clears the authentication cookie and logs the user out.

---

### ➤ **Update User Profile**

**PATCH** `/user/profile/update`
Updates name, email, contact, skills, bio, and uploads resume.

#### Body (form-data)

| Key         | Type | Description            |
| ----------- | ---- | ---------------------- |
| fullname    | text | Full name              |
| email       | text | Email ID               |
| phoneNumber | text | Mobile number          |
| bio         | text | Short user description |
| skills      | text | Comma-separated skills |
| file        | file | Resume (PDF)           |

---

### ➤ **Server-Side Rendered User Info Page**

**GET** `https://elevateu-oog5.onrender.com/api/user/ssr-info`
Returns an **EJS-rendered webpage** showing user details.

---

## COMPANY API (Recruiter Only)

### ➤ **Register Company**

**POST** `/company/register`
Registers a new company under the logged-in recruiter.

#### Request Body (JSON)

```json
{
  "companyName": "CampusTech Solutions"
}
```

---

### ➤ **Get Companies of Logged-in Recruiter**

**GET** `/company/get`
Returns all companies registered by the recruiter.

---

### ➤ **Get Company by ID**

**GET** `/company/get/:id`

---

### ➤ **Update Company**

**PUT** `/company/update/:id`
Updates company details + logo.

#### Body (form-data)

| Key         | Type | Description        |
| ----------- | ---- | ------------------ |
| name        | text | Company name       |
| description | text | About the company  |
| website     | text | Company website    |
| location    | text | Company city       |
| file        | file | Company logo image |

---

## JOB API (Recruiter)

### ➤ **Post a New Job**

**POST** `/job/post`

#### Request Body (JSON)

```json
{
  "title": "Frontend Developer",
  "description": "React developer for student platforms.",
  "requirements": "React, JavaScript, HTML, CSS",
  "salary": 5,
  "experience": 1,
  "location": "Bangalore",
  "jobType": "Full-time",
  "position": 2,
  "companyId": "65afd23e1c23c8b9f9e8f111"
}
```

---

### ➤ **Get All Jobs Created by Recruiter**

**GET** `/job/getadminjobs`

---

### ➤ **Get All Jobs (Public)**

**GET** `/job/get`
Supports keyword search:

```
/job/get?keyword=frontend
```

---

### ➤ **Get Job by ID**

**GET** `/job/get/:id`

---

### ➤ **Delete Job**

**DELETE** `/job/delete/:id`

---

## APPLICATION API

### ➤ **Apply to a Job (Student)**

**GET** `/application/apply/:jobId`

---

### ➤ **Get All Applied Jobs of Student**

**GET** `/application/get`

---

### ➤ **Get Applicants of Specific Job (Recruiter)**

**GET** `/application/:id/applicants`

---

### ➤ **Update Application Status (Recruiter)**

**POST** `/application/status/:id/update`

#### Request Body (JSON)

```json
{
  "status": "Accepted"
}
```

---

