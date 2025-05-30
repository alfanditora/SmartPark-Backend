﻿# Parking System API Documentation

## Overview

This API documentation provides detailed information about the endpoints available in the Parking System application. The API is organized around three main resources:

- **Users**: Authentication, registration, profile management, and vehicle management
- **Parking**: Check-in, check-out, and parking history
- **Wallet**: Balance management and top-up functionality

All API responses follow a consistent format:

- Success responses include a `status: "success"` field and relevant data
- Error responses include a `status: "error"` field and an error message

## Base URL

```
smartpark-backend.vercel.app/api
```

## Authentication

Most endpoints require authentication. Authentication is handled via JWT (JSON Web Token). 

To authenticate requests, include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

You can obtain a token by using the `/users/login` endpoint.

---

## User Routes

### Register a new user

```
POST /users/register
```

Create a new user account.

**Request Body:**

| Field     | Type     | Required | Description                                 |
|-----------|----------|----------|---------------------------------------------|
| username  | string   | Yes      | The username for the new account            |
| email     | string   | Yes      | Email address (must be unique)              |
| password  | string   | Yes      | Password for the account                    |
| vehicles  | array    | No       | Array of vehicle objects (default: [])      |
| role      | string   | No       | User role ('user' or 'admin', default: 'user') |

Each vehicle object should contain:
```json
{
  "plate": "AB1234CD",
  "description": "Honda Civic White"
}
```

**Success Response (201 Created):**

