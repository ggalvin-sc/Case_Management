# Kimai Developer Manual
## Complete Guide to API, Database, and Integration

**Version:** 2.x
**Last Updated:** October 2025
**Working Directory:** C:\Users\gregg\OneDrive\Documents\_code\Case_Management_2025-10-6

### API Credentials

**API Token:** `00d1c3f02410b298ac3bc2624`

> **Security Note:** This token provides full access to your Kimai instance. Keep it secure and never commit to version control.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [REST API Overview](#2-rest-api-overview)
3. [Authentication](#3-authentication)
4. [Complete API Reference](#4-complete-api-reference)
5. [Database Schema](#5-database-schema)
6. [Permission System](#6-permission-system)
7. [Plugin Development](#7-plugin-development)
8. [Custom Fields / Meta Fields](#8-custom-fields--meta-fields)
9. [Code Examples](#9-code-examples)
10. [Integration Patterns](#10-integration-patterns)
11. [Error Handling](#11-error-handling)
12. [Best Practices](#12-best-practices)

---

## 1. Introduction

Kimai is a time-tracking application built on Symfony framework with a comprehensive REST API for programmatic interaction. This manual provides complete technical documentation for developers working with Kimai.

### Technology Stack

**Backend:**
- PHP 8.3+
- Symfony Framework
- Doctrine ORM
- FOSRestBundle for API
- Composer for dependencies

**Database:**
- MariaDB 11.1+ or MySQL 8.3+

**Frontend:**
- NodeJS
- Yarn
- Webpack Encore

**Development Tools:**
- PHPUnit (testing)
- PHPStan (static analysis)
- PHP-CS-Fixer (code style)

---

## 2. REST API Overview

### Base Configuration

**Protocol:** HTTPS (mandatory)
**Format:** JSON
**API Documentation Paths:**
- Local installation: `/api/doc`
- Demo instance: `https://demo.kimai.org/api/doc`
- OpenAPI specification available at `/api/doc`

### Data Format Standards

#### DateTime Format
- **Standard:** ISO 8601 with timezone offset
- **Example:** `2019-04-20T14:00:00`
- **Input Format:** HTML5 "local date and time" format
- **Always include timezone information**

#### Boolean Handling
- Optional boolean fields default to `false`
- **IMPORTANT:** Any non-false value (including `null`) is interpreted as `true`
- **Best Practice:** Always explicitly declare boolean values

Example:
```json
{
  "visible": true,
  "billable": false,
  "exported": false
}
```

#### Pagination

All collection endpoints support pagination with these parameters:

**Request Parameters:**
- `page`: Page number (default: 1)
- `size`: Records per page (default: 50, max varies by endpoint)

**Response Headers:**
```
X-Page: 1
X-Total-Count: 150
X-Total-Pages: 3
X-Per-Page: 50
```

**Example Request:**
```bash
GET /api/timesheets?page=2&size=100
```

---

## 3. Authentication

### API Token Authentication

Kimai uses Bearer Token authentication for all API requests.

#### Token Generation

1. Log into Kimai web interface
2. Navigate to user profile
3. Go to "API Tokens" section
4. Click "Create new token"
5. Provide optional name and expiration date
6. Copy generated token (shown only once)

#### Token Features

- **Unique per user** - Each user can have multiple tokens
- **Optional name** - For identifying token purpose
- **Optional expiration** - Set expiration date for security
- **Last usage tracking** - Monitor token activity
- **Revocable** - Delete tokens via API or web interface

#### Authorization Header

**Format:**
```
Authorization: Bearer {api_token}
```

**Example:**
```bash
curl -X GET "https://your-kimai.com/api/timesheets" \
  -H "Authorization: Bearer xyz123abc456def789"
```

#### Security Requirements

- ✅ Always use HTTPS
- ✅ Store tokens securely (environment variables, secrets management)
- ✅ Use separate tokens for different integrations
- ✅ Set expiration dates for production tokens
- ✅ Monitor token usage via "last usage" timestamp
- ❌ Never commit tokens to version control
- ❌ Never share tokens between users/applications

---

## 4. Complete API Reference

### 4.1 Timesheet Endpoints

**Base Path:** `/api/timesheets`

#### GET /timesheets

Fetch collection of timesheets with advanced filtering.

**Query Parameters:**

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `user` | int/string | Filter by user ID or 'all' | `123` or `all` |
| `users` | array | Multiple user IDs | `users[]=1&users[]=2` |
| `customer` | int | Filter by customer ID | `5` |
| `customers` | array | Multiple customer IDs | `customers[]=1&customers[]=2` |
| `project` | int | Filter by project ID | `10` |
| `projects` | array | Multiple project IDs | `projects[]=1&projects[]=2` |
| `activity` | int | Filter by activity ID | `15` |
| `activities` | array | Multiple activity IDs | `activities[]=1&activities[]=2` |
| `tags` | string | Comma-separated tag names | `meeting,development` |
| `begin` | datetime | Start date filter | `2025-01-01T00:00:00` |
| `end` | datetime | End date filter | `2025-12-31T23:59:59` |
| `exported` | bool | Filter by export status | `0` or `1` |
| `active` | bool | Filter running timers | `1` |
| `billable` | bool | Filter billable entries | `1` |
| `orderBy` | string | Sort field | `begin`, `end`, `duration` |
| `order` | string | Sort direction | `ASC` or `DESC` |
| `page` | int | Page number | `1` |
| `size` | int | Items per page | `50` |

**Response:**
```json
[
  {
    "id": 123,
    "begin": "2025-10-06T09:00:00",
    "end": "2025-10-06T17:00:00",
    "duration": 28800,
    "break": 3600,
    "description": "Development work",
    "rate": 240.00,
    "internalRate": 180.00,
    "hourlyRate": 30.00,
    "fixedRate": null,
    "user": 5,
    "activity": 10,
    "project": 3,
    "exported": false,
    "billable": true,
    "tags": ["development", "feature-x"],
    "metaFields": []
  }
]
```

#### GET /timesheets/{id}

Get single timesheet by ID.

**Path Parameters:**
- `id` (required): Timesheet ID

**Response:** Single timesheet object

#### POST /timesheets

Create new timesheet entry.

**Request Body:**
```json
{
  "begin": "2025-10-06T09:00:00",
  "end": "2025-10-06T17:00:00",
  "project": 3,
  "activity": 10,
  "description": "Working on feature X",
  "tags": "development,api",
  "billable": true
}
```

**Response:** Created timesheet object with ID

**Notes:**
- `end` is optional (creates running timer if omitted)
- `duration` calculated automatically
- User defaults to authenticated user
- Rate calculated from user/project/activity rates

#### PATCH /timesheets/{id}

Update existing timesheet.

**Path Parameters:**
- `id` (required): Timesheet ID

**Request Body:** (partial update supported)
```json
{
  "end": "2025-10-06T18:00:00",
  "description": "Updated description"
}
```

**Response:** Updated timesheet object

#### DELETE /timesheets/{id}

Delete timesheet entry.

**Path Parameters:**
- `id` (required): Timesheet ID

**Response:** 204 No Content

#### GET /timesheets/recent

Fetch recent activities for current user.

**Response:** Array of recent timesheet entries

#### GET /timesheets/active

Fetch all active (running) timesheets for current user.

**Response:** Array of active timesheet entries

#### GET|PATCH /timesheets/{id}/stop

Stop running timesheet.

**Path Parameters:**
- `id` (required): Timesheet ID

**Response:** Updated timesheet with `end` timestamp

#### GET|PATCH /timesheets/{id}/restart

Restart stopped timesheet.

**Path Parameters:**
- `id` (required): Timesheet ID

**Response:** New timesheet entry based on original

#### PATCH /timesheets/{id}/duplicate

Duplicate existing timesheet.

**Path Parameters:**
- `id` (required): Timesheet ID

**Response:** New timesheet object

#### PATCH /timesheets/{id}/export

Toggle export status.

**Path Parameters:**
- `id` (required): Timesheet ID

**Response:** Updated timesheet object

---

### 4.2 Customer Endpoints

**Base Path:** `/api/customers`

#### GET /customers

Fetch customers collection.

**Query Parameters:**

| Parameter | Type | Description | Values |
|-----------|------|-------------|--------|
| `visible` | int | Visibility filter | `1` (visible), `2` (hidden), `3` (both) |
| `order` | string | Sort direction | `ASC`, `DESC` |
| `orderBy` | string | Sort field | `id`, `name` |
| `term` | string | Search term | Any string |

**Response:**
```json
[
  {
    "id": 1,
    "name": "Acme Corporation",
    "number": "CUST-001",
    "comment": "Main client",
    "visible": true,
    "billable": true,
    "company": "Acme Corp",
    "vatId": "DE123456789",
    "contact": "John Doe",
    "address": "123 Main St\n12345 City",
    "country": "DE",
    "currency": "EUR",
    "phone": "+49 123 456789",
    "email": "contact@acme.com",
    "homepage": "https://acme.com",
    "timezone": "Europe/Berlin",
    "color": "#3498db",
    "budget": 50000.00,
    "timeBudget": 200
  }
]
```

#### GET /customers/{id}

Get single customer.

**Path Parameters:**
- `id` (required): Customer ID

#### POST /customers

Create new customer.

**Request Body:**
```json
{
  "name": "New Customer",
  "country": "US",
  "currency": "USD",
  "timezone": "America/New_York",
  "visible": true,
  "billable": true,
  "email": "info@newcustomer.com"
}
```

**Required Fields:**
- `name`
- `country` (ISO 3166-1 alpha-2 code)
- `currency` (ISO 4217 code)
- `timezone` (IANA timezone)

#### PATCH /customers/{id}

Update customer.

**Path Parameters:**
- `id` (required): Customer ID

**Request Body:** (partial update)
```json
{
  "name": "Updated Name",
  "visible": false
}
```

#### DELETE /customers/{id}

Delete customer.

**Path Parameters:**
- `id` (required): Customer ID

**WARNING:** Cascading delete - removes all associated projects, activities, and timesheets!

#### PATCH /customers/{id}/meta

Update customer meta field.

**Path Parameters:**
- `id` (required): Customer ID

**Query Parameters:**
- `name` (required): Meta field name
- `value` (required): Meta field value

#### GET /customers/{id}/rates

Get customer rate rules.

**Path Parameters:**
- `id` (required): Customer ID

**Response:**
```json
[
  {
    "id": 1,
    "rate": 75.00,
    "internalRate": 50.00,
    "isFixed": false,
    "user": null
  }
]
```

#### POST /customers/{id}/rates

Add rate rule to customer.

**Path Parameters:**
- `id` (required): Customer ID

**Request Body:**
```json
{
  "user": 5,
  "rate": 80.00,
  "internalRate": 60.00,
  "isFixed": false
}
```

#### DELETE /customers/{id}/rates/{rateId}

Delete customer rate.

**Path Parameters:**
- `id` (required): Customer ID
- `rateId` (required): Rate ID

---

### 4.3 Project Endpoints

**Base Path:** `/api/projects`

#### GET /projects

Fetch projects collection.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `customer` | int | Filter by customer ID |
| `customers` | array | Multiple customer IDs |
| `visible` | int | `1` (visible), `2` (hidden), `3` (both) |
| `start` | datetime | Project start date filter |
| `end` | datetime | Project end date filter |
| `ignoreDates` | bool | Ignore date filters |
| `globalActivities` | bool | Include projects with global activities |
| `order` | string | `ASC`, `DESC` |
| `orderBy` | string | Sort field |
| `term` | string | Search term |

**Response:**
```json
[
  {
    "id": 3,
    "customer": 1,
    "name": "Website Redesign",
    "orderNumber": "PRJ-2025-001",
    "orderDate": "2025-01-15T00:00:00",
    "start": "2025-02-01T00:00:00",
    "end": "2025-06-30T23:59:59",
    "timezone": "Europe/Berlin",
    "visible": true,
    "billable": true,
    "globalActivities": true,
    "color": "#2ecc71",
    "budget": 25000.00,
    "timeBudget": 100
  }
]
```

#### GET /projects/{id}

Get single project.

#### POST /projects

Create new project.

**Request Body:**
```json
{
  "customer": 1,
  "name": "New Project",
  "visible": true,
  "billable": true,
  "globalActivities": true
}
```

**Required Fields:**
- `customer` (Customer ID)
- `name`

#### PATCH /projects/{id}

Update project.

#### DELETE /projects/{id}

Delete project (cascades to activities and timesheets).

#### PATCH /projects/{id}/meta

Update project meta field.

#### GET /projects/{id}/rates

Get project rates.

#### POST /projects/{id}/rates

Add project rate.

#### DELETE /projects/{id}/rates/{rateId}

Delete project rate.

---

### 4.4 Activity Endpoints

**Base Path:** `/api/activities`

#### GET /activities

Fetch activities collection.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `project` | int | Filter by project ID |
| `projects` | array | Multiple project IDs |
| `visible` | int | `1`, `2`, `3` |
| `globals` | string | `true` for global activities |
| `orderBy` | string | Sort field |
| `order` | string | `ASC`, `DESC` |
| `term` | string | Search term |

**Response:**
```json
[
  {
    "id": 10,
    "project": 3,
    "name": "Development",
    "comment": "Software development tasks",
    "visible": true,
    "billable": true,
    "color": "#9b59b6",
    "budget": 10000.00,
    "timeBudget": 40
  }
]
```

**Global Activities:**
- Have `project: null`
- Available across all projects
- Query with `globals=true`

#### GET /activities/{id}

Get single activity.

#### POST /activities

Create new activity.

**Request Body:**
```json
{
  "name": "Code Review",
  "project": 3,
  "visible": true,
  "billable": true
}
```

**Note:** Omit `project` for global activity

#### PATCH /activities/{id}

Update activity.

#### DELETE /activities/{id}

Delete activity (cascades to timesheets).

#### PATCH /activities/{id}/meta

Update activity meta field.

#### GET /activities/{id}/rates

Get activity rates.

#### POST /activities/{id}/rates

Add activity rate.

#### DELETE /activities/{id}/rates/{rateId}

Delete activity rate.

---

### 4.5 User Endpoints

**Base Path:** `/api/users`

#### GET /users

Fetch users collection.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `visible` | int | `1`, `2`, `3` |
| `orderBy` | string | `id`, `username`, `alias`, `email` |
| `order` | string | `ASC`, `DESC` |
| `term` | string | Search term |
| `full` | bool | Include full user details |

**Response:**
```json
[
  {
    "id": 5,
    "username": "john.doe",
    "alias": "John",
    "title": "Senior Developer",
    "email": "john.doe@company.com",
    "enabled": true,
    "roles": ["ROLE_USER"],
    "language": "en",
    "timezone": "America/New_York"
  }
]
```

#### GET /users/{id}

Get single user.

#### GET /users/me

Get current authenticated user.

#### POST /users

Create new user.

**Request Body:**
```json
{
  "username": "jane.smith",
  "email": "jane.smith@company.com",
  "enabled": true,
  "roles": ["ROLE_USER"],
  "plainPassword": "SecurePassword123!"
}
```

**Required Fields:**
- `username`
- `email`
- `plainPassword`

#### PATCH /users/{id}

Update user.

**Request Body:**
```json
{
  "alias": "Jane",
  "enabled": false
}
```

#### DELETE /users/api-token/{id}

Delete API token.

**Path Parameters:**
- `id` (required): Token ID

#### PATCH /users/{id}/preferences

Update user preferences.

**Path Parameters:**
- `id` (required): User ID

**Request Body:**
```json
{
  "hourly_rate": 50.00,
  "skin": "dark",
  "language": "de"
}
```

---

### 4.6 Team Endpoints

**Base Path:** `/api/teams`

#### GET /teams

Fetch all teams.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Development Team",
    "color": "#3498db",
    "members": [
      {"id": 5, "username": "john.doe"},
      {"id": 7, "username": "jane.smith"}
    ]
  }
]
```

#### GET /teams/{id}

Get single team.

#### POST /teams

Create new team.

**Request Body:**
```json
{
  "name": "QA Team",
  "color": "#e74c3c"
}
```

#### PATCH /teams/{id}

Update team.

#### DELETE /teams/{id}

Delete team.

#### POST /teams/{id}/members/{userId}

Add user to team.

**Path Parameters:**
- `id` (required): Team ID
- `userId` (required): User ID

#### DELETE /teams/{id}/members/{userId}

Remove user from team.

#### POST /teams/{id}/customers/{customerId}

Grant team access to customer.

**Path Parameters:**
- `id` (required): Team ID
- `customerId` (required): Customer ID

#### DELETE /teams/{id}/customers/{customerId}

Revoke team access to customer.

#### POST /teams/{id}/projects/{projectId}

Grant team access to project.

#### DELETE /teams/{id}/projects/{projectId}

Revoke team access to project.

#### POST /teams/{id}/activities/{activityId}

Grant team access to activity.

#### DELETE /teams/{id}/activities/{activityId}

Revoke team access to activity.

---

### 4.7 Tag Endpoints

**Base Path:** `/api/tags`

#### GET /tags (deprecated)

Fetch tag names.

**Query Parameters:**
- `name`: Search term

**Response:**
```json
["development", "meeting", "support"]
```

#### GET /tags/find

Find full tag entities.

**Query Parameters:**
- `name`: Search term

**Response:**
```json
[
  {
    "id": 1,
    "name": "development",
    "color": "#3498db"
  }
]
```

#### POST /tags

Create new tag.

**Request Body:**
```json
{
  "name": "urgent",
  "color": "#e74c3c"
}
```

#### DELETE /tags/{id}

Delete tag.

**Path Parameters:**
- `id` (required): Tag ID

---

### 4.8 Configuration Endpoints

#### GET /config/timesheet

Get timesheet configuration.

**Response:**
```json
{
  "trackingMode": "default",
  "defaultBeginTime": "now",
  "activeEntriesHardLimit": 1,
  "isAllowFutureTimes": false,
  "isAllowOverlapping": false
}
```

#### GET /config/colors

Get system color configuration.

**Response:**
```json
{
  "primary": "#3498db",
  "success": "#27ae60",
  "warning": "#f39c12",
  "danger": "#e74c3c"
}
```

---

### 4.9 Status Endpoints

#### GET /ping

Health check endpoint.

**Response:**
```json
{
  "message": "pong"
}
```

#### GET /version

Get Kimai version information.

**Response:**
```json
{
  "version": "2.0.0",
  "candidate": "",
  "name": "Kimai",
  "copyright": "Kimai Team"
}
```

#### GET /plugins

List installed plugins.

**Response:**
```json
[
  {
    "name": "ExpenseBundle",
    "version": "2.0"
  },
  {
    "name": "InvoiceBundle",
    "version": "2.0"
  }
]
```

---

## 5. Database Schema

### 5.1 Entity Relationship Diagram

```
┌─────────────┐
│   Customer  │
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐
│   Project   │
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐       ┌──────────┐
│  Activity   │       │   User   │
└──────┬──────┘       └────┬─────┘
       │ 1:N               │ 1:N
       └────────┬──────────┘
                ▼
         ┌────────────┐
         │ Timesheet  │
         └────────────┘
              │ M:N
              ▼
         ┌────────┐
         │  Tag   │
         └────────┘
```

---

### 5.2 Core Tables

#### kimai2_users

Primary table for user accounts.

```sql
CREATE TABLE kimai2_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(180) NOT NULL UNIQUE,
    email VARCHAR(180) NOT NULL UNIQUE,
    alias VARCHAR(60),
    title VARCHAR(50),
    accountNumber VARCHAR(30),
    password VARCHAR(255) NOT NULL,
    apiToken VARCHAR(255),
    confirmationToken VARCHAR(255),
    totpSecret VARCHAR(255),
    totpEnabled TINYINT(1) DEFAULT 0,
    enabled TINYINT(1) DEFAULT 1,
    systemAccount TINYINT(1) DEFAULT 0,
    registeredAt DATETIME NOT NULL,
    lastLogin DATETIME,
    roles JSON NOT NULL,
    UNIQUE INDEX username_idx (username),
    UNIQUE INDEX email_idx (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Fields:**
- `id`: Primary key
- `username`: Unique login name
- `email`: Unique email address
- `alias`: Display name
- `apiToken`: Current API token (deprecated, use kimai2_user_auth_tokens)
- `roles`: JSON array of role names (e.g., `["ROLE_USER","ROLE_ADMIN"]`)
- `enabled`: Account active status
- `systemAccount`: System-generated account flag

---

#### kimai2_customers

Customer/client management table.

```sql
CREATE TABLE kimai2_customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    number VARCHAR(50),
    comment TEXT,
    visible TINYINT(1) DEFAULT 1,
    billable TINYINT(1) DEFAULT 1,
    company VARCHAR(100),
    vatId VARCHAR(50),
    contact VARCHAR(100),
    address TEXT,
    country VARCHAR(2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    phone VARCHAR(30),
    fax VARCHAR(30),
    mobile VARCHAR(30),
    email VARCHAR(75),
    homepage VARCHAR(100),
    timezone VARCHAR(64) NOT NULL,
    color VARCHAR(7),
    budget DECIMAL(10,2),
    timeBudget INT,
    invoice_template_id INT,
    INDEX customer_visible (visible),
    INDEX customer_country (country),
    FOREIGN KEY (invoice_template_id) REFERENCES kimai2_invoice_templates(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Fields:**
- `country`: ISO 3166-1 alpha-2 code (e.g., "US", "DE")
- `currency`: ISO 4217 code (e.g., "USD", "EUR")
- `timezone`: IANA timezone (e.g., "America/New_York")
- `budget`: Monetary budget limit
- `timeBudget`: Time budget in seconds
- `color`: Hex color code

---

#### kimai2_projects

Project management table.

```sql
CREATE TABLE kimai2_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    orderNumber VARCHAR(50),
    orderDate DATETIME,
    start DATETIME,
    end DATETIME,
    timezone VARCHAR(64),
    visible TINYINT(1) DEFAULT 1,
    billable TINYINT(1) DEFAULT 1,
    globalActivities TINYINT(1) DEFAULT 1,
    number VARCHAR(10),
    color VARCHAR(7),
    budget DECIMAL(10,2),
    timeBudget INT,
    invoice_template_id INT,
    INDEX project_customer (customer_id),
    INDEX project_visible (visible),
    INDEX project_dates (start, end),
    FOREIGN KEY (customer_id) REFERENCES kimai2_customers(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_template_id) REFERENCES kimai2_invoice_templates(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Fields:**
- `customer_id`: Foreign key to kimai2_customers (CASCADE DELETE)
- `globalActivities`: Whether global activities are available for this project
- `start`/`end`: Project timeline
- `timezone`: Overrides customer timezone if set

---

#### kimai2_activities

Activity/task definition table.

```sql
CREATE TABLE kimai2_activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    name VARCHAR(150) NOT NULL,
    comment TEXT,
    visible TINYINT(1) DEFAULT 1,
    billable TINYINT(1) DEFAULT 1,
    invoiceText TEXT,
    number VARCHAR(10),
    color VARCHAR(7),
    budget DECIMAL(10,2),
    timeBudget INT,
    INDEX activity_project (project_id),
    INDEX activity_visible (visible),
    FOREIGN KEY (project_id) REFERENCES kimai2_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Fields:**
- `project_id`: Foreign key to kimai2_projects (NULL for global activities)
- **Global Activities:** When `project_id IS NULL`, activity is available across all projects
- `invoiceText`: Custom text for invoice generation

---

#### kimai2_timesheet

Core time tracking table.

```sql
CREATE TABLE kimai2_timesheet (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user INT NOT NULL,
    activity_id INT,
    project_id INT,
    date DATE NOT NULL,
    begin DATETIME NOT NULL,
    end DATETIME,
    timezone VARCHAR(64) NOT NULL,
    duration INT DEFAULT 0,
    break INT DEFAULT 0,
    description TEXT,
    rate DECIMAL(10,2) DEFAULT 0,
    internalRate DECIMAL(10,2) DEFAULT 0,
    fixedRate DECIMAL(10,2),
    hourlyRate DECIMAL(10,2),
    exported TINYINT(1) DEFAULT 0,
    billable TINYINT(1) DEFAULT 1,
    billableMode VARCHAR(20),
    category VARCHAR(20),
    modified_at DATETIME,
    INDEX timesheet_user (user),
    INDEX timesheet_activity (activity_id),
    INDEX timesheet_project (project_id),
    INDEX timesheet_dates (begin, end),
    INDEX timesheet_exported (exported),
    FOREIGN KEY (user) REFERENCES kimai2_users(id) ON DELETE CASCADE,
    FOREIGN KEY (activity_id) REFERENCES kimai2_activities(id),
    FOREIGN KEY (project_id) REFERENCES kimai2_projects(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Fields:**
- `duration`: Total time in seconds
- `break`: Break time in seconds
- `rate`: Calculated billable rate (total earnings)
- `internalRate`: Internal cost rate
- `hourlyRate`: Hourly rate used for calculation
- `fixedRate`: Fixed rate override
- `end`: NULL for running timers
- `exported`: Invoice export status
- `billableMode`: Custom billing mode

**Rate Calculation Hierarchy:**
1. Fixed rate (if set)
2. Activity rate
3. Project rate
4. Customer rate
5. User hourly rate

---

#### kimai2_teams

Team management table.

```sql
CREATE TABLE kimai2_teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7),
    UNIQUE INDEX team_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### kimai2_teams_users

Team membership junction table.

```sql
CREATE TABLE kimai2_teams_users (
    team_id INT NOT NULL,
    user_id INT NOT NULL,
    teamlead TINYINT(1) DEFAULT 0,
    PRIMARY KEY (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES kimai2_teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES kimai2_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Key Fields:**
- `teamlead`: Whether user is team leader (additional permissions)

---

#### kimai2_tags

Tag definition table.

```sql
CREATE TABLE kimai2_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7),
    UNIQUE INDEX tag_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### kimai2_timesheet_tags

Timesheet-tag relationship (many-to-many).

```sql
CREATE TABLE kimai2_timesheet_tags (
    timesheet_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (timesheet_id, tag_id),
    FOREIGN KEY (timesheet_id) REFERENCES kimai2_timesheet(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES kimai2_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### kimai2_user_preferences

User preference storage (key-value pairs).

```sql
CREATE TABLE kimai2_user_preferences (
    user_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    value TEXT,
    PRIMARY KEY (user_id, name),
    FOREIGN KEY (user_id) REFERENCES kimai2_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Common Preference Keys:**
- `hourly_rate`: User's default hourly rate
- `timezone`: User timezone override
- `language`: UI language preference
- `skin`: Theme preference
- `calendar_initial_view`: Calendar default view

---

#### kimai2_customers_rates

Customer-specific rate rules.

```sql
CREATE TABLE kimai2_customers_rates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    user_id INT,
    rate DECIMAL(10,2) NOT NULL,
    internal_rate DECIMAL(10,2),
    fixed_rate DECIMAL(10,2),
    is_fixed TINYINT(1) DEFAULT 0,
    INDEX customer_rate_customer (customer_id),
    INDEX customer_rate_user (user_id),
    FOREIGN KEY (customer_id) REFERENCES kimai2_customers(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES kimai2_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Rate Hierarchy:**
- If `user_id` is set, rate applies only to that user
- If `user_id` is NULL, rate applies to all users
- `is_fixed`: Whether this is a fixed rate (not hourly)

**Similar tables exist for:**
- `kimai2_projects_rates`
- `kimai2_activities_rates`

---

#### kimai2_customers_meta

Customer custom fields.

```sql
CREATE TABLE kimai2_customers_meta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    value TEXT,
    visible TINYINT(1) DEFAULT 0,
    INDEX customer_meta_customer (customer_id),
    FOREIGN KEY (customer_id) REFERENCES kimai2_customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Similar meta tables exist for:**
- `kimai2_projects_meta`
- `kimai2_activities_meta`
- `kimai2_timesheet_meta`

---

### 5.3 Common SQL Queries

#### Get all timesheets with full context

```sql
SELECT
    t.id,
    t.begin,
    t.end,
    t.duration,
    t.description,
    t.rate,
    u.username,
    u.alias AS user_alias,
    c.name AS customer_name,
    p.name AS project_name,
    a.name AS activity_name
FROM kimai2_timesheet t
LEFT JOIN kimai2_users u ON t.user = u.id
LEFT JOIN kimai2_projects p ON t.project_id = p.id
LEFT JOIN kimai2_customers c ON p.customer_id = c.id
LEFT JOIN kimai2_activities a ON t.activity_id = a.id
WHERE t.exported = 0
ORDER BY t.begin DESC;
```

#### Get user total hours by project

```sql
SELECT
    u.username,
    p.name AS project_name,
    SUM(t.duration) / 3600 AS total_hours,
    SUM(t.rate) AS total_earnings
FROM kimai2_timesheet t
JOIN kimai2_users u ON t.user = u.id
JOIN kimai2_projects p ON t.project_id = p.id
WHERE t.begin >= '2025-01-01'
  AND t.end IS NOT NULL
GROUP BY u.id, p.id
ORDER BY total_hours DESC;
```

#### Find timesheets without rates

```sql
SELECT
    t.id,
    t.description,
    t.duration,
    u.username
FROM kimai2_timesheet t
JOIN kimai2_users u ON t.user = u.id
WHERE (t.hourlyRate IS NULL OR t.hourlyRate = 0)
  AND t.end IS NOT NULL;
```

#### Get active (running) timers

```sql
SELECT
    t.id,
    t.begin,
    u.username,
    p.name AS project,
    a.name AS activity
FROM kimai2_timesheet t
JOIN kimai2_users u ON t.user = u.id
LEFT JOIN kimai2_projects p ON t.project_id = p.id
LEFT JOIN kimai2_activities a ON t.activity_id = a.id
WHERE t.end IS NULL;
```

#### Get customer project overview

```sql
SELECT
    c.name AS customer,
    COUNT(DISTINCT p.id) AS total_projects,
    COUNT(t.id) AS total_timesheets,
    SUM(t.duration) / 3600 AS total_hours,
    SUM(t.rate) AS total_revenue
FROM kimai2_customers c
LEFT JOIN kimai2_projects p ON c.id = p.customer_id
LEFT JOIN kimai2_timesheet t ON p.id = t.project_id
GROUP BY c.id
ORDER BY total_revenue DESC;
```

#### Get user hourly rates

```sql
SELECT
    u.username,
    up.value AS hourly_rate
FROM kimai2_users u
LEFT JOIN kimai2_user_preferences up
    ON u.id = up.user_id
    AND up.name = 'hourly_rate'
WHERE u.enabled = 1
ORDER BY u.username;
```

#### Find overlapping timesheets

```sql
SELECT
    t1.id AS timesheet1_id,
    t2.id AS timesheet2_id,
    t1.user,
    t1.begin AS begin1,
    t1.end AS end1,
    t2.begin AS begin2,
    t2.end AS end2
FROM kimai2_timesheet t1
JOIN kimai2_timesheet t2
    ON t1.user = t2.user
    AND t1.id < t2.id
WHERE t1.end IS NOT NULL
  AND t2.end IS NOT NULL
  AND t1.begin < t2.end
  AND t2.begin < t1.end;
```

---

## 6. Permission System

### 6.1 Role Hierarchy

```
ROLE_USER (base role for all authenticated users)
  ↓
ROLE_TEAMLEAD (team management permissions)
  ↓
ROLE_ADMIN (content and data management)
  ↓
ROLE_SUPER_ADMIN (full system control)
```

**Role Inheritance:**
- Higher roles inherit all permissions from lower roles
- Users can have multiple roles simultaneously
- Custom roles must start with `ROLE_` prefix in uppercase

---

### 6.2 Permission Configuration

Kimai uses three-level permission configuration:

**1. Permission Sets** - Grouped permissions
```yaml
permissions:
  sets:
    TIMESHEET:
      - 'view_own_timesheet'
      - 'start_own_timesheet'
      - 'stop_own_timesheet'
    ACTIVITY:
      - 'view_activity'
      - 'create_activity'
```

**2. Permission Maps** - Assign sets to roles
```yaml
  maps:
    ROLE_USER:
      - 'TIMESHEET'
      - 'ACTIVITY'
    ROLE_ADMIN:
      - 'TIMESHEET'
      - 'ACTIVITY'
```

**3. Individual Permissions** - Direct role assignments
```yaml
  roles:
    ROLE_USER:
      - 'my_profile'
    ROLE_ADMIN:
      - 'delete_activity'
      - 'system_configuration'
```

---

### 6.3 Complete Permission List

#### Timesheet Permissions

| Permission | Description | Default Roles |
|------------|-------------|---------------|
| `view_own_timesheet` | View own time records | USER |
| `view_other_timesheet` | View others' time records | TEAMLEAD |
| `create_own_timesheet` | Create own time records | USER |
| `create_other_timesheet` | Create time records for others | ADMIN |
| `edit_own_timesheet` | Edit own time records | USER |
| `edit_other_timesheet` | Edit others' time records | TEAMLEAD |
| `delete_own_timesheet` | Delete own time records | USER |
| `delete_other_timesheet` | Delete others' time records | ADMIN |
| `start_own_timesheet` | Start timer for own records | USER |
| `start_other_timesheet` | Start timer for others | ADMIN |
| `stop_own_timesheet` | Stop own timer | USER |
| `stop_other_timesheet` | Stop others' timer | TEAMLEAD |
| `export_own_timesheet` | Export own time records | USER |
| `export_other_timesheet` | Export others' records | TEAMLEAD |
| `view_rate_own_timesheet` | View own rates | USER |
| `view_rate_other_timesheet` | View others' rates | ADMIN |
| `edit_rate_own_timesheet` | Edit own rates | ADMIN |
| `edit_rate_other_timesheet` | Edit others' rates | ADMIN |

#### Customer Permissions

| Permission | Description | Default Roles |
|------------|-------------|---------------|
| `view_customer` | View customers | USER |
| `create_customer` | Create customers | ADMIN |
| `edit_customer` | Edit customers | ADMIN |
| `delete_customer` | Delete customers (cascades!) | ADMIN |
| `budget_customer` | View/edit customer budgets | ADMIN |
| `time_customer` | View customer time statistics | TEAMLEAD |
| `details_customer` | View full customer details | ADMIN |

#### Project Permissions

| Permission | Description | Default Roles |
|------------|-------------|---------------|
| `view_project` | View projects | USER |
| `create_project` | Create projects | ADMIN |
| `edit_project` | Edit projects | ADMIN |
| `delete_project` | Delete projects (cascades!) | ADMIN |
| `budget_project` | View/edit project budgets | ADMIN |
| `time_project` | View project time statistics | TEAMLEAD |
| `details_project` | View full project details | ADMIN |

#### Activity Permissions

| Permission | Description | Default Roles |
|------------|-------------|---------------|
| `view_activity` | View activities | USER |
| `create_activity` | Create activities | ADMIN |
| `edit_activity` | Edit activities | ADMIN |
| `delete_activity` | Delete activities (cascades!) | ADMIN |
| `budget_activity` | View/edit activity budgets | ADMIN |
| `time_activity` | View activity time statistics | TEAMLEAD |
| `details_activity` | View full activity details | ADMIN |

#### User Permissions

| Permission | Description | Default Roles |
|------------|-------------|---------------|
| `view_user` | View users | TEAMLEAD |
| `create_user` | Create users | SUPER_ADMIN |
| `edit_user` | Edit users | SUPER_ADMIN |
| `delete_user` | Delete users | SUPER_ADMIN |
| `roles_user` | Change user roles | SUPER_ADMIN |
| `preferences_user` | Edit user preferences | ADMIN |
| `password_user` | Change user passwords | SUPER_ADMIN |
| `api-token_user` | Manage API tokens | USER (own) / SUPER_ADMIN (all) |

#### Team Permissions

| Permission | Description | Default Roles |
|------------|-------------|---------------|
| `view_team` | View teams | USER |
| `create_team` | Create teams | ADMIN |
| `edit_team` | Edit teams | TEAMLEAD (own) / ADMIN (all) |
| `delete_team` | Delete teams | ADMIN |
| `view_team_member` | View team members | TEAMLEAD |
| `edit_team_member` | Edit team members | TEAMLEAD |
| `view_teamlead` | View team leads | ADMIN |
| `edit_teamlead` | Edit team leads | ADMIN |

#### Tag Permissions

| Permission | Description | Default Roles |
|------------|-------------|---------------|
| `manage_tag` | Full tag management | ADMIN |
| `create_tag` | Create new tags | USER |
| `delete_tag` | Delete tags | ADMIN |

#### Invoice & Export Permissions

| Permission | Description | Default Roles |
|------------|-------------|---------------|
| `view_invoice` | View invoices | TEAMLEAD |
| `create_invoice` | Create invoices | TEAMLEAD |
| `manage_invoice_template` | Manage invoice templates | ADMIN |
| `view_export` | View exports | TEAMLEAD |
| `create_export` | Create exports | TEAMLEAD |

#### System Permissions

| Permission | Description | Default Roles |
|------------|-------------|---------------|
| `system_configuration` | Edit system config | SUPER_ADMIN |
| `system_information` | View system info | SUPER_ADMIN |
| `plugins` | Manage plugins | SUPER_ADMIN |
| `view_reporting` | View reports | TEAMLEAD |
| `view_all_data` | View all organization data | ADMIN |
| `lockdown_grace_timesheet` | Edit after grace period | ADMIN |
| `lockdown_override_timesheet` | Override lockdown rules | ADMIN |

#### API Permission

| Permission | Description | Default Roles |
|------------|-------------|---------------|
| `API` | General API access | None (must be explicitly granted) |

**IMPORTANT:** The `API` permission must be explicitly granted to users who need API access!

---

### 6.4 Custom Roles

Create custom roles by adding to configuration:

```yaml
kimai:
  permissions:
    roles:
      ROLE_CONTRACTOR:
        - view_own_timesheet
        - create_own_timesheet
        - view_project
        - view_activity
      ROLE_CLIENT:
        - view_reporting
        - view_invoice
```

**Custom Role Requirements:**
- Must start with `ROLE_` prefix
- Must be UPPERCASE
- Can inherit from existing roles
- Assign permissions individually

---

### 6.5 Team-Based Permissions

Teams provide additional access control layer:

**Team Access Model:**
1. User is member of Team A
2. Team A has access to Customer X, Project Y
3. User can only see/track time for Project Y
4. Even with proper permissions, users need team assignment

**Team Permission Flow:**
```
User Permission → Team Membership → Resource Access
```

**Example:**
- User has `view_project` permission
- User is NOT in any team assigned to Project X
- User CANNOT see Project X
- Admin assigns user's team to Project X
- User CAN NOW see Project X

---

## 7. Plugin Development

### 7.1 Plugin Structure

```
var/plugins/YourBundle/
├── YourBundle.php                    # Bundle entry point
├── composer.json                     # Plugin metadata
├── DependencyInjection/
│   └── YourExtension.php            # Service configuration
├── Resources/
│   ├── config/
│   │   ├── services.yaml            # Service definitions
│   │   └── routes.yaml              # Route definitions (auto-discovered)
│   ├── translations/                # i18n files
│   └── views/                       # Twig templates
├── Controller/                      # Controller classes
├── Entity/                          # Custom entities
├── Repository/                      # Doctrine repositories
├── EventSubscriber/                 # Event listeners
└── API/                            # API controllers
```

---

### 7.2 Required Files

#### YourBundle.php

```php
<?php

namespace KimaiPlugin\YourBundle;

use App\Plugin\PluginInterface;
use Symfony\Component\HttpKernel\Bundle\Bundle;

class YourBundle extends Bundle implements PluginInterface
{
    /**
     * Return plugin version number
     */
    public function getVersion(): string
    {
        return '1.0.0';
    }
}
```

#### composer.json

```json
{
    "name": "your-vendor/your-bundle",
    "description": "Description of your Kimai plugin",
    "type": "kimai-plugin",
    "license": "MIT",
    "require": {
        "kimai/kimai2-composer": "^2.0"
    },
    "autoload": {
        "psr-4": {
            "KimaiPlugin\\YourBundle\\": ""
        }
    },
    "extra": {
        "kimai": {
            "require": 20000,
            "name": "Your Bundle Display Name",
            "description": "Short description shown in plugin list"
        }
    }
}
```

**Important `extra.kimai` fields:**
- `require`: Minimum Kimai version (e.g., 20000 = v2.0.0)
- `name`: Display name in admin panel
- `description`: Short description for plugin list

---

### 7.3 Service Configuration

#### Resources/config/services.yaml

```yaml
services:
    _defaults:
        autowire: true
        autoconfigure: true
        public: false

    KimaiPlugin\YourBundle\:
        resource: '../../*'
        exclude: '../../{Resources,Tests}'

    # Example: Custom event subscriber
    KimaiPlugin\YourBundle\EventSubscriber\MenuSubscriber:
        tags:
            - { name: kernel.event_subscriber }

    # Example: Custom repository
    KimaiPlugin\YourBundle\Repository\CustomRepository:
        class: KimaiPlugin\YourBundle\Repository\CustomRepository
        factory: ['@doctrine', getRepository]
        arguments:
            - KimaiPlugin\YourBundle\Entity\CustomEntity
```

---

### 7.4 Extension Points

#### Menu Integration

Add items to navigation menu:

```php
<?php

namespace KimaiPlugin\YourBundle\EventSubscriber;

use App\Event\ConfigureMainMenuEvent;
use KevinPapst\AdminLTEBundle\Event\MenuEvent;
use KevinPapst\AdminLTEBundle\Model\MenuItemModel;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class MenuSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            ConfigureMainMenuEvent::class => ['onMenuConfigure', 100],
        ];
    }

    public function onMenuConfigure(MenuEvent $event): void
    {
        $menu = new MenuItemModel(
            'your_menu_id',
            'Your Menu Label',
            'your_route_name',
            [],
            'fas fa-icon'
        );

        $event->addItem($menu);
    }
}
```

#### Dashboard Widgets

Create custom dashboard widgets:

```php
<?php

namespace KimaiPlugin\YourBundle\Widget;

use App\Widget\Type\AbstractWidgetType;

class CustomWidget extends AbstractWidgetType
{
    public function getId(): string
    {
        return 'custom_widget';
    }

    public function getData(array $options = []): mixed
    {
        // Return widget data
        return ['count' => 42];
    }

    public function getOptions(array $options = []): array
    {
        return array_merge([
            'title' => 'Custom Widget',
            'icon' => 'fas fa-chart-bar',
        ], $options);
    }

    public function getTemplateName(): string
    {
        return '@YourBundle/widget/custom.html.twig';
    }
}
```

#### Custom API Endpoints

Extend the API with new endpoints:

```php
<?php

namespace KimaiPlugin\YourBundle\API;

use FOS\RestBundle\Controller\Annotations as Rest;
use FOS\RestBundle\View\View;
use FOS\RestBundle\View\ViewHandlerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/api")
 */
class CustomController
{
    private ViewHandlerInterface $viewHandler;

    public function __construct(ViewHandlerInterface $viewHandler)
    {
        $this->viewHandler = $viewHandler;
    }

    /**
     * @Rest\Get("/custom")
     */
    public function getCustomData(Request $request): Response
    {
        $data = ['message' => 'Hello from custom API!'];

        $view = new View($data, 200);

        return $this->viewHandler->handle($view);
    }

    /**
     * @Rest\Post("/custom")
     */
    public function createCustomData(Request $request): Response
    {
        // Handle POST request
        $data = json_decode($request->getContent(), true);

        // Process and save data...

        $view = new View(['id' => 123], 201);

        return $this->viewHandler->handle($view);
    }
}
```

#### Custom Entities

Create new database entities:

```php
<?php

namespace KimaiPlugin\YourBundle\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * @ORM\Entity(repositoryClass="KimaiPlugin\YourBundle\Repository\CustomRepository")
 * @ORM\Table(name="kimai2_your_custom_table")
 */
class CustomEntity
{
    /**
     * @ORM\Id
     * @ORM\GeneratedValue
     * @ORM\Column(type="integer")
     */
    private ?int $id = null;

    /**
     * @ORM\Column(type="string", length=100)
     */
    private ?string $name = null;

    /**
     * @ORM\ManyToOne(targetEntity="App\Entity\User")
     * @ORM\JoinColumn(onDelete="CASCADE")
     */
    private $user;

    // Getters and setters...
}
```

#### Event Subscribers

Hook into Kimai events:

```php
<?php

namespace KimaiPlugin\YourBundle\EventSubscriber;

use App\Event\TimesheetMetaDisplayEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Form\Extension\Core\Type\TextType;

class TimesheetSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            TimesheetMetaDisplayEvent::class => ['onMetaDisplay', 100],
        ];
    }

    public function onMetaDisplay(TimesheetMetaDisplayEvent $event): void
    {
        // Add custom field to timesheet form
        $event->addField('location', TextType::class, [
            'label' => 'Working Location',
            'required' => false,
        ]);
    }
}
```

---

### 7.5 Database Migrations

Create migrations for plugin tables:

```bash
bin/console doctrine:migrations:generate
```

Example migration:

```php
<?php

namespace KimaiPlugin\YourBundle\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20251006000001 extends AbstractMigration
{
    public function up(Schema $schema): void
    {
        $table = $schema->createTable('kimai2_your_custom_table');
        $table->addColumn('id', 'integer', ['autoincrement' => true]);
        $table->addColumn('name', 'string', ['length' => 100]);
        $table->addColumn('user_id', 'integer');
        $table->setPrimaryKey(['id']);
        $table->addForeignKeyConstraint(
            'kimai2_users',
            ['user_id'],
            ['id'],
            ['onDelete' => 'CASCADE']
        );
    }

    public function down(Schema $schema): void
    {
        $schema->dropTable('kimai2_your_custom_table');
    }
}
```

---

## 8. Custom Fields / Meta Fields

### 8.1 Supported Entities

Meta fields can be added to:
- Customer
- Project
- Activity
- Timesheet
- User (via UserPreference)
- Invoice

---

### 8.2 Meta Field Configuration

Configure custom fields via event subscribers:

```php
<?php

namespace KimaiPlugin\YourBundle\EventSubscriber;

use App\Entity\MetaTableTypeInterface;
use App\Event\CustomerMetaDefinitionEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Form\Extension\Core\Type\TextType;

class MetaFieldSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            CustomerMetaDefinitionEvent::class => ['onCustomerMetaDefinition', 100],
        ];
    }

    public function onCustomerMetaDefinition(CustomerMetaDefinitionEvent $event): void
    {
        // Text field
        $event
            ->getEntity()
            ->setMetaField(
                (new MetaTableTypeInterface())
                    ->setName('account_manager')
                    ->setLabel('Account Manager')
                    ->setType(TextType::class)
                    ->setIsVisible(true)
            );

        // Choice field
        $event
            ->getEntity()
            ->setMetaField(
                (new MetaTableTypeInterface())
                    ->setName('industry')
                    ->setLabel('Industry')
                    ->setType(ChoiceType::class)
                    ->setOptions([
                        'choices' => [
                            'Technology' => 'tech',
                            'Finance' => 'finance',
                            'Healthcare' => 'healthcare',
                        ]
                    ])
                    ->setIsVisible(true)
            );
    }
}
```

---

### 8.3 Available Form Types

Any Symfony form type can be used:

```php
use Symfony\Component\Form\Extension\Core\Type\{
    TextType,
    TextareaType,
    EmailType,
    UrlType,
    NumberType,
    IntegerType,
    MoneyType,
    PercentType,
    ChoiceType,
    CountryType,
    CurrencyType,
    DateType,
    DateTimeType,
    TimeType,
    CheckboxType,
    ColorType
};
```

---

### 8.4 Meta Field Visibility

Control where custom fields appear:

```php
$definition
    ->setIsVisible(true)      // Show in forms
    ->setIsRequired(false)    // Require value
    ->setIsInline(true);      // Show inline (not in accordion)
```

**Visibility Contexts:**
- Forms (create/edit)
- Detail pages
- Lists/datatables
- API responses
- Exports

---

### 8.5 Accessing Meta Fields via API

**Get entity with meta fields:**
```bash
GET /api/customers/1
```

**Response includes meta:**
```json
{
  "id": 1,
  "name": "Acme Corp",
  "metaFields": [
    {
      "name": "account_manager",
      "value": "John Doe"
    },
    {
      "name": "industry",
      "value": "tech"
    }
  ]
}
```

**Update meta field:**
```bash
PATCH /api/customers/1/meta?name=account_manager&value=Jane%20Smith
```

---

## 9. Code Examples

### 9.1 PHP Examples

#### Using Guzzle HTTP Client

```php
<?php

require 'vendor/autoload.php';

use GuzzleHttp\Client;

class KimaiAPI
{
    private Client $client;

    public function __construct(string $baseUrl, string $apiToken)
    {
        $this->client = new Client([
            'base_uri' => $baseUrl,
            'headers' => [
                'Authorization' => "Bearer {$apiToken}",
                'Content-Type' => 'application/json',
            ],
        ]);
    }

    /**
     * Get all timesheets for a user
     */
    public function getTimesheets(int $userId, ?string $begin = null, ?string $end = null): array
    {
        $query = ['user' => $userId];

        if ($begin) $query['begin'] = $begin;
        if ($end) $query['end'] = $end;

        $response = $this->client->get('/api/timesheets', ['query' => $query]);

        return json_decode($response->getBody(), true);
    }

    /**
     * Create a timesheet entry
     */
    public function createTimesheet(array $data): array
    {
        $response = $this->client->post('/api/timesheets', [
            'json' => $data,
        ]);

        return json_decode($response->getBody(), true);
    }

    /**
     * Stop a running timer
     */
    public function stopTimesheet(int $id): array
    {
        $response = $this->client->patch("/api/timesheets/{$id}/stop");

        return json_decode($response->getBody(), true);
    }

    /**
     * Get all customers
     */
    public function getCustomers(): array
    {
        $response = $this->client->get('/api/customers', [
            'query' => ['visible' => 3], // Both visible and hidden
        ]);

        return json_decode($response->getBody(), true);
    }

    /**
     * Create customer with meta fields
     */
    public function createCustomer(string $name, array $meta = []): array
    {
        $data = [
            'name' => $name,
            'country' => 'US',
            'currency' => 'USD',
            'timezone' => 'America/New_York',
        ];

        $response = $this->client->post('/api/customers', ['json' => $data]);
        $customer = json_decode($response->getBody(), true);

        // Add meta fields
        foreach ($meta as $field => $value) {
            $this->client->patch("/api/customers/{$customer['id']}/meta", [
                'query' => [
                    'name' => $field,
                    'value' => $value,
                ],
            ]);
        }

        return $customer;
    }
}

// Usage
$api = new KimaiAPI('https://your-kimai.com', 'your_api_token');

// Get timesheets
$timesheets = $api->getTimesheets(5, '2025-10-01T00:00:00', '2025-10-31T23:59:59');
print_r($timesheets);

// Create timesheet
$timesheet = $api->createTimesheet([
    'begin' => '2025-10-06T09:00:00',
    'project' => 3,
    'activity' => 10,
    'description' => 'API integration development',
]);
print_r($timesheet);

// Stop timer
$stopped = $api->stopTimesheet($timesheet['id']);
print_r($stopped);

// Create customer with meta
$customer = $api->createCustomer('New Client LLC', [
    'account_manager' => 'John Doe',
    'industry' => 'tech',
]);
print_r($customer);
```

---

### 9.2 JavaScript/TypeScript Examples

#### Using Fetch API

```javascript
class KimaiAPI {
    constructor(baseUrl, apiToken) {
        this.baseUrl = baseUrl;
        this.headers = {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
        };
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            ...options,
            headers: {
                ...this.headers,
                ...options.headers,
            },
        };

        const response = await fetch(url, config);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (response.status === 204) {
            return null; // No content
        }

        return response.json();
    }

    // Timesheet operations
    async getTimesheets(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/api/timesheets?${query}`);
    }

    async getActiveTimesheets() {
        return this.request('/api/timesheets/active');
    }

    async createTimesheet(data) {
        return this.request('/api/timesheets', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateTimesheet(id, data) {
        return this.request(`/api/timesheets/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async stopTimesheet(id) {
        return this.request(`/api/timesheets/${id}/stop`, {
            method: 'PATCH',
        });
    }

    async deleteTimesheet(id) {
        return this.request(`/api/timesheets/${id}`, {
            method: 'DELETE',
        });
    }

    // Customer operations
    async getCustomers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/api/customers?${query}`);
    }

    async createCustomer(data) {
        return this.request('/api/customers', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Project operations
    async getProjects(customerId = null) {
        const params = customerId ? { customer: customerId } : {};
        const query = new URLSearchParams(params).toString();
        return this.request(`/api/projects?${query}`);
    }

    async createProject(data) {
        return this.request('/api/projects', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Activity operations
    async getActivities(projectId = null) {
        const params = projectId ? { project: projectId } : {};
        const query = new URLSearchParams(params).toString();
        return this.request(`/api/activities?${query}`);
    }

    // User operations
    async getCurrentUser() {
        return this.request('/api/users/me');
    }

    // Utility
    async ping() {
        return this.request('/api/ping');
    }

    async getVersion() {
        return this.request('/api/version');
    }
}

// Usage example
const api = new KimaiAPI('https://your-kimai.com', 'your_api_token');

// Start a timer
async function startWork() {
    try {
        const timesheet = await api.createTimesheet({
            begin: new Date().toISOString().slice(0, 19),
            project: 3,
            activity: 10,
            description: 'Working on feature',
        });

        console.log('Timer started:', timesheet);
        return timesheet.id;
    } catch (error) {
        console.error('Failed to start timer:', error);
    }
}

// Stop active timer
async function stopWork(timesheetId) {
    try {
        const timesheet = await api.stopTimesheet(timesheetId);
        console.log('Timer stopped:', timesheet);
    } catch (error) {
        console.error('Failed to stop timer:', error);
    }
}

// Get this week's timesheets
async function getWeekTimesheets() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    try {
        const timesheets = await api.getTimesheets({
            begin: weekStart.toISOString().slice(0, 19),
            end: weekEnd.toISOString().slice(0, 19),
            user: 'all',
        });

        console.log('Week timesheets:', timesheets);
        return timesheets;
    } catch (error) {
        console.error('Failed to fetch timesheets:', error);
    }
}

// Run examples
(async () => {
    // Check connection
    const pong = await api.ping();
    console.log('API status:', pong);

    // Get current user
    const user = await api.getCurrentUser();
    console.log('Current user:', user);

    // Start work
    const timesheetId = await startWork();

    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Stop work
    await stopWork(timesheetId);
})();
```

---

### 9.3 Python Examples

```python
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, List

class KimaiAPI:
    def __init__(self, base_url: str, api_token: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json',
        })

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict:
        url = f"{self.base_url}{endpoint}"
        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()

        if response.status_code == 204:
            return None

        return response.json()

    # Timesheet methods
    def get_timesheets(self, **params) -> List[Dict]:
        return self._request('GET', '/api/timesheets', params=params)

    def create_timesheet(self, data: Dict) -> Dict:
        return self._request('POST', '/api/timesheets', json=data)

    def stop_timesheet(self, timesheet_id: int) -> Dict:
        return self._request('PATCH', f'/api/timesheets/{timesheet_id}/stop')

    # Customer methods
    def get_customers(self, **params) -> List[Dict]:
        return self._request('GET', '/api/customers', params=params)

    def create_customer(self, data: Dict) -> Dict:
        return self._request('POST', '/api/customers', json=data)

    # Project methods
    def get_projects(self, customer_id: Optional[int] = None) -> List[Dict]:
        params = {'customer': customer_id} if customer_id else {}
        return self._request('GET', '/api/projects', params=params)

    # Utility methods
    def ping(self) -> Dict:
        return self._request('GET', '/api/ping')

    def get_current_user(self) -> Dict:
        return self._request('GET', '/api/users/me')

# Usage
api = KimaiAPI('https://your-kimai.com', 'your_api_token')

# Get current user
user = api.get_current_user()
print(f"Logged in as: {user['username']}")

# Start timer
timesheet = api.create_timesheet({
    'begin': datetime.now().isoformat(timespec='seconds'),
    'project': 3,
    'activity': 10,
    'description': 'Python API integration',
})
print(f"Timer started: {timesheet['id']}")

# Get this month's timesheets
now = datetime.now()
month_start = now.replace(day=1, hour=0, minute=0, second=0)
month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)

timesheets = api.get_timesheets(
    user='all',
    begin=month_start.isoformat(timespec='seconds'),
    end=month_end.isoformat(timespec='seconds'),
)

total_hours = sum(t['duration'] for t in timesheets) / 3600
print(f"Total hours this month: {total_hours:.2f}")

# Stop timer
api.stop_timesheet(timesheet['id'])
print("Timer stopped")
```

---

### 9.4 curl Examples

```bash
# Set variables
API_URL="https://your-kimai.com/api"
API_TOKEN="your_api_token"

# Ping
curl -X GET "${API_URL}/ping" \
  -H "Authorization: Bearer ${API_TOKEN}"

# Get current user
curl -X GET "${API_URL}/users/me" \
  -H "Authorization: Bearer ${API_TOKEN}"

# Get timesheets
curl -X GET "${API_URL}/timesheets?user=5&page=1&size=50" \
  -H "Authorization: Bearer ${API_TOKEN}"

# Create timesheet
curl -X POST "${API_URL}/timesheets" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "begin": "2025-10-06T09:00:00",
    "project": 3,
    "activity": 10,
    "description": "Working on feature"
  }'

# Stop timesheet
curl -X PATCH "${API_URL}/timesheets/123/stop" \
  -H "Authorization: Bearer ${API_TOKEN}"

# Get customers
curl -X GET "${API_URL}/customers?visible=1" \
  -H "Authorization: Bearer ${API_TOKEN}"

# Create customer
curl -X POST "${API_URL}/customers" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Customer",
    "country": "US",
    "currency": "USD",
    "timezone": "America/New_York"
  }'

# Get projects for customer
curl -X GET "${API_URL}/projects?customer=1" \
  -H "Authorization: Bearer ${API_TOKEN}"

# Get activities for project
curl -X GET "${API_URL}/activities?project=3" \
  -H "Authorization: Bearer ${API_TOKEN}"
```

---

## 10. Integration Patterns

### 10.1 Synchronization Pattern

For two-way sync between Kimai and external system:

```python
class KimaiSync:
    def __init__(self, kimai_api, external_api):
        self.kimai = kimai_api
        self.external = external_api
        self.mapping = {}  # ID mapping between systems

    def sync_customers(self):
        """Bidirectional customer sync"""
        # Get all customers from both systems
        kimai_customers = self.kimai.get_customers(visible=3)
        external_customers = self.external.get_customers()

        # Create mapping
        for kc in kimai_customers:
            ext_id = self.get_external_id(kc)
            if ext_id:
                self.mapping[kc['id']] = ext_id

        # Sync new customers from Kimai to external
        for kc in kimai_customers:
            if kc['id'] not in self.mapping:
                ext_customer = self.external.create_customer(kc)
                self.mapping[kc['id']] = ext_customer['id']

        # Sync new customers from external to Kimai
        for ec in external_customers:
            if ec['id'] not in self.mapping.values():
                ki_customer = self.kimai.create_customer({
                    'name': ec['name'],
                    'country': ec['country'],
                    'currency': ec['currency'],
                    'timezone': ec['timezone'],
                })
                self.mapping[ki_customer['id']] = ec['id']
```

---

### 10.2 Webhook Pattern

Receive and process Kimai webhooks (requires plugin):

```php
<?php

namespace KimaiPlugin\YourBundle\Controller;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;

/**
 * @Route("/webhook")
 */
class WebhookController
{
    /**
     * @Route("/timesheet", methods={"POST"})
     */
    public function timesheetWebhook(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        // Validate webhook signature
        $signature = $request->headers->get('X-Kimai-Signature');
        if (!$this->validateSignature($signature, $request->getContent())) {
            return new JsonResponse(['error' => 'Invalid signature'], 403);
        }

        // Process webhook
        $event = $data['event']; // 'created', 'updated', 'deleted'
        $timesheet = $data['timesheet'];

        switch ($event) {
            case 'created':
                $this->onTimesheetCreated($timesheet);
                break;
            case 'updated':
                $this->onTimesheetUpdated($timesheet);
                break;
            case 'deleted':
                $this->onTimesheetDeleted($timesheet);
                break;
        }

        return new JsonResponse(['status' => 'ok']);
    }

    private function validateSignature(string $signature, string $payload): bool
    {
        $secret = getenv('WEBHOOK_SECRET');
        $expected = hash_hmac('sha256', $payload, $secret);
        return hash_equals($expected, $signature);
    }
}
```

---

### 10.3 Batch Processing Pattern

Process large datasets efficiently:

```javascript
class BatchProcessor {
    constructor(api, batchSize = 50) {
        this.api = api;
        this.batchSize = batchSize;
    }

    async *fetchAllPages(endpoint, params = {}) {
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const query = new URLSearchParams({
                ...params,
                page,
                size: this.batchSize,
            });

            const response = await fetch(`${this.api.baseUrl}${endpoint}?${query}`, {
                headers: this.api.headers,
            });

            const data = await response.json();

            // Check pagination headers
            const totalPages = parseInt(response.headers.get('X-Total-Pages'));
            hasMore = page < totalPages;

            yield data;
            page++;
        }
    }

    async processAllTimesheets(callback) {
        for await (const batch of this.fetchAllPages('/api/timesheets')) {
            for (const timesheet of batch) {
                await callback(timesheet);
            }
        }
    }
}

// Usage
const processor = new BatchProcessor(api);

await processor.processAllTimesheets(async (timesheet) => {
    if (!timesheet.exported) {
        // Process unexported timesheet
        console.log('Processing:', timesheet.id);
        // ... your logic ...
    }
});
```

---

### 10.4 Rate Limiting Pattern

Respect API rate limits:

```python
import time
from functools import wraps

class RateLimiter:
    def __init__(self, max_calls: int, period: int):
        self.max_calls = max_calls
        self.period = period
        self.calls = []

    def __call__(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            now = time.time()

            # Remove old calls
            self.calls = [c for c in self.calls if c > now - self.period]

            # Check if we can make a call
            if len(self.calls) >= self.max_calls:
                sleep_time = self.period - (now - self.calls[0])
                time.sleep(sleep_time)
                self.calls = []

            # Make the call
            self.calls.append(time.time())
            return func(*args, **kwargs)

        return wrapper

# Usage
class KimaiAPIWithRateLimit:
    @RateLimiter(max_calls=100, period=60)  # 100 calls per minute
    def get_timesheets(self, **params):
        return self._request('GET', '/api/timesheets', params=params)
```

---

## 11. Error Handling

### 11.1 HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 204 | No Content | Successful DELETE operation |
| 400 | Bad Request | Invalid request data, validation errors |
| 401 | Unauthorized | Missing or invalid API token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource conflict (e.g., duplicate) |
| 422 | Unprocessable Entity | Validation failed |
| 500 | Internal Server Error | Server error |

---

### 11.2 Error Response Format

```json
{
  "code": 400,
  "message": "Validation failed",
  "errors": {
    "children": {
      "name": {
        "errors": ["This value should not be blank."]
      },
      "country": {
        "errors": ["This value is not valid."]
      }
    }
  }
}
```

---

### 11.3 Error Handling Examples

#### JavaScript

```javascript
async function safeApiCall(apiFunction, ...args) {
    try {
        return await apiFunction(...args);
    } catch (error) {
        if (error.response) {
            // Server responded with error
            switch (error.response.status) {
                case 400:
                    console.error('Validation error:', error.response.data);
                    break;
                case 401:
                    console.error('Authentication failed - check API token');
                    break;
                case 403:
                    console.error('Permission denied');
                    break;
                case 404:
                    console.error('Resource not found');
                    break;
                case 500:
                    console.error('Server error');
                    break;
                default:
                    console.error('API error:', error.response.status);
            }
        } else if (error.request) {
            // Request made but no response
            console.error('Network error - no response received');
        } else {
            // Error in request setup
            console.error('Request error:', error.message);
        }

        throw error;
    }
}

// Usage
try {
    const timesheet = await safeApiCall(
        api.createTimesheet,
        { begin: '2025-10-06T09:00:00', project: 999 }
    );
} catch (error) {
    // Handle error appropriately
}
```

#### Python

```python
from requests.exceptions import HTTPError, ConnectionError, Timeout

class KimaiAPIError(Exception):
    pass

class KimaiValidationError(KimaiAPIError):
    pass

class KimaiAuthError(KimaiAPIError):
    pass

def safe_api_call(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except HTTPError as e:
            if e.response.status_code == 400:
                raise KimaiValidationError(e.response.json())
            elif e.response.status_code == 401:
                raise KimaiAuthError('Invalid API token')
            elif e.response.status_code == 403:
                raise KimaiAPIError('Permission denied')
            elif e.response.status_code == 404:
                raise KimaiAPIError('Resource not found')
            else:
                raise KimaiAPIError(f'HTTP {e.response.status_code}')
        except (ConnectionError, Timeout) as e:
            raise KimaiAPIError(f'Network error: {str(e)}')

    return wrapper

# Usage
try:
    timesheet = api.create_timesheet({
        'begin': '2025-10-06T09:00:00',
        'project': 3,
    })
except KimaiValidationError as e:
    print('Validation failed:', e)
except KimaiAuthError as e:
    print('Authentication error:', e)
except KimaiAPIError as e:
    print('API error:', e)
```

---

## 12. Best Practices

### 12.1 Security

✅ **DO:**
- Use HTTPS exclusively
- Store API tokens in environment variables or secrets management
- Generate separate tokens per integration/application
- Set expiration dates on production tokens
- Rotate tokens periodically
- Monitor token usage via "last usage" timestamp
- Validate all input data before sending to API
- Use prepared statements for SQL queries
- Implement rate limiting in client applications

❌ **DON'T:**
- Commit API tokens to version control
- Share tokens between users or applications
- Use HTTP (always HTTPS)
- Store tokens in plain text files
- Use generic/shared tokens for multiple purposes
- Expose tokens in client-side JavaScript

---

### 12.2 Performance

✅ **DO:**
- Use pagination for large datasets
- Implement caching for configuration endpoints
- Batch related API calls when possible
- Use appropriate filters to reduce payload size
- Index frequently queried database columns
- Use `visible=1` filter to exclude hidden resources
- Implement connection pooling for database access

❌ **DON'T:**
- Fetch all records without pagination
- Make redundant API calls
- Query without filters on large datasets
- Poll APIs excessively (implement webhooks instead)

---

### 12.3 Data Integrity

✅ **DO:**
- Always explicitly set boolean values
- Use ISO 8601 datetime format with timezone
- Validate data before submission
- Handle timezone conversions properly
- Test with different date ranges
- Verify rate calculations
- Use transactions for related operations
- Implement proper error handling and rollback

❌ **DON'T:**
- Rely on default boolean behavior (explicit is better)
- Ignore timezone information
- Assume data validation on client side only
- Mix datetime formats
- Delete customers/projects without understanding cascade effects

---

### 12.4 API Usage

✅ **DO:**
- Use `/api/version` to verify compatibility
- Use `/api/ping` for health checks
- Respect HTTP status codes
- Implement exponential backoff for retries
- Handle pagination headers properly
- Use appropriate HTTP methods (GET, POST, PATCH, DELETE)
- Send minimal required data in requests
- Validate responses before processing

❌ **DON'T:**
- Ignore error responses
- Retry failed requests indefinitely
- Use GET for state-changing operations
- Send entire objects when PATCH supports partial updates
- Assume API behavior without checking documentation

---

### 12.5 Development

✅ **DO:**
- Test against demo instance first: `https://demo.kimai.org`
- Use development/staging environment
- Implement comprehensive logging
- Write unit tests for API integrations
- Document custom fields and configurations
- Version your integrations
- Follow Symfony/Kimai coding standards for plugins
- Use type hints and return types

❌ **DON'T:**
- Test directly in production
- Skip error handling
- Hardcode configuration values
- Ignore API version changes
- Skip documentation

---

## Appendix A: Quick Reference

### Common Endpoints

```
GET    /api/ping
GET    /api/version
GET    /api/users/me

GET    /api/timesheets
POST   /api/timesheets
PATCH  /api/timesheets/{id}/stop

GET    /api/customers
POST   /api/customers
GET    /api/projects?customer={id}
POST   /api/projects
GET    /api/activities?project={id}
POST   /api/activities
```

### DateTime Format

```
ISO 8601: 2025-10-06T09:00:00
With timezone: 2025-10-06T09:00:00+00:00
```

### Common Filters

```
visible=1    # Visible only
visible=2    # Hidden only
visible=3    # Both
exported=0   # Not exported
billable=1   # Billable only
```

---

## Appendix B: Resources

### Official Documentation
- Website: https://www.kimai.org
- Documentation: https://www.kimai.org/documentation/
- GitHub: https://github.com/kimai/kimai
- Demo: https://demo.kimai.org

### Developer Resources
- API Documentation: https://demo.kimai.org/api/doc
- PHP API Client: https://github.com/kimai/api-php
- API Sync Tool: https://github.com/kimai/api-sync

### Support
- GitHub Issues: https://github.com/kimai/kimai/issues
- Documentation Issues: https://github.com/kimai/kimai.github.io/issues

---

**End of Manual**

This manual provides comprehensive technical documentation for interacting with Kimai programmatically. For the latest updates and additional information, always refer to the official Kimai documentation.
