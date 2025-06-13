<!-- Based on your project files, here's a comprehensive analysis of your Real Estate Apartment Booking System:
🏗️ Project Architecture Overview
Technology Stack

Backend Framework: Express.js (Node.js)
Database: MongoDB with Mongoose ODM
Authentication: JWT (JSON Web Tokens) + bcryptjs for password hashing
File Upload: Multer for handling images
API Testing: Postman collection included
Module System: ES6 modules ("type": "module")


📋 Core Features & Functionality
1. User Management System

Registration: Supports both form-data and JSON formats
Authentication: JWT-based login/logout system
Role-Based Access: Three user types (tenant, owner, admin)
User Profiles: Avatar upload, national ID verification
Security: Password hashing, email validation, account status management

2. Apartment Listing System

CRUD Operations: Create, read, update, delete apartments
Rich Property Data: Title, description, price, bedrooms, bathrooms, square footage
Location Details: Address, city, town information
Property Features: Furnished status, floor number, featured listings
Listing Types: For rent, for sale, or both
Media Support: Multiple apartment images upload
Analytics: View tracking system

3. Search & Discovery

Saved Searches: Users can save search criteria
Filtering System: By price, location, features, etc.
Featured Listings: Highlight premium properties


🔐 Security & Authentication Architecture
Authentication Layers

Basic Authentication: Token verification middleware
Role-Based Authorization: Admin, owner, tenant permissions
Ownership Verification: Users can only access their own resources
Token Management: Multiple token extraction methods (headers, cookies, query)

Security Features

Password hashing with bcryptjs (salt rounds: 10)
JWT tokens with 7-day expiration
CORS configuration for cross-origin requests
File upload restrictions (images only, 5MB limit)
Input validation and sanitization
Production security headers


🗄️ Database Schema Design
User Schema -->
