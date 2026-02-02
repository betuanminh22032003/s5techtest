# Problem 6: Scoreboard Module Architecture Specification

## Overview

This document specifies the architecture for a **production-grade, real-time scoreboard module** designed to handle **millions of score updates per day** (100M+ DAU scale) with live updates displaying the top 10 user scores. The module includes secure score update mechanisms to prevent unauthorized score manipulation and is built for horizontal scalability.

---

## Table of Contents

1. [Requirements](#requirements)
2. [System Architecture](#system-architecture)
3. [Flow Diagrams](#flow-diagrams)
4. [API Specifications](#api-specifications)
5. [Data Models](#data-models)
6. [Deep Dive: Scalability](#deep-dive-scalability)
7. [Security Measures](#security-measures)
8. [Real-Time Updates](#real-time-updates)
9. [Failure Recovery](#failure-recovery)
10. [Implementation Guidelines](#implementation-guidelines)
11. [Improvements & Recommendations](#improvements--recommendations)

---

## Requirements

### Functional Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| FR1 | Ingest & Update Score | Accept score updates with idempotency key; maintain non-decreasing scores |
| FR2 | View Global Rank + K Neighbors | Return user's score, rank, and K players above/below |
| FR3 | View Top-N Leaderboard | Return top N entries (default: 10) with near real-time refresh |
| FR4 | Live Updates | Push leaderboard changes to connected clients in real-time |

### Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR1 | Correctness | Scores never lost, mis-ordered, or double-counted |
| NFR2 | Write Latency | p95 ≤ 500ms, p99 ≤ 1s for score visibility |
| NFR3 | Read Latency | p95 ≤ 100ms, p99 ≤ 500ms for leaderboard queries |
| NFR4 | Availability | ≥ 99.9% uptime with graceful degradation |
| NFR5 | Scalability | Handle 100-300M score updates/day (~10K updates/sec peak) |
| NFR6 | Security | Prevent unauthorized score manipulation |

---

## System Architecture

### High-Level Architecture (Million-Scale Design)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  CLIENT LAYER                                        │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐                │
│  │   Web Browser   │     │  Mobile Client  │     │   Game Client   │                │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘                │
│           └───────────────────────┼───────────────────────┘                          │
│                          ┌────────▼────────┐                                         │
│                          │  WebSocket/SSE  │  (Real-time leaderboard updates)        │
│                          └────────┬────────┘                                         │
└───────────────────────────────────┼─────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────────────┐
│                          API GATEWAY / LOAD BALANCER                                 │
│                   ┌───────────────▼───────────────┐                                  │
│                   │     Rate Limiter + Auth       │                                  │
│                   │     (Per-user & Per-IP)       │                                  │
│                   └───────────────┬───────────────┘                                  │
└───────────────────────────────────┼─────────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────────────────┐
│                           APPLICATION LAYER                                          │
│    ┌──────────────────────────────┼──────────────────────────────┐                  │
│    │                              │                               │                  │
│    ▼                              ▼                               ▼                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐              │
│  │ Score Ingestion  │  │   Leaderboard    │  │   WebSocket Manager  │              │
│  │    Service       │  │   Read Service   │  │   (Connection Pool)  │              │
│  │                  │  │                  │  │                      │              │
│  │ • Validate Auth  │  │ • Top-N queries  │  │ • Subscribe clients  │              │
│  │ • Validate Action│  │ • Rank + K nbrs  │  │ • Broadcast updates  │              │
│  │ • Idempotency    │  │ • Cache lookups  │  │ • Heartbeat/Reconnect│              │
│  │ • Update Score   │  │                  │  │                      │              │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘              │
│           │                     │                       │                           │
└───────────┼─────────────────────┼───────────────────────┼───────────────────────────┘
            │                     │                       │
┌───────────┼─────────────────────┼───────────────────────┼───────────────────────────┐
│           │              RANKING TIER                   │                            │
│           │                     │                       │                            │
│           ▼                     ▼                       │                            │
│  ┌──────────────────────────────────────────────┐      │                            │
│  │            RANKING CLUSTER (Redis)            │◄─────┘                            │
│  │  ┌────────────────────────────────────────┐  │                                   │
│  │  │  Redis Sorted Sets (ZSET) per Board    │  │  ◄── Primary ranking index        │
│  │  │  • ZADD, ZREVRANK, ZREVRANGE           │  │                                   │
│  │  │  • O(log N) updates, O(log N + K) reads│  │                                   │
│  │  └────────────────────────────────────────┘  │                                   │
│  │  ┌────────────────────────────────────────┐  │                                   │
│  │  │  Top-N Cache (Hot Range Cache)         │  │  ◄── Cache top 100-1000           │
│  │  │  • Serves Top-10/Top-100 instantly     │  │                                   │
│  │  └────────────────────────────────────────┘  │                                   │
│  │  ┌────────────────────────────────────────┐  │                                   │
│  │  │  Celebrity Cache (Per-User Cache)      │  │  ◄── Short TTL (200-500ms)        │
│  │  │  • Caches hot user rank+neighbors      │  │                                   │
│  │  └────────────────────────────────────────┘  │                                   │
│  └──────────────────────────────────────────────┘                                   │
│                          │                                                           │
└──────────────────────────┼───────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────────────────────────┐
│                          │           MESSAGE QUEUE                                    │
│                 ┌────────▼────────┐                                                  │
│                 │      Kafka      │  ◄── Ordered score events log                    │
│                 │  (score_updates │      Key: player_id                              │
│                 │     topic)      │      Enables replay & recovery                   │
│                 └────────┬────────┘                                                  │
│                          │                                                           │
│              ┌───────────┴───────────┐                                               │
│              ▼                       ▼                                               │
│    ┌──────────────────┐    ┌──────────────────┐                                     │
│    │ Ranking Updater  │    │ Ranking Updater  │  ◄── Consumers update Redis ZSETs   │
│    │   Worker #1      │    │   Worker #N      │                                     │
│    └──────────────────┘    └──────────────────┘                                     │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────────────────────────┐
│                     DATA PERSISTENCE LAYER                                           │
│           ┌──────────────┴──────────────┐                                            │
│           ▼                             ▼                                            │
│  ┌─────────────────────┐    ┌─────────────────────┐                                 │
│  │     PostgreSQL      │    │   Redis Pub/Sub     │                                 │
│  │ (Source of Truth)   │    │ (Real-time Events)  │                                 │
│  │                     │    │                     │                                 │
│  │ • leaderboard_scores│    │ • leaderboard:      │                                 │
│  │ • score_events      │    │   updates channel   │                                 │
│  │ • action_logs       │    │ • Broadcast to WS   │                                 │
│  └─────────────────────┘    └─────────────────────┘                                 │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Flow Diagrams

### Flow 1: Score Update (FR1) - Handling 10K+ Updates/Second

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Client  │   │   API    │   │  Auth    │   │  Score   │   │  Kafka   │   │ Ranking  │
│ (Action) │   │ Gateway  │   │Middleware│   │ Ingestion│   │  Queue   │   │ Updater  │
└────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │              │              │              │
     │ 1. POST /scores/update      │              │              │              │
     │    {action_id, action_token}│              │              │              │
     │─────────────>│              │              │              │              │
     │              │              │              │              │              │
     │              │ 2. Rate Limit│              │              │              │
     │              │    Check     │              │              │              │
     │              │─────────────>│              │              │              │
     │              │              │              │              │              │
     │              │              │ 3. Validate  │              │              │
     │              │              │    JWT + Action Token       │              │
     │              │              │─────────────>│              │              │
     │              │              │              │              │              │
     │              │              │              │ 4. Check Idempotency        │
     │              │              │              │    (action_id in DB?)       │
     │              │              │              │────────┐     │              │
     │              │              │              │        │     │              │
     │              │              │              │<───────┘     │              │
     │              │              │              │              │              │
     │              │              │              │ 5. Upsert leaderboard_scores│
     │              │              │              │    (DB - source of truth)   │
     │              │              │              │────────┐     │              │
     │              │              │              │        │     │              │
     │              │              │              │<───────┘     │              │
     │              │              │              │              │              │
     │              │              │              │ 6. Publish to Kafka         │
     │              │              │              │    {player_id, score, ts}   │
     │              │              │              │─────────────>│              │
     │              │              │              │              │              │
     │              │              │              │              │ 7. Consumer  │
     │              │              │              │              │    updates   │
     │              │              │              │              │    Redis ZSET│
     │              │              │              │              │─────────────>│
     │              │              │              │              │              │
     │              │              │              │              │ 8. Publish   │
     │              │              │              │              │    to Pub/Sub│
     │              │              │              │              │    (for WS)  │
     │<─────────────────────────────────────────────────────────────────────────│
     │    9. Response {score, rank, update_applied}             │              │
     │              │              │              │              │              │
```

### Flow 2: Get Top-N Leaderboard (FR3) - Sub-100ms Response

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Client  │   │   API    │   │Leaderboard│  │ Top-N    │   │  Redis   │
│          │   │ Gateway  │   │  Service  │  │  Cache   │   │  ZSET    │
└────┬─────┘   └────┬─────┘   └────┬──────┘  └────┬─────┘   └────┬─────┘
     │              │              │              │              │
     │ GET /leaderboard?n=10       │              │              │
     │─────────────>│              │              │              │
     │              │─────────────>│              │              │
     │              │              │              │              │
     │              │              │ 1. Check     │              │
     │              │              │    Top-N Cache              │
     │              │              │─────────────>│              │
     │              │              │              │              │
     │              │              │   ┌──────────┴──────────┐   │
     │              │              │   │   CACHE HIT?        │   │
     │              │              │   └──────────┬──────────┘   │
     │              │              │              │              │
     │              │              │   YES ───────┤              │
     │              │              │◄─────────────┤              │
     │              │              │  Return cached top 10       │
     │              │              │              │              │
     │              │              │   NO ────────┤              │
     │              │              │              │              │
     │              │              │ 2. ZREVRANGE │              │
     │              │              │    0..N-1    │              │
     │              │              │──────────────┼─────────────>│
     │              │              │              │              │
     │              │              │◄─────────────┼──────────────│
     │              │              │              │              │
     │              │              │ 3. Update    │              │
     │              │              │    Top-N Cache              │
     │              │              │─────────────>│              │
     │              │              │              │              │
     │◄─────────────────────────────              │              │
     │  {leaderboard: [...], updated_at}         │              │
```

### Flow 3: Get My Rank + K Neighbors (FR2)

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  Client  │   │   API    │   │Leaderboard│  │ Celebrity│   │  Redis   │
│          │   │ Gateway  │   │  Service  │  │  Cache   │   │  ZSET    │
└────┬─────┘   └────┬─────┘   └────┬──────┘  └────┬─────┘   └────┬─────┘
     │              │              │              │              │
     │ GET /scores/me/rank?k=5     │              │              │
     │─────────────>│              │              │              │
     │              │─────────────>│              │              │
     │              │              │              │              │
     │              │              │ 1. Check     │              │
     │              │              │    Celebrity │              │
     │              │              │    Cache     │              │
     │              │              │─────────────>│              │
     │              │              │              │              │
     │              │              │   MISS ──────┤              │
     │              │              │              │              │
     │              │              │ 2. ZREVRANK  │              │
     │              │              │    (get idx) │              │
     │              │              │──────────────┼─────────────>│
     │              │              │◄─────────────┼──────────────│
     │              │              │   idx = 451  │              │
     │              │              │              │              │
     │              │              │ 3. ZREVRANGE │              │
     │              │              │  [idx-K, idx+K]             │
     │              │              │──────────────┼─────────────>│
     │              │              │◄─────────────┼──────────────│
     │              │              │              │              │
     │              │              │ 4. Cache result             │
     │              │              │    (TTL: 300ms)             │
     │              │              │─────────────>│              │
     │              │              │              │              │
     │◄─────────────────────────────              │              │
     │  {rank: 452, score: 12345, neighbors: [...]}              │
```

### Flow 4: Real-Time Leaderboard Update (FR4)

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Clients    │   │  WebSocket   │   │    Redis     │   │   Ranking    │
│ (Subscribed) │   │   Manager    │   │   Pub/Sub    │   │   Updater    │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │                  │
       │ 1. WS Connect    │                  │                  │
       │  /ws/leaderboard │                  │                  │
       │─────────────────>│                  │                  │
       │                  │                  │                  │
       │                  │ 2. Subscribe     │                  │
       │                  │    to channel    │                  │
       │                  │─────────────────>│                  │
       │                  │                  │                  │
       │ 3. Send current  │                  │                  │
       │    leaderboard   │                  │                  │
       │◄─────────────────│                  │                  │
       │                  │                  │                  │
       │                  │                  │   4. Score       │
       │                  │                  │      Updated     │
       │                  │                  │◄─────────────────│
       │                  │                  │                  │
       │                  │ 5. Receive msg   │                  │
       │                  │◄─────────────────│                  │
       │                  │                  │                  │
       │ 6. Broadcast     │                  │                  │
       │    if top-10     │                  │                  │
       │    changed       │                  │                  │
       │◄─────────────────│                  │                  │
       │                  │                  │                  │
```

---

## API Specifications

### Base URL
```
https://api.example.com/v1
```

### Endpoints

#### 1. Update Score (FR1)

**POST** `/scores/update`

Updates the user's score after completing an action.

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
X-Request-ID: <UNIQUE_REQUEST_ID>
X-Idempotency-Key: <ACTION_ID>
```

**Request Body:**
```json
{
  "action_id": "match-uuid-123",      // Unique action identifier (idempotency key)
  "action_token": "eyJ...",           // Server-generated proof of action completion
  "new_score": 12345,                 // Score achieved in this action
  "timestamp": "2026-02-02T10:30:00Z" // When action was completed
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "player_id": "user_123",
    "leaderboard_id": "global-2026-02",
    "score": 12345,
    "previous_score": 12000,
    "last_action_id": "match-uuid-123",
    "rank": 452,
    "update_applied": true,
    "updated_at": "2026-02-02T10:30:00Z"
  }
}
```

**Behavior Guarantees:**
- **Non-decreasing**: If `new_score < current_score`, update is ignored
- **Idempotent**: If `action_id` already processed, returns existing score with `update_applied: false`

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | INVALID_REQUEST | Missing or invalid parameters |
| 401 | UNAUTHORIZED | Invalid or expired JWT |
| 403 | FORBIDDEN | Action token validation failed |
| 409 | DUPLICATE_ACTION | Action already processed |
| 429 | RATE_LIMITED | Too many requests |

---

#### 2. Get Leaderboard (FR3)

**GET** `/leaderboard`

Retrieves the top N scores.

**Query Parameters:**
| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| n | integer | 10 | 100 | Number of entries to return |
| cursor | string | null | - | Cursor for pagination |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "leaderboard_id": "global-2026-02",
    "top_n": 10,
    "entries": [
      { "rank": 1, "player_id": "p1", "username": "Champion", "score": 50000, "avatar_url": "..." },
      { "rank": 2, "player_id": "p2", "username": "ProPlayer", "score": 48500, "avatar_url": "..." },
      { "rank": 3, "player_id": "p3", "username": "Legend", "score": 47200, "avatar_url": "..." }
    ],
    "updated_at": "2026-02-02T10:30:00Z",
    "next_cursor": "eyJ..."
  }
}
```

---

#### 3. Get My Rank + Neighbors (FR2)

**GET** `/scores/me/rank`

Retrieves authenticated user's rank and K neighbors.

**Headers:**
```http
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| k | integer | 5 | Number of neighbors above/below |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "player_id": "user_123",
    "score": 12345,
    "global_rank": 452,
    "percentile": 95.5,
    "neighbors": [
      { "player_id": "p119", "score": 12410, "rank": 450 },
      { "player_id": "p402", "score": 12380, "rank": 451 },
      { "player_id": "user_123", "score": 12345, "rank": 452, "self": true },
      { "player_id": "p777", "score": 12340, "rank": 453 },
      { "player_id": "p990", "score": 12320, "rank": 454 }
    ]
  }
}
```

---

#### 4. WebSocket Connection (FR4)

**WS** `/ws/leaderboard`

Establishes WebSocket connection for real-time updates.

**Connection URL:**
```
wss://api.example.com/v1/ws/leaderboard?token=<JWT_TOKEN>
```

**Server-Sent Messages:**

*Leaderboard Update (when top-10 changes):*
```json
{
  "type": "LEADERBOARD_UPDATE",
  "data": {
    "entries": [...],
    "updated_at": "2026-02-02T10:30:01Z"
  }
}
```

*Personal Score Update:*
```json
{
  "type": "SCORE_UPDATE",
  "data": {
    "player_id": "user_123",
    "new_score": 12500,
    "new_rank": 420,
    "rank_change": "+32"
  }
}
```

---

## Data Models

### Core Entities (PostgreSQL - Source of Truth)

```sql
-- Leaderboards metadata
CREATE TABLE leaderboards (
    leaderboard_id VARCHAR(100) PRIMARY KEY,
    game_id VARCHAR(50) NOT NULL,
    mode VARCHAR(20) DEFAULT 'HIGH_SCORE',
    region VARCHAR(20) DEFAULT 'GLOBAL',
    period_type VARCHAR(20) DEFAULT 'MONTHLY',  -- DAILY, WEEKLY, MONTHLY, SEASONAL
    period_start_ts TIMESTAMP NOT NULL,
    period_end_ts TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ACTIVE',        -- ACTIVE, FROZEN, ARCHIVED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Canonical per-player score state
CREATE TABLE leaderboard_scores (
    leaderboard_id VARCHAR(100) NOT NULL,
    player_id UUID NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    last_action_id VARCHAR(255),                -- For idempotency
    last_update_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,                  -- Optimistic locking
    PRIMARY KEY (leaderboard_id, player_id)
);

-- Index for ranking queries (when Redis is unavailable)
CREATE INDEX idx_scores_rank ON leaderboard_scores(
    leaderboard_id, 
    score DESC, 
    last_update_ts ASC, 
    player_id ASC
);

-- Append-only event log (for audit and recovery)
CREATE TABLE score_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leaderboard_id VARCHAR(100) NOT NULL,
    player_id UUID NOT NULL,
    action_id VARCHAR(255) NOT NULL,
    new_score INTEGER NOT NULL,
    event_ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    UNIQUE (leaderboard_id, player_id, action_id)  -- Idempotency constraint
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Redis Data Structures (Ranking Tier)

```
# ═══════════════════════════════════════════════════════════════════════
# REDIS SORTED SETS (ZSET) - Primary Ranking Index
# ═══════════════════════════════════════════════════════════════════════

# One ZSET per leaderboard - ALL ranking operations happen here
# Key: leaderboard:{leaderboard_id}
# Member: player_id
# Score: composite score (for deterministic ordering)

ZADD leaderboard:global-2026-02 12345 "user_123"

# Key operations:
ZADD     key score member    # O(log N) - Add/update score
ZREVRANK key member          # O(log N) - Get rank (0-indexed, desc)
ZREVRANGE key start stop     # O(log N + K) - Get range by rank
ZSCORE   key member          # O(1) - Get score
ZCARD    key                 # O(1) - Get total count

# Example: Get top 10
ZREVRANGE leaderboard:global-2026-02 0 9 WITHSCORES

# Example: Get rank of user
ZREVRANK leaderboard:global-2026-02 "user_123"

# Example: Get neighbors (rank 450-454)
ZREVRANGE leaderboard:global-2026-02 449 453 WITHSCORES


# ═══════════════════════════════════════════════════════════════════════
# TOP-N CACHE (Hot Range Cache)
# ═══════════════════════════════════════════════════════════════════════

# Pre-computed top 100-1000 for instant access
# Refreshed on every top-window update
toprange:{leaderboard_id} -> LIST/JSON with TTL

# ═══════════════════════════════════════════════════════════════════════
# CELEBRITY CACHE (Per-User Result Cache)
# ═══════════════════════════════════════════════════════════════════════

# Short-TTL cache for hot users (celebrities with many viewers)
# Key: celebrity:{leaderboard_id}:{player_id}:{k}
# Value: JSON {rank, score, neighbors[]}
# TTL: 200-500ms

SET celebrity:global-2026-02:user_123:5 "{...}" EX 0.3


# ═══════════════════════════════════════════════════════════════════════
# IDEMPOTENCY & RATE LIMITING
# ═══════════════════════════════════════════════════════════════════════

# Processed actions (24h TTL)
SET action:processed:{action_id} 1 EX 86400

# Rate limiting counters
INCR rate_limit:{user_id}:score_update
EXPIRE rate_limit:{user_id}:score_update 60
```

---

## Deep Dive: Scalability

### Why Redis Sorted Sets (ZSET)?

| Operation | ZSET Complexity | SQL Complexity |
|-----------|-----------------|----------------|
| Update score | O(log N) | O(log N) + write locks |
| Get rank | O(log N) | O(N) full table scan |
| Get top-N | O(log N + K) | O(N log N) sort |
| Get K neighbors | O(log N + K) | O(N) + window function |

**Key Insight**: ZSET provides O(log N) ranking operations vs O(N) for SQL, making it ideal for real-time leaderboards.

### Sharding Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SHARDING BY LEADERBOARD_ID                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Each leaderboard lives on ONE Redis node (no cross-shard queries)          │
│                                                                              │
│  node = hash(leaderboard_id) mod R                                          │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ Redis Node 0    │  │ Redis Node 1    │  │ Redis Node 2    │              │
│  │                 │  │                 │  │                 │              │
│  │ lb:global-daily │  │ lb:global-weekly│  │ lb:na-monthly   │              │
│  │ lb:eu-weekly    │  │ lb:apac-daily   │  │ lb:global-season│              │
│  │ ...             │  │ ...             │  │ ...             │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                              │
│  Benefits:                                                                   │
│  ✓ No scatter-gather for Top-N or rank queries                              │
│  ✓ Horizontal scaling by adding more leaderboard scopes                     │
│  ✓ Each node handles full ZSET operations locally                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Handling Hotspots (Top of Leaderboard & Celebrity Users)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      HOTSPOT MITIGATION STRATEGY                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PROBLEM: Top-10 page and celebrity profiles get millions of views          │
│                                                                              │
│  SOLUTION 1: Top-N Cache (Hot Range Cache)                                  │
│  ─────────────────────────────────────────────                              │
│  • Pre-compute top 100-1000 entries                                         │
│  • Refresh ONLY when a score in the top window changes                      │
│  • Serve Top-10 requests from cache (not ZSET)                              │
│                                                                              │
│  SOLUTION 2: Celebrity Cache (Per-User Cache)                               │
│  ─────────────────────────────────────────────                              │
│  • Cache (player_id, k) -> {rank, neighbors} with 200-500ms TTL             │
│  • Thousands of fans share same cached response                             │
│  • Redis ZSET only hit once per TTL window                                  │
│                                                                              │
│  SOLUTION 3: Request Coalescing                                             │
│  ─────────────────────────────────────                                      │
│  • Multiple simultaneous requests for same key → single ZSET call           │
│  • Prevents thundering herd on cache miss                                   │
│                                                                              │
│  SOLUTION 4: Rate Limiting                                                  │
│  ─────────────────────────                                                  │
│  • Per-user and per-IP limits on rank queries                               │
│  • Return cached data with "please slow down" for excessive requests        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Security Measures

### Multi-Layer Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SECURITY LAYERS                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LAYER 1: Authentication                                                     │
│  ─────────────────────────                                                  │
│  • JWT with short expiration (15-30 min)                                    │
│  • Refresh token rotation                                                   │
│  • Token validation on every request                                        │
│                                                                              │
│  LAYER 2: Action Validation (Anti-Cheat)                                    │
│  ───────────────────────────────────────                                    │
│  ┌─────────────────────────────────────────────────────────────┐            │
│  │  1. Client starts action                                     │            │
│  │     → Server generates action_token with:                    │            │
│  │       - action_id (UUID)                                     │            │
│  │       - player_id                                            │            │
│  │       - expected_duration                                    │            │
│  │       - timestamp                                            │            │
│  │       - HMAC signature (server secret)                       │            │
│  │                                                              │            │
│  │  2. Client completes action                                  │            │
│  │     → Submits action_token + new_score                       │            │
│  │                                                              │            │
│  │  3. Server validates:                                        │            │
│  │     ✓ Token signature is valid                               │            │
│  │     ✓ Token not expired                                      │            │
│  │     ✓ Token not already used (idempotency)                   │            │
│  │     ✓ Time between start/completion is reasonable            │            │
│  │     ✓ Score is within expected bounds                        │            │
│  └─────────────────────────────────────────────────────────────┘            │
│                                                                              │
│  LAYER 3: Rate Limiting                                                     │
│  ──────────────────────                                                     │
│  │ Endpoint             │ Limit      │ Window │                             │
│  │ POST /scores/update  │ 10 req     │ 1 min  │                             │
│  │ GET /leaderboard     │ 60 req     │ 1 min  │                             │
│  │ GET /scores/me/rank  │ 30 req     │ 1 min  │                             │
│  │ WS connections       │ 5          │ user   │                             │
│                                                                              │
│  LAYER 4: Idempotency                                                       │
│  ────────────────────                                                       │
│  • Every action has unique action_id                                        │
│  • Stored in DB with UNIQUE constraint + Redis cache (24h TTL)              │
│  • Duplicate submissions return 409 Conflict                                │
│                                                                              │
│  LAYER 5: Audit Logging                                                     │
│  ──────────────────────                                                     │
│  • All score changes logged to score_events table                           │
│  • IP address and user agent captured                                       │
│  • Enables forensic analysis and rollback                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Real-Time Updates

### WebSocket Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      REAL-TIME UPDATE ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. CONNECTION MANAGEMENT                                                    │
│  ────────────────────────                                                   │
│  • WebSocket Manager maintains connection pool per server                   │
│  • Heartbeat every 30s to detect stale connections                          │
│  • Auto-reconnect with exponential backoff on client                        │
│                                                                              │
│  2. SUBSCRIPTION MODEL                                                       │
│  ─────────────────────                                                      │
│  • Clients subscribe to leaderboard channel on connect                      │
│  • Server tracks subscriptions per leaderboard_id                           │
│  • Unsubscribe on disconnect                                                │
│                                                                              │
│  3. BROADCAST STRATEGY                                                       │
│  ─────────────────────                                                      │
│  • Score update → Check if affects top-10                                   │
│  • If yes → Publish to Redis Pub/Sub channel                                │
│  • All WS Managers receive → Broadcast to subscribed clients                │
│  • Delta updates (only changed entries) to minimize payload                 │
│                                                                              │
│  4. SCALABILITY                                                             │
│  ─────────────                                                              │
│  • Multiple WS Manager instances behind load balancer                       │
│  • Redis Pub/Sub for cross-instance messaging                               │
│  • Sticky sessions (optional) for connection affinity                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Failure Recovery

### Recovery from Redis/Cache Loss

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FAILURE RECOVERY STRATEGY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCENARIO: Redis ranking cluster loses data                                  │
│                                                                              │
│  STEP 1: Detect failure & mark leaderboards as DEGRADED                     │
│  ──────────────────────────────────────────────────────                     │
│  • Health checks detect missing ZSETs                                       │
│  • Mark affected leaderboard_ids as DEGRADED_REBUILDING                     │
│                                                                              │
│  STEP 2: Fallback to DB for reads (graceful degradation)                    │
│  ───────────────────────────────────────────────────────                    │
│  • Top-N: Query leaderboard_scores with ORDER BY ... LIMIT N                │
│  • Rank: COUNT(*) query to compute rank                                     │
│  • Show "leaderboard syncing" indicator to users                            │
│  • Higher latency but still functional (NFR3 availability)                  │
│                                                                              │
│  STEP 3: Rebuild ZSETs from DB snapshot                                     │
│  ─────────────────────────────────────────                                  │
│  • Rebuild worker scans leaderboard_scores:                                 │
│    SELECT player_id, score FROM leaderboard_scores WHERE leaderboard_id=:lb │
│  • ZADD each row into fresh Redis ZSET                                      │
│                                                                              │
│  STEP 4: Catch up from Kafka                                                │
│  ────────────────────────────                                               │
│  • Consume score_updates topic from snapshot time                           │
│  • Apply updates with version check (idempotent)                            │
│  • When lag ≈ 0, mark leaderboard as HEALTHY                                │
│                                                                              │
│  STEP 5: Resume normal operation                                            │
│  ────────────────────────────────                                           │
│  • Switch reads back to Redis + caches                                      │
│  • Top-N cache and celebrity cache auto-warm on demand                      │
│                                                                              │
│  KEY INSIGHT: DB = source of truth, Kafka = ordered log, Redis = fast cache │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Guidelines

### Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| API Server | Node.js (Fastify) / Go | High concurrency, low latency |
| Database | PostgreSQL | ACID, reliable, source of truth |
| Ranking Store | Redis (Cluster) | ZSET for O(log N) ranking |
| Message Queue | Kafka | Ordered logs, replay capability |
| Real-time | WebSocket (Socket.io/ws) | Bi-directional, low latency |
| Cache | Redis | Sub-ms reads |
| Auth | JWT (RS256) | Stateless, secure |

### Latency Budget

```
┌─────────────────────────────────────────────────────────────────┐
│                    LATENCY BREAKDOWN (p95)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Score Update (Target: ≤500ms)                                  │
│  ─────────────────────────────                                  │
│  • API Gateway + Auth:     10ms                                 │
│  • Validation:             5ms                                  │
│  • DB Upsert:              20ms                                 │
│  • Kafka Publish:          5ms                                  │
│  • Response:               5ms                                  │
│  • TOTAL:                  ~45ms (well under budget)            │
│                                                                  │
│  Leaderboard Read (Target: ≤100ms)                              │
│  ──────────────────────────────────                             │
│  • API Gateway:            5ms                                  │
│  • Cache Check (Redis):    1ms                                  │
│  • ZREVRANGE (if miss):    2ms                                  │
│  • Response:               2ms                                  │
│  • TOTAL:                  ~10ms (10x under budget)             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Improvements & Recommendations

### 1. Extended Leaderboard Features

| Feature | Description | Implementation |
|---------|-------------|----------------|
| Time-windowed boards | Daily/Weekly/Monthly/Seasonal | Separate leaderboard_id per period |
| Regional boards | NA/EU/APAC scopes | Region prefix in leaderboard_id |
| Friends leaderboard | Rank among friends | Social graph + on-demand intersection |
| Team/Guild boards | Aggregate team scores | Separate ZSET with team_id |

### 2. Advanced Anti-Cheat

- **Behavioral Analysis**: ML model to detect anomalous score patterns
- **Device Fingerprinting**: Track device signatures for multi-account detection
- **Score Velocity Checks**: Flag users with impossible score increases
- **Server-Side Game Logic**: Critical game logic runs on server, not client

### 3. Monitoring & Alerting

```
Key Metrics to Track:
─────────────────────
• Score update rate (req/sec)
• Leaderboard read rate (req/sec)
• Redis ZSET operation latency (p50, p95, p99)
• Cache hit ratio (Top-N, Celebrity)
• Kafka consumer lag
• WebSocket connection count
• Error rates by endpoint
• Suspicious activity alerts
```

### 4. Cost Optimization

- **Tiered Storage**: Archive old leaderboards to cold storage
- **Smart Caching**: Longer TTL for lower-ranked users
- **Connection Pooling**: Reduce Redis/DB connection overhead
- **Batch Updates**: Aggregate updates during traffic spikes

---

## Summary

This specification provides a **production-grade architecture** for implementing a real-time scoreboard system capable of handling **millions of requests per day**:

| Aspect | Solution |
|--------|----------|
| **Performance** | Redis ZSET for O(log N) ranking operations |
| **Scalability** | Sharding by leaderboard_id, horizontal scaling |
| **Hotspot Handling** | Top-N cache + Celebrity cache + rate limiting |
| **Security** | JWT + Action tokens + Idempotency + Audit logging |
| **Real-time** | WebSocket + Redis Pub/Sub |
| **Reliability** | DB source of truth + Kafka replay + graceful degradation |
| **Latency** | p95 < 100ms reads, p95 < 500ms writes |

The backend engineering team should implement these specifications following the provided workflows and data models.

---

## Document Information

| Field | Value |
|-------|-------|
| Version | 2.0.0 |
| Created | 2026-02-02 |
| Author | Architecture Team |
| Status | Draft |
| Review Required | Yes |
| Reference | [ShowOffer Leaderboard Design](https://www.showoffer.io/learn/system-design/questions/leaderboard) |
