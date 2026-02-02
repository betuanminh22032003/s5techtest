# Problem 6: Scoreboard Module Architecture Specification

## Overview

This document specifies the architecture for a real-time scoreboard module that displays the top 10 user scores with live updates. The module includes secure score update mechanisms to prevent unauthorized score manipulation.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Flow Diagram](#flow-diagram)
3. [API Specifications](#api-specifications)
4. [Data Models](#data-models)
5. [Security Measures](#security-measures)
6. [Real-Time Updates](#real-time-updates)
7. [Implementation Guidelines](#implementation-guidelines)
8. [Improvements & Recommendations](#improvements--recommendations)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                        │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐            │
│  │   Web Browser   │     │  Mobile Client  │     │   Other Clients │            │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘            │
│           │                       │                       │                      │
│           └───────────────────────┼───────────────────────┘                      │
│                                   │                                              │
│                          ┌────────▼────────┐                                     │
│                          │  WebSocket/SSE  │  (Real-time score updates)          │
│                          │   Connection    │                                     │
│                          └────────┬────────┘                                     │
└───────────────────────────────────┼─────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────────┐
│                          API GATEWAY / LOAD BALANCER                             │
│                          ┌────────▼────────┐                                     │
│                          │   Rate Limiter  │                                     │
│                          │   & API Gateway │                                     │
│                          └────────┬────────┘                                     │
└───────────────────────────────────┼─────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────────┐
│                           APPLICATION SERVER                                     │
│                                   │                                              │
│  ┌────────────────────────────────▼────────────────────────────────────┐        │
│  │                        MIDDLEWARE LAYER                              │        │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │        │
│  │  │    Auth      │  │   Request    │  │   Action     │               │        │
│  │  │  Middleware  │──│  Validation  │──│  Validator   │               │        │
│  │  │  (JWT/Token) │  │  Middleware  │  │  Middleware  │               │        │
│  │  └──────────────┘  └──────────────┘  └──────────────┘               │        │
│  └────────────────────────────────┬────────────────────────────────────┘        │
│                                   │                                              │
│  ┌────────────────────────────────▼────────────────────────────────────┐        │
│  │                        CONTROLLER LAYER                              │        │
│  │  ┌──────────────────────┐    ┌──────────────────────┐               │        │
│  │  │  ScoreController     │    │  LeaderboardController│               │        │
│  │  │  - updateScore()     │    │  - getTopScores()     │               │        │
│  │  └──────────┬───────────┘    └──────────┬───────────┘               │        │
│  └─────────────┼───────────────────────────┼───────────────────────────┘        │
│                │                           │                                     │
│  ┌─────────────▼───────────────────────────▼───────────────────────────┐        │
│  │                         SERVICE LAYER                                │        │
│  │  ┌──────────────────────┐    ┌──────────────────────┐               │        │
│  │  │    ScoreService      │    │  LeaderboardService  │               │        │
│  │  │  - validateAction()  │    │  - getLeaderboard()  │               │        │
│  │  │  - incrementScore()  │    │  - broadcastUpdate() │               │        │
│  │  │  - recordAction()    │    │  - cacheLeaderboard()│               │        │
│  │  └──────────┬───────────┘    └──────────┬───────────┘               │        │
│  └─────────────┼───────────────────────────┼───────────────────────────┘        │
│                │                           │                                     │
│  ┌─────────────▼───────────────────────────▼───────────────────────────┐        │
│  │                      WebSocket Manager                               │        │
│  │  ┌──────────────────────────────────────────────────────────────┐   │        │
│  │  │  - manageConnections()   - broadcastToSubscribers()          │   │        │
│  │  │  - handleDisconnect()    - publishToChannel()                │   │        │
│  │  └──────────────────────────────────────────────────────────────┘   │        │
│  └─────────────────────────────────────────────────────────────────────┘        │
└───────────────────────────────────┬─────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────────┐
│                             DATA LAYER                                           │
│           ┌───────────────────────┼───────────────────────┐                      │
│           │                       │                       │                      │
│  ┌────────▼────────┐    ┌────────▼────────┐    ┌────────▼────────┐              │
│  │     Redis       │    │    PostgreSQL   │    │   Message Queue │              │
│  │  (Cache/Pub-Sub)│    │   (Persistence) │    │   (Optional)    │              │
│  │                 │    │                 │    │                 │              │
│  │ - Leaderboard   │    │ - Users         │    │ - Score Events  │              │
│  │ - Sessions      │    │ - Scores        │    │ - Notifications │              │
│  │ - Rate Limits   │    │ - Actions Log   │    │                 │              │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Flow Diagram

### Score Update Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │     │   API    │     │  Auth    │     │  Action  │     │  Score   │
│          │     │ Gateway  │     │Middleware│     │Validator │     │ Service  │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │                │
     │ 1. Complete    │                │                │                │
     │    Action      │                │                │                │
     │ ──────────────>│                │                │                │
     │                │                │                │                │
     │                │ 2. Rate Limit  │                │                │
     │                │    Check       │                │                │
     │                │ ──────────────>│                │                │
     │                │                │                │                │
     │                │                │ 3. Validate    │                │
     │                │                │    JWT Token   │                │
     │                │                │ ──────────────>│                │
     │                │                │                │                │
     │                │                │                │ 4. Validate    │
     │                │                │                │    Action      │
     │                │                │                │    Token/Proof │
     │                │                │                │ ──────────────>│
     │                │                │                │                │
     │                │                │                │                │ 5. Check
     │                │                │                │                │    Idempotency
     │                │                │                │                │ ──────────┐
     │                │                │                │                │           │
     │                │                │                │                │ <─────────┘
     │                │                │                │                │
     │                │                │                │                │ 6. Update
     │                │                │                │                │    Score in DB
     │                │                │                │                │ ──────────┐
     │                │                │                │                │           │
     │                │                │                │                │ <─────────┘
     │                │                │                │                │
     │                │                │                │                │ 7. Update
     │                │                │                │                │    Redis Cache
     │                │                │                │                │ ──────────┐
     │                │                │                │                │           │
     │                │                │                │                │ <─────────┘
     │                │                │                │                │
     │                │                │                │                │ 8. Publish
     │                │                │                │                │    Update Event
     │ <──────────────────────────────────────────────────────────────────
     │      9. Success Response                                          │
     │                │                │                │                │
     │                │                │                │                │
```

### Real-Time Leaderboard Update Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Clients    │     │  WebSocket   │     │    Redis     │     │    Score     │
│ (Subscribed) │     │   Manager    │     │   Pub/Sub    │     │   Service    │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │  1. Subscribe to   │                    │                    │
       │     leaderboard    │                    │                    │
       │ ──────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │ 2. Add to          │                    │
       │                    │    subscribers     │                    │
       │                    │ ────────┐          │                    │
       │                    │         │          │                    │
       │                    │ <───────┘          │                    │
       │                    │                    │                    │
       │                    │ 3. Subscribe to    │                    │
       │                    │    Redis channel   │                    │
       │                    │ ──────────────────>│                    │
       │                    │                    │                    │
       │                    │                    │   4. Score Updated │
       │                    │                    │ <───────────────────
       │                    │                    │                    │
       │                    │ 5. Receive update  │                    │
       │                    │    message         │                    │
       │                    │ <──────────────────│                    │
       │                    │                    │                    │
       │ 6. Broadcast new   │                    │                    │
       │    leaderboard     │                    │                    │
       │ <──────────────────│                    │                    │
       │                    │                    │                    │
```

---

## API Specifications

### Base URL
```
https://api.example.com/v1
```

### Endpoints

#### 1. Update Score

**POST** `/scores/update`

Updates the user's score after completing an action.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
X-Request-ID: <UNIQUE_REQUEST_ID>
```

**Request Body:**
```json
{
  "actionId": "string",           // Unique identifier for the completed action
  "actionToken": "string",        // Server-generated token proving action completion
  "timestamp": "ISO8601 string",  // When the action was completed
  "signature": "string"           // HMAC signature of the payload
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "string",
    "newScore": 1250,
    "previousScore": 1240,
    "scoreIncrement": 10,
    "rank": 5
  }
}
```

**Error Responses:**

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | INVALID_REQUEST | Missing or invalid request parameters |
| 401 | UNAUTHORIZED | Invalid or expired JWT token |
| 403 | FORBIDDEN | Action token validation failed |
| 409 | DUPLICATE_ACTION | Action already processed (idempotency) |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

---

#### 2. Get Leaderboard

**GET** `/leaderboard`

Retrieves the top 10 scores.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | integer | No | Number of entries (default: 10, max: 100) |
| offset | integer | No | Pagination offset (default: 0) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "userId": "user_123",
        "username": "TopPlayer",
        "score": 5000,
        "avatarUrl": "https://..."
      },
      {
        "rank": 2,
        "userId": "user_456",
        "username": "ProGamer",
        "score": 4500,
        "avatarUrl": "https://..."
      }
      // ... up to 10 entries
    ],
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

#### 3. Get User Score

**GET** `/scores/me`

Retrieves the authenticated user's current score and rank.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "userId": "user_789",
    "username": "CurrentUser",
    "score": 1250,
    "rank": 42,
    "percentile": 85.5
  }
}
```

---

#### 4. WebSocket Connection

**WS** `/ws/leaderboard`

Establishes a WebSocket connection for real-time leaderboard updates.

**Connection URL:**
```
wss://api.example.com/v1/ws/leaderboard?token=<JWT_TOKEN>
```

**Server Messages:**

*Leaderboard Update:*
```json
{
  "type": "LEADERBOARD_UPDATE",
  "data": {
    "leaderboard": [...],
    "updatedAt": "ISO8601 string"
  }
}
```

*Score Update (for authenticated user):*
```json
{
  "type": "SCORE_UPDATE",
  "data": {
    "userId": "user_123",
    "newScore": 1260,
    "newRank": 4,
    "change": "+1"
  }
}
```

---

## Data Models

### User Entity

```typescript
interface User {
  id: string;              // UUID
  username: string;        // Display name
  email: string;           // Email address
  passwordHash: string;    // Hashed password
  score: number;           // Current score
  createdAt: Date;
  updatedAt: Date;
}
```

### Score Entity

```typescript
interface Score {
  id: string;              // UUID
  userId: string;          // Foreign key to User
  score: number;           // Current total score
  lastUpdatedAt: Date;
}
```

### Action Log Entity

```typescript
interface ActionLog {
  id: string;              // UUID
  userId: string;          // Foreign key to User
  actionId: string;        // Unique action identifier
  actionType: string;      // Type of action performed
  scoreAwarded: number;    // Points awarded for this action
  ipAddress: string;       // Client IP for audit
  userAgent: string;       // Client user agent
  createdAt: Date;
}
```

### Redis Data Structures

```
# Sorted Set for Leaderboard
leaderboard:global -> ZSET { userId: score, ... }

# Hash for User Score Cache
user:score:{userId} -> HASH { score, rank, updatedAt }

# Set for Idempotency Check
action:processed:{actionId} -> SET with TTL (24 hours)

# Rate Limiting
rate_limit:{userId}:{endpoint} -> Counter with TTL
```

---

## Security Measures

### 1. Authentication & Authorization

- **JWT Token Validation**: All score update requests must include a valid JWT token
- **Token Expiration**: JWT tokens should have short expiration times (15-30 minutes)
- **Refresh Tokens**: Implement refresh token rotation for extended sessions

### 2. Action Validation (Anti-Cheat)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ACTION VALIDATION FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Client starts action ──────────────────────────────────────┐    │
│                                                                 │    │
│  2. Server generates actionToken with:                         │    │
│     - actionId (UUID)                                          │    │
│     - userId                                                   │    │
│     - expectedDuration                                         │    │
│     - timestamp                                                │    │
│     - serverSecret (HMAC signed)                               │    │
│                                                                 ▼    │
│  3. Client completes action ◄──────────────────────────────────┘    │
│                                                                      │
│  4. Client submits score update with:                               │
│     - Original actionToken                                          │
│     - Completion timestamp                                          │
│     - Client signature                                              │
│                                                                      │
│  5. Server validates:                                               │
│     ✓ actionToken signature is valid                                │
│     ✓ actionToken not expired                                       │
│     ✓ actionToken not already used (idempotency)                    │
│     ✓ Time between start and completion is reasonable               │
│     ✓ User ID matches token                                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3. Rate Limiting

| Endpoint | Rate Limit | Window |
|----------|------------|--------|
| POST /scores/update | 10 requests | 1 minute |
| GET /leaderboard | 60 requests | 1 minute |
| WS /ws/leaderboard | 5 connections | per user |

### 4. Idempotency

- Each action has a unique `actionId`
- Store processed action IDs in Redis with 24-hour TTL
- Reject duplicate submissions with `409 Conflict`

### 5. Request Signing

```typescript
// Client-side signature generation
const payload = {
  actionId: "abc-123",
  actionToken: "eyJ...",
  timestamp: "2024-01-15T10:30:00Z"
};

const signature = HMAC_SHA256(
  JSON.stringify(payload),
  clientSecret
);
```

### 6. Additional Security Measures

- **IP-based Rate Limiting**: Prevent distributed attacks
- **Anomaly Detection**: Flag unusual score patterns
- **Audit Logging**: Log all score changes for review
- **HTTPS Only**: Enforce TLS for all connections
- **CORS Configuration**: Restrict origins

---

## Real-Time Updates

### Implementation Options

#### Option A: WebSocket (Recommended)

**Pros:**
- Bi-directional communication
- Low latency
- Efficient for frequent updates

**Cons:**
- More complex to implement
- Connection management overhead

#### Option B: Server-Sent Events (SSE)

**Pros:**
- Simpler implementation
- Built-in reconnection
- Works over HTTP

**Cons:**
- Unidirectional only
- Limited browser connections per domain

### Recommended Architecture

```typescript
// WebSocket Manager Pseudocode
class LeaderboardWebSocketManager {
  private connections: Map<string, WebSocket>;
  private redisSubscriber: RedisClient;

  async initialize() {
    // Subscribe to Redis channel for score updates
    this.redisSubscriber.subscribe('leaderboard:updates');
    
    this.redisSubscriber.on('message', (channel, message) => {
      this.broadcastToAll(JSON.parse(message));
    });
  }

  handleConnection(ws: WebSocket, userId: string) {
    this.connections.set(userId, ws);
    
    // Send current leaderboard on connect
    this.sendCurrentLeaderboard(ws);
    
    ws.on('close', () => {
      this.connections.delete(userId);
    });
  }

  broadcastToAll(update: LeaderboardUpdate) {
    this.connections.forEach((ws) => {
      ws.send(JSON.stringify({
        type: 'LEADERBOARD_UPDATE',
        data: update
      }));
    });
  }
}
```

---

## Implementation Guidelines

### Technology Stack Recommendations

| Component | Recommended Technology |
|-----------|----------------------|
| Runtime | Node.js / Go / Rust |
| Framework | Express.js / Fastify / Gin |
| Database | PostgreSQL |
| Cache | Redis |
| WebSocket | Socket.io / ws / native |
| Message Queue | Redis Pub/Sub / RabbitMQ |
| Authentication | JWT with RSA-256 |

### Database Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for leaderboard queries
CREATE INDEX idx_users_score_desc ON users(score DESC);

-- Action logs for audit
CREATE TABLE action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action_id VARCHAR(255) UNIQUE NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    score_awarded INTEGER NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for idempotency checks
CREATE INDEX idx_action_logs_action_id ON action_logs(action_id);
```

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CACHING STRATEGY                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  GET /leaderboard                                                   │
│       │                                                              │
│       ▼                                                              │
│  ┌─────────────┐     Cache Hit     ┌─────────────┐                  │
│  │ Check Redis │ ─────────────────>│ Return Data │                  │
│  │   Cache     │                   └─────────────┘                  │
│  └──────┬──────┘                                                     │
│         │ Cache Miss                                                 │
│         ▼                                                            │
│  ┌─────────────┐                                                     │
│  │ Query DB    │                                                     │
│  │ (PostgreSQL)│                                                     │
│  └──────┬──────┘                                                     │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────┐                                                     │
│  │ Update Redis│◄── TTL: 5 seconds (short for real-time accuracy)   │
│  │ Cache       │                                                     │
│  └──────┬──────┘                                                     │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────┐                                                     │
│  │ Return Data │                                                     │
│  └─────────────┘                                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Improvements & Recommendations

### 1. Scalability Improvements

- **Horizontal Scaling**: Deploy multiple application server instances behind a load balancer
- **Database Read Replicas**: Use read replicas for leaderboard queries
- **Redis Cluster**: Implement Redis clustering for high availability
- **CDN for Static Assets**: Serve user avatars and static content via CDN

### 2. Performance Optimizations

- **Batch Score Updates**: Aggregate score updates and process in batches during high traffic
- **Leaderboard Pagination**: Implement cursor-based pagination for better performance
- **Connection Pooling**: Use connection pooling for database and Redis connections
- **Response Compression**: Enable gzip/brotli compression for API responses

### 3. Enhanced Security

- **Two-Factor Action Verification**: For high-value score actions, require additional verification
- **Device Fingerprinting**: Track device fingerprints to detect suspicious patterns
- **Behavioral Analysis**: Implement ML-based anomaly detection for score patterns
- **Score Adjustment System**: Admin ability to adjust/rollback fraudulent scores
- **Captcha Integration**: Add captcha for suspicious activity patterns

### 4. Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MONITORING STACK                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   Metrics   │  │   Logging   │  │   Tracing   │                  │
│  │ (Prometheus)│  │   (ELK)     │  │  (Jaeger)   │                  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │
│         │                │                │                          │
│         └────────────────┼────────────────┘                          │
│                          │                                           │
│                          ▼                                           │
│                   ┌─────────────┐                                    │
│                   │  Grafana    │                                    │
│                   │  Dashboard  │                                    │
│                   └─────────────┘                                    │
│                                                                      │
│  Key Metrics to Track:                                               │
│  • Score update request rate                                         │
│  • API response times (p50, p95, p99)                               │
│  • WebSocket connection count                                        │
│  • Cache hit/miss ratio                                              │
│  • Error rates by endpoint                                           │
│  • Suspicious activity alerts                                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 5. Reliability Improvements

- **Circuit Breaker Pattern**: Implement circuit breakers for external service calls
- **Graceful Degradation**: Serve cached leaderboard if database is unavailable
- **Retry Mechanisms**: Implement exponential backoff for failed operations
- **Health Check Endpoints**: Add `/health` and `/ready` endpoints for orchestration

### 6. Feature Enhancements

- **Time-based Leaderboards**: Daily/weekly/monthly leaderboards
- **User Groups/Teams**: Support for team-based scoring
- **Achievement System**: Badges and milestones for score thresholds
- **Score History**: Track score progression over time
- **Notifications**: Push notifications for rank changes

### 7. Testing Requirements

- **Unit Tests**: Coverage for all service methods
- **Integration Tests**: API endpoint testing with database
- **Load Testing**: Simulate high concurrent score updates
- **Security Testing**: Penetration testing for score manipulation
- **Chaos Testing**: Test system behavior under failure conditions

---

## Summary

This specification provides a comprehensive architecture for implementing a secure, real-time scoreboard system. The key components are:

1. **Secure Score Updates**: Multi-layered validation including JWT auth, action tokens, and signature verification
2. **Real-Time Updates**: WebSocket-based live leaderboard updates using Redis Pub/Sub
3. **Performance**: Redis caching and optimized database queries
4. **Scalability**: Horizontally scalable architecture with clear separation of concerns
5. **Security**: Multiple anti-cheat mechanisms and audit logging

The backend engineering team should implement these specifications while following the provided guidelines and considering the recommended improvements based on actual usage patterns and requirements.

---

## Document Information

| Field | Value |
|-------|-------|
| Version | 1.0.0 |
| Created | 2026-02-02 |
| Author | Architecture Team |
| Status | Draft |
| Review Required | Yes |
