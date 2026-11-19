# ASHA — API Specification

**Product:** ASHA — Allocation, Shares & Honest Accounts  
**API base path:** `/api/v1`  
**Version:** v2.0  
**Status:** MVP API contract  

## 1. API principles

- RESTful JSON API.
- All endpoints are versioned under `/api/v1`.
- Supabase JWT is used for authentication.
- FastAPI performs role-based and SHG-membership authorization.
- Supabase Row-Level Security provides a second layer of protection.
- All monetary values use INR and are represented as decimal values with two decimal places.
- AI endpoints return drafts; they never directly finalize allocation, cost, or payout.
- Every state-changing business action creates an audit event where applicable.
- OpenAPI documentation is available at `/docs`.

## 2. Authentication

Use Supabase Auth with email and password.

```http
Authorization: Bearer <supabase_jwt>
```

The backend validates the JWT, loads the user profile, resolves the active role, and verifies SHG membership before processing a request.

Supported roles:

- `leader`
- `member`
- `approver`
- `checker`
- `buyer`
- `federation_staff`
- `admin`

A user may hold multiple roles, but each request is executed under an explicitly selected active role.

## 3. Standard response format

### Success

```json
{
  "success": true,
  "data": {},
  "meta": {
    "request_id": "req_123",
    "timestamp": "2026-11-12T17:30:00Z"
  }
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": [
      {
        "field": "quantity",
        "issue": "Must be greater than zero"
      }
    ]
  },
  "meta": {
    "request_id": "req_124",
    "timestamp": "2026-11-12T17:30:00Z"
  }
}
```

### Error codes

| Code | HTTP status | Meaning |
|---|---:|---|
| `VALIDATION_ERROR` | 422 | Request payload or query parameters are invalid |
| `UNAUTHENTICATED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Role or SHG membership does not permit action |
| `NOT_FOUND` | 404 | Resource does not exist or is inaccessible |
| `CONFLICT` | 409 | Invalid state transition or duplicate resource |
| `RATE_LIMITED` | 429 | Too many requests |
| `AI_PROVIDER_ERROR` | 502 | LLM provider failed or returned invalid output |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## 4. Pagination

List endpoints use cursor-based pagination.

```http
GET /api/v1/orders?limit=20&cursor=eyJvcmRlcl9pZCI6IjEyMyJ9
```

Response:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "next_cursor": "eyJvcmRlcl9pZCI6IjQ1NiJ9",
    "has_more": true,
    "limit": 20
  }
}
```

## 5. Endpoint catalogue

### 5.1 Authentication and profile

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Create user account |
| POST | `/auth/login` | Public | Exchange credentials for Supabase session |
| POST | `/auth/logout` | Authenticated | End session |
| GET | `/auth/me` | Authenticated | Get current profile, roles, and SHG membership |
| PATCH | `/auth/me` | Authenticated | Update profile and preferred language |
| POST | `/auth/select-role` | Authenticated | Select active role for the session |

### 5.2 SHG and members

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/shgs/current` | Leader, member, approver, checker | Get current SHG |
| PATCH | `/shgs/current` | Leader | Update SHG settings |
| GET | `/shgs/current/members` | Leader, approver, checker | List members |
| POST | `/shgs/current/members` | Leader | Add member |
| GET | `/shgs/current/members/{member_id}` | Leader, approver, checker | Get member profile |
| PATCH | `/shgs/current/members/{member_id}` | Leader | Update member capacity, availability, skills |
| DELETE | `/shgs/current/members/{member_id}` | Leader | Soft-delete member |
| POST | `/shgs/current/members/{member_id}/skills` | Leader | Add member skill |
| DELETE | `/shgs/current/members/{member_id}/skills/{skill_id}` | Leader | Remove member skill |
| POST | `/shgs/current/members/{member_id}/availability` | Leader | Add availability window |

### 5.3 Buyers and orders

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/buyers/orders` | Buyer | Create order request |
| GET | `/buyers/orders` | Buyer | List buyer’s orders |
| GET | `/buyers/orders/{order_id}` | Buyer | Get buyer-safe order details |
| GET | `/orders` | Leader, approver, checker | List SHG orders |
| POST | `/orders` | Leader | Create order manually |
| GET | `/orders/{order_id}` | Role-based | Get order details |
| PATCH | `/orders/{order_id}` | Leader | Update order details |
| POST | `/orders/{order_id}/accept` | Leader | Accept buyer request |
| POST | `/orders/{order_id}/reject` | Leader | Reject buyer request |
| POST | `/orders/{order_id}/cancel` | Leader | Cancel order |
| POST | `/orders/{order_id}/deliver` | Leader | Mark order delivered |
| GET | `/orders/{order_id}/timeline` | Role-based | Get order event timeline |