```json
{
  "status": "success",
  "data": {
    "userID": "user123",
    "username": "john_doe",
    "email": "john@example.com",
    "vehicles": [
      {
        "plate": "AB1234CD",
        "description": "Honda Civic White"
      }
    ],
    "role": "user"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Missing required fields
- `409 Conflict`: Email already registered or vehicle plate already registered
- `500 Internal Server Error`: Server error

---

### User Login

```
POST /users/login
```

Authenticate a user and receive a JWT token.

**Request Body:**

| Field    | Type   | Required | Description         |
|----------|--------|----------|---------------------|
| email    | string | Yes      | User's email address|
| password | string | Yes      | User's password     |

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "userID": "user123",
      "username": "john_doe",
      "email": "john@example.com",
      "vehicles": [
        {
          "plate": "AB1234CD",
          "description": "Honda Civic White"
        }
      ],
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**

- `400 Bad Request`: Missing email or password
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server error

---

### Get User Profile

```
GET /users/profile
```

Get the profile of the authenticated user.

**Authentication Required:** Yes

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "userID": "user123",
      "username": "john_doe",
      "email": "john@example.com",
      "vehicles": [
        {
          "plate": "AB1234CD",
          "description": "Honda Civic White"
        }
      ],
      "role": "user",
      "rfid": "1234567890"
    },
    "wallet": {
      "walletID": "wallet123",
      "userID": "user123",
      "current_balance": 50000,
      "created_at": "2023-01-01T12:00:00Z",
      "updated_at": "2023-01-05T15:30:00Z"
    }
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

---

### Update User Profile

```
PUT /users/profile
```

Update the authenticated user's profile information.

**Authentication Required:** Yes

**Request Body:**

| Field     | Type     | Required | Description                                 |
|-----------|----------|----------|---------------------------------------------|
| username  | string   | No       | New username                                |
| email     | string   | No       | New email address                           |
| password  | string   | No       | New password                                |
| vehicles  | array    | No       | New array of vehicle objects                |

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "userID": "user123",
    "username": "john_smith",
    "email": "john@example.com",
    "vehicles": [
      {
        "plate": "AB1234CD",
        "description": "Honda Civic White"
      },
      {
        "plate": "EF5678GH",
        "description": "Toyota Yaris Black"
      }
    ],
    "role": "user",
    "rfid": "1234567890"
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found
- `409 Conflict`: Vehicle plate already registered to another user
- `500 Internal Server Error`: Server error

---

### Add Vehicle

```
POST /users/vehicle
```

Add a new vehicle to the authenticated user's account.

**Authentication Required:** Yes

**Request Body:**

| Field       | Type   | Required | Description                     |
|-------------|--------|----------|---------------------------------|
| plate       | string | Yes      | Vehicle license plate           |
| description | string | No       | Vehicle description (default: "")|

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "userID": "user123",
    "username": "john_doe",
    "email": "john@example.com",
    "vehicles": [
      {
        "plate": "AB1234CD",
        "description": "Honda Civic White"
      },
      {
        "plate": "EF5678GH",
        "description": "Toyota Yaris Black"
      }
    ],
    "role": "user"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Missing plate
- `401 Unauthorized`: Missing or invalid token
- `409 Conflict`: Vehicle plate already registered to another user
- `500 Internal Server Error`: Server error

---

### Update Vehicle Description

```
PUT /users/vehicle
```

Update the description of a vehicle.

**Authentication Required:** Yes

**Request Body:**

| Field       | Type   | Required | Description                     |
|-------------|--------|----------|---------------------------------|
| plate       | string | Yes      | Vehicle license plate           |
| description | string | Yes      | New vehicle description         |

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "userID": "user123",
    "username": "john_doe",
    "email": "john@example.com",
    "vehicles": [
      {
        "plate": "AB1234CD",
        "description": "Honda Civic 2020 White"
      }
    ],
    "role": "user"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Missing plate or description
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found or vehicle plate not found
- `500 Internal Server Error`: Server error

---

### Remove Vehicle

```
DELETE /users/vehicle/:plate
```

Remove a vehicle from the authenticated user's account.

**Authentication Required:** Yes

**URL Parameters:**

| Parameter | Description               |
|-----------|---------------------------|
| plate     | Vehicle license plate     |

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "userID": "user123",
    "username": "john_doe",
    "email": "john@example.com",
    "vehicles": [],
    "role": "user"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Missing plate
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

---

### Get All Users (Admin Only)

```
GET /users/all
```

Get a list of all users in the system.

**Authentication Required:** Yes (Admin role)

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": [
    {
      "userID": "user123",
      "username": "john_doe",
      "email": "john@example.com",
      "vehicles": [
        {
          "plate": "AB1234CD",
          "description": "Honda Civic White"
        }
      ],
      "role": "user",
      "rfid": "1234567890"
    },
    {
      "userID": "user456",
      "username": "jane_smith",
      "email": "jane@example.com",
      "vehicles": [
        {
          "plate": "EF5678GH",
          "description": "Toyota Yaris Black"
        }
      ],
      "role": "user",
      "rfid": "0987654321"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions (not an admin)
- `500 Internal Server Error`: Server error

---

### Add RFID to User (Admin Only)

```
POST /users/admin/rfid
```

Assign an RFID tag to a user.

**Authentication Required:** Yes (Admin role)

**Request Body:**

| Field  | Type   | Required | Description         |
|--------|--------|----------|---------------------|
| userID | string | Yes      | User ID             |
| rfid   | string | Yes      | RFID tag identifier |

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "userID": "user123",
    "username": "john_doe",
    "email": "john@example.com",
    "vehicles": [
      {
        "plate": "AB1234CD",
        "description": "Honda Civic White"
      }
    ],
    "role": "user",
    "rfid": "1234567890"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Missing userID or RFID
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions (not an admin)
- `404 Not Found`: User not found
- `409 Conflict`: RFID already assigned to another user
- `500 Internal Server Error`: Server error

---

### Remove RFID from User (Admin Only)

```
DELETE /users/admin/rfid/:userID
```

Remove an RFID tag from a user.

**Authentication Required:** Yes (Admin role)

**URL Parameters:**

| Parameter | Description |
|-----------|-------------|
| userID    | User ID     |

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "userID": "user123",
    "username": "john_doe",
    "email": "john@example.com",
    "vehicles": [
      {
        "plate": "AB1234CD",
        "description": "Honda Civic White"
      }
    ],
    "role": "user"
  }
}
```

**Error Responses:**

