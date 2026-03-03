
# Intelligent Employee Management Platform

## Overview
This project was developed as part of the 4TWIN – Engineering Program at **Esprit School of Engineering** (Academic Year 2025–2026).
It is a full-stack web application designed to help HR, managers, and employees manage profiles, activities, recommendations, and team collaboration efficiently.

## Features
- User authentication and role-based access (HR, Manager, Employee)
- Employee profile management
- Department management
- Activity tracking
- Recommendations system
- Team and user management (HR/Manager views)
- Import/export (Excel support)
- Responsive UI with dashboards for each role

## Tech Stack

### Frontend
- React.js (with TypeScript)
- Vite
- React Router
- MUI (Material UI)
- Axios
- Tailwind CSS

### Backend
- NestJS
- MongoDB (Mongoose)
- JWT Authentication
- RESTful API

## Architecture
- **Frontend**: SPA built with React, using role-based routing and modular layouts for HR, Manager, and Employee workspaces.
- **Backend**: Modular NestJS API with separate modules for users, departments, and authentication. Uses MongoDB for data storage and Mongoose for schema modeling.
- **Communication**: Frontend interacts with backend via REST API endpoints.

## Contributors
- Ahlem Bounasri
- Yasmine ben abdelali
- Malek Fridhi
- Zied Alimi
- Mohamed Nour Slimi

## Academic Context
Developed at **Esprit School of Engineering – Tunisia**
4TWIN | 2025–2026

## Getting Started
1. Clone the repository.
2. Install dependencies for both frontend and backend.
3. Configure environment variables (MongoDB URI, API URLs, etc.).
4. Run backend (`npm run start:dev` in backend folder).
5. Run frontend (`npm run dev` in frontend folder).
6. Access the app via your browser.

## Acknowledgments
- Special thanks to Esprit School of Engineering and all contributors.