### 5.4 Production planning

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/orders/{order_id}/plan/generate` | Leader | Start AI-assisted production-plan generation |
| GET | `/orders/{order_id}/plan/drafts/{draft_id}` | Leader | Get AI draft status and result |
| POST | `/orders/{order_id}/plan/confirm` | Leader | Confirm production plan |
| GET | `/orders/{order_id}/plan` | Leader, approver, checker | Get active production plan |
| PATCH | `/orders/{order_id}/plan` | Leader | Edit plan stages and tasks |

### 5.5 Allocation

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/orders/{order_id}/allocation/propose` | Leader | Generate deterministic allocation proposal |
| GET | `/orders/{order_id}/allocation/proposal` | Leader | Get current allocation proposal |
| PATCH | `/orders/{order_id}/allocation/proposal` | Leader | Adjust proposed allocation |
| POST | `/orders/{order_id}/allocation/confirm` | Leader | Confirm allocation and create member tasks |
| GET | `/orders/{order_id}/allocation/explanation` | Leader, approver | Get human-readable allocation explanation |

### 5.6 Member tasks

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/member/tasks` | Member | List member’s tasks |
| GET | `/member/tasks/{task_id}` | Member | Get task details |
| POST | `/member/tasks/{task_id}/accept` | Member | Accept task |
| POST | `/member/tasks/{task_id}/reject` | Member | Reject task with reason |
| POST | `/member/tasks/{task_id}/progress` | Member | Add progress update |
| POST | `/member/tasks/{task_id}/proof` | Member | Upload photo, video, or voice-note proof |
| GET | `/member/tasks/{task_id}/voice` | Member | Get task voice text or audio URL |
| GET | `/member/earnings` | Member | Get member’s own earnings summary |

### 5.7 Quality review

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/quality/review-queue` | Leader, checker | List tasks awaiting review |
| GET | `/quality/tasks/{task_id}` | Leader, checker | Get task proof and review context |
| POST | `/quality/tasks/{task_id}/review` | Leader, checker | Submit quality decision |
| POST | `/quality/tasks/{task_id}/rework` | Leader | Create rework task |
| POST | `/quality/tasks/{task_id}/reassign` | Leader | Reassign rework task |

### 5.8 Costing

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/orders/{order_id}/cost-sheet` | Leader, approver | Get current cost sheet |
| POST | `/orders/{order_id}/cost-sheet` | Leader | Create cost sheet |
| PATCH | `/orders/{order_id}/cost-sheet/{cost_sheet_id}` | Leader | Update cost inputs |
| POST | `/orders/{order_id}/cost-sheet/{cost_sheet_id}/calculate` | Leader | Recalculate costs and pricing |
| GET | `/orders/{order_id}/cost-sheet/{cost_sheet_id}/warnings` | Leader, approver | Get pricing warnings |

### 5.9 Payouts

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/orders/{order_id}/payout/calculate` | Leader | Calculate member-wise payout sheet |
| GET | `/orders/{order_id}/payout` | Leader, approver | Get payout sheet |
| GET | `/member/payouts/{payout_sheet_id}` | Member | Get member’s own payout line |
| POST | `/orders/{order_id}/payout/submit` | Leader | Submit payout for approval |
| POST | `/orders/{order_id}/payout/approve` | Approver | Approve payout |
| POST | `/orders/{order_id}/payout/reject` | Approver | Reject payout |
| POST | `/orders/{order_id}/payout/request-changes` | Approver | Request changes with note |
| GET | `/orders/{order_id}/payout/explanation` | Leader, approver, member | Get payout explanation |