- `400 Bad Request`: Missing userID or user doesn't have an RFID assigned
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions (not an admin)
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

---

## Parking Routes

### Check-In Vehicle

```
POST /parking/checkin
```

Check in a vehicle to the parking area.

**Request Body:**

| Field        | Type   | Required | Description         |
|--------------|--------|----------|---------------------|
| rfid         | string | Yes      | User's RFID tag     |
| vehicle_plate| string | Yes      | Vehicle license plate|

**Success Response (201 Created):**

```json
{
  "status": "success",
  "data": {
    "parkID": "park123",
    "userID": "user123",
    "vehicle_plate": "AB1234CD",
    "in_date": "2023-05-01T10:00:00Z",
    "out_date": null,
    "payment_status": "pending",
    "total_billing": 0
  },
  "message": "Successfully checked in"
}
```

**Error Responses:**

- `400 Bad Request`: Missing RFID or vehicle plate
- `403 Forbidden`: Vehicle plate not registered to the user
- `404 Not Found`: User not found with the provided RFID
- `409 Conflict`: Vehicle already checked in
- `500 Internal Server Error`: Server error

---

### Check-Out and Pay

```
POST /parking/checkout
```

Check out a vehicle from the parking area and pay the parking fee.

**Request Body:**

| Field        | Type   | Required | Description         |
|--------------|--------|----------|---------------------|
| rfid         | string | Yes      | User's RFID tag     |
| vehicle_plate| string | Yes      | Vehicle license plate|

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "parkID": "park123",
    "userID": "user123",
    "vehicle_plate": "AB1234CD",
    "in_date": "2023-05-01T10:00:00Z",
    "out_date": "2023-05-01T13:00:00Z",
    "payment_status": "paid",
    "total_billing": 15000
  },
  "message": "Successfully checked out and paid parking fee: Rp 15000"
}
```

**Error Responses:**

- `400 Bad Request`: Missing RFID or vehicle plate or insufficient balance
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Not authorized to check out this parking session
- `404 Not Found`: User not found or no active parking session found or wallet not found
- `409 Conflict`: Parking session already checked out and paid
- `500 Internal Server Error`: Server error

---

### Get Parking History

```
GET /parking/history
```

Get the parking history of the authenticated user.

**Authentication Required:** Yes

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": [
    {
      "parkID": "park123",
      "userID": "user123",
      "vehicle_plate": "AB1234CD",
      "in_date": "2023-05-01T10:00:00Z",
      "out_date": "2023-05-01T13:00:00Z",
      "payment_status": "paid",
      "total_billing": 15000,
      "vehicle_description": "Honda Civic White"
    },
    {
      "parkID": "park456",
      "userID": "user123",
      "vehicle_plate": "EF5678GH",
      "in_date": "2023-05-02T09:00:00Z",
      "out_date": "2023-05-02T11:30:00Z",
      "payment_status": "paid",
      "total_billing": 12500,
      "vehicle_description": "Toyota Yaris Black"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid token
- `500 Internal Server Error`: Server error

---

### Get Active Parking

```
GET /parking/active
```

Get the active parking session of the authenticated user.

**Authentication Required:** Yes

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "parkID": "park789",
    "userID": "user123",
    "vehicle_plate": "AB1234CD",
    "in_date": "2023-05-03T14:00:00Z",
    "out_date": null,
    "payment_status": "pending",
    "total_billing": 0,
    "vehicle_description": "Honda Civic White"
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: No active parking session found
- `500 Internal Server Error`: Server error

---

### Get All Active Parking Sessions (Admin Only)

```
GET /parking/admin/active
```

Get all active parking sessions in the system.

**Authentication Required:** Yes (Admin role)

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": [
    {
      "parkID": "park789",
      "userID": "user123",
      "vehicle_plate": "AB1234CD",
      "in_date": "2023-05-03T14:00:00Z",
      "out_date": null,
      "payment_status": "pending",
      "total_billing": 0,
      "vehicle_description": "Honda Civic White"
    },
    {
      "parkID": "park101",
      "userID": "user456",
      "vehicle_plate": "EF5678GH",
      "in_date": "2023-05-03T15:30:00Z",
      "out_date": null,
      "payment_status": "pending",
      "total_billing": 0,
      "vehicle_description": "Toyota Yaris Black"
    }
  ]
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions (not an admin)
- `500 Internal Server Error`: Server error

---

### Get All Parking History (Admin Only)

```
GET /parking/admin/history
```

Get all parking history records in the system, with optional filtering and pagination.

**Authentication Required:** Yes (Admin role)

**Query Parameters:**

| Parameter  | Type    | Required | Description                                         |
|------------|---------|----------|-----------------------------------------------------|
| limit      | number  | No       | Number of records to return (default: 100)          |
| page       | number  | No       | Page number (default: 1)                            |
| sortBy     | string  | No       | Field to sort by (default: 'in_date')               |
| sortOrder  | string  | No       | Sort order ('asc' or 'desc', default: 'desc')       |
| startDate  | string  | No       | Filter by start date (ISO format)                   |
| endDate    | string  | No       | Filter by end date (ISO format)                     |
| status     | string  | No       | Filter by payment status ('paid', 'pending', 'all') |

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": [
    {
      "parkID": "park123",
      "userID": "user123",
      "vehicle_plate": "AB1234CD",
      "in_date": "2023-05-01T10:00:00Z",
      "out_date": "2023-05-01T13:00:00Z",
      "payment_status": "paid",
      "total_billing": 15000,
      "user_name": "john_doe",
      "user_email": "john@example.com",
      "vehicle_description": "Honda Civic White"
    },
    {
      "parkID": "park456",
      "userID": "user456",
      "vehicle_plate": "EF5678GH",
      "in_date": "2023-05-02T09:00:00Z",
      "out_date": "2023-05-02T11:30:00Z",
      "payment_status": "paid",
      "total_billing": 12500,
      "user_name": "jane_smith",
      "user_email": "jane@example.com",
      "vehicle_description": "Toyota Yaris Black"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 100,
    "pages": 1
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions (not an admin)
- `500 Internal Server Error`: Server error

---

## Wallet Routes

### Get Wallet Balance

```
GET /wallet/balance
```

Get the wallet balance of the authenticated user.

**Authentication Required:** Yes

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "walletID": "wallet123",
    "userID": "user123",
    "current_balance": 50000,
    "created_at": "2023-01-01T12:00:00Z",
    "updated_at": "2023-01-05T15:30:00Z"
  }
}
```