### 5.10 Buyer tracking

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/buyers/orders/{order_id}/status` | Buyer | Get order status timeline |
| GET | `/buyers/orders/{order_id}/delivery-record` | Buyer | Get delivery record |
| GET | `/buyers/orders/{order_id}/media` | Buyer | Get buyer-visible finished-goods media |

### 5.11 Notifications and audit

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/notifications` | Authenticated | List notifications |
| POST | `/notifications/{notification_id}/read` | Authenticated | Mark notification as read |
| GET | `/orders/{order_id}/audit` | Leader, approver | Get order audit trail |
| GET | `/reports/summary` | Leader, approver | Get operational summary |

## 6. Key request schemas

### 6.1 Create buyer order

```http
POST /api/v1/buyers/orders
```

```json
{
  "title": "Festival tote bags",
  "required_by_date": "2026-12-01",
  "delivery_address": "Bengaluru, Karnataka",
  "special_instructions": "Use eco-friendly material",
  "items": [
    {
      "product_name": "Canvas tote bag",
      "quantity": 100,
      "unit_type": "piece",
      "specifications": {
        "size": "14 x 16 inch",
        "colour": "natural"
      }
    }
  ]
}
```

### 6.2 Allocation proposal

```http
POST /api/v1/orders/{order_id}/allocation/propose
```

```json
{
  "strategy": "FAIR_BALANCED",
  "consider_past_quality": true,
  "avoid_overload": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "proposal_id": "aloc_123",
    "order_id": "ord_123",
    "allocations": [
      {
        "member_id": "mem_1",
        "member_name": "Lakshmi",
        "task_id": "task_1",
        "allocated_quantity": 25,
        "score": 0.82,
        "reasons": [
          "High stitching proficiency",
          "Available for the full production window",
          "Low current workload"
        ]
      }
    ],
    "warnings": []
  }
}
```

### 6.3 Submit progress

```http
POST /api/v1/member/tasks/{task_id}/progress
```

```json
{
  "quantity_completed": 10,
  "note": "Completed first 10 bags",
  "voice_note_url": "https://supabase.co/storage/v1/object/sign/proof/voice_1.mp3"
}
```

### 6.4 Quality review

```http
POST /api/v1/quality/tasks/{task_id}/review
```

```json
{
  "decision": "REWORK",
  "reviewed_quantity": 10,
  "reason": "Stitching is uneven on 3 bags",
  "ai_draft_note": "Request improved edge finishing and thread tension."
}
```

### 6.5 Cost sheet

```http
POST /api/v1/orders/{order_id}/cost-sheet
```

```json
{
  "order_item_id": "item_1",
  "quantity": 100,
  "components": [
    {
      "component_type": "MATERIAL",
      "label": "Canvas fabric",
      "calculation_basis": "PER_UNIT",
      "rate": 45.00,
      "quantity": 100
    },
    {
      "component_type": "LABOUR",
      "label": "Stitching labour",
      "calculation_basis": "PER_PIECE",
      "rate": 20.00,
      "quantity": 100
    },
    {
      "component_type": "PACKAGING",
      "label": "Packaging",
      "calculation_basis": "PER_UNIT",
      "rate": 5.00,
      "quantity": 100
    }
  ],
  "margin_type": "PERCENTAGE",
  "margin_value": 20.00
}
```

### 6.6 Payout approval

```http
POST /api/v1/orders/{order_id}/payout/approve
```