**Error Responses:**

- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Wallet not found
- `500 Internal Server Error`: Server error

---

### Top Up Wallet

```
POST /wallet/topup
```

Add funds to the authenticated user's wallet.

**Authentication Required:** Yes

**Request Body:**

| Field  | Type   | Required | Description                 |
|--------|--------|----------|-----------------------------|
| amount | number | Yes      | Amount to add to the wallet |

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "walletID": "wallet123",
    "userID": "user123",
    "current_balance": 75000,
    "created_at": "2023-01-01T12:00:00Z",
    "updated_at": "2023-05-03T16:45:00Z"
  },
  "message": "Successfully topped up Rp 25000"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid amount
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Wallet not found
- `500 Internal Server Error`: Server error

---

### Admin Top Up Wallet (Admin Only)

```
POST /wallet/admin/topup
```

Add funds to any user's wallet.

**Authentication Required:** Yes (Admin role)

**Request Body:**

| Field  | Type   | Required | Description                 |
|--------|--------|----------|-----------------------------|
| userID | string | Yes      | ID of the user              |
| amount | number | Yes      | Amount to add to the wallet |

**Success Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "walletID": "wallet456",
    "userID": "user456",
    "current_balance": 100000,
    "created_at": "2023-02-01T10:00:00Z",
    "updated_at": "2023-05-03T17:15:00Z"
  },
  "message": "Successfully topped up Rp 50000 for user user456"
}
```

**Error Responses:**

- `400 Bad Request`: Missing userID or invalid amount
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions (not an admin)
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error