```json
{
  "payout_sheet_id": "pay_123",
  "note": "Approved in group meeting"
}
```

## 7. AI endpoints

### 7.1 Planning

Production-plan generation is asynchronous.

1. `POST /orders/{order_id}/plan/generate` creates an AI draft and returns `draft_id`.
2. Frontend polls `GET /orders/{order_id}/plan/drafts/{draft_id}`.
3. When status becomes `VALID`, the frontend displays the editable draft.
4. Leader confirms the plan through `POST /orders/{order_id}/plan/confirm`.

### 7.2 Explanations

Allocation and payout explanations are synchronous because they are short, structured explanations based on already-calculated data.

```http
GET /api/v1/orders/{order_id}/allocation/explanation
```

```json
{
  "success": true,
  "data": {
    "summary": "Work was distributed based on stitching skill, available capacity, and current workload.",
    "member_explanations": [
      {
        "member_id": "mem_1",
        "member_name": "Lakshmi",
        "allocated_quantity": 25,
        "reason": "High stitching proficiency and available capacity"
      }
    ]
  }
}
```

## 8. File upload flow

ASHA uses backend-issued Supabase Storage upload URLs.

### Flow

1. Frontend requests an upload URL.
2. Backend validates role, task access, file type, and size.
3. Backend creates a signed upload URL and a `proof_media` record with status `PENDING`.
4. Frontend uploads the file directly to Supabase Storage.
5. Frontend calls the completion endpoint.
6. Backend verifies upload and marks the media record as `READY`.

### Endpoints

```http
POST /api/v1/member/tasks/{task_id}/proof/upload-url
POST /api/v1/member/tasks/{task_id}/proof/{media_id}/complete
```

### Upload URL request

```json
{
  "media_type": "PHOTO",
  "file_name": "bag_batch_1.jpg",
  "mime_type": "image/jpeg",
  "file_size_bytes": 240000
}
```

### Upload URL response

```json
{
  "success": true,
  "data": {
    "media_id": "media_123",
    "upload_url": "https://supabase.co/storage/v1/upload/...",
    "expires_at": "2026-11-12T18:00:00Z"
  }
}
```

## 9. Role authorization matrix

| Endpoint group | Leader | Member | Approver | Checker | Buyer |
|---|---|---|---|---|---|
| Create order | Yes | No | No | No | Yes |
| Review order | Yes | No | No | No | No |
| Generate plan | Yes | No | No | No | No |
| Confirm allocation | Yes | No | No | No | No |
| View own tasks | No | Yes | No | No | No |
| Update progress | No | Yes | No | No | No |
| Review quality | Yes | No | No | Yes | No |
| Manage costing | Yes | No | View only | No | No |
| Calculate payout | Yes | No | View only | No | No |
| Approve payout | No | No | Yes | No | No |
| View buyer status | No | No | No | No | Yes |
| View audit trail | Yes | No | Yes | No | No |

## 10. Rate limiting

Apply basic rate limits:

| Endpoint group | Limit |
|---|---|
| Authentication | 10 requests per minute per IP |
| AI generation | 10 requests per minute per user |
| File upload URL creation | 30 requests per hour per user |
| General authenticated endpoints | 120 requests per minute per user |

Return `429 RATE_LIMITED` when exceeded.

## 11. Webhooks

No external webhooks are required for the MVP.

Reserve webhook support for:

- Payment-gateway events after real payments are enabled.
- Buyer notification integrations.
- Federation or ERP integrations.

## 12. API implementation order

1. Auth, profile, and role selection.
2. SHG and member management.
3. Buyer order creation and leader order review.
4. Production-plan draft and confirmation.
5. Allocation proposal and confirmation.
6. Member task acceptance, progress, and proof upload.
7. Quality review and rework.
8. Costing calculation.
9. Payout calculation, submission, and approval.
10. Buyer status and delivery record.
11. Notifications, audit trail, and reports.
