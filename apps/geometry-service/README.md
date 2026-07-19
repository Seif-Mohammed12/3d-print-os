# Geometry Analysis Service

Standalone Python service for analyzing STL files in the 3D Print OS platform.

## Overview

This service provides comprehensive geometry analysis for 3D printed models, including:
- **Dimensions**: Width, height, depth
- **Volume**: 3D volume calculation
- **Surface area**: Total surface area
- **Triangle count**: Mesh complexity
- **Mesh quality**: Watertight status, manifold checks, non-manifold detection
- **Complexity scoring**: Automated complexity assessment (0-100)
- **Printability scoring**: Printability assessment (0-100) with issue identification

## Architecture

- **Framework**: FastAPI
- **Geometry Analysis**: trimesh + numpy
- **Database**: PostgreSQL (asyncpg + SQLAlchemy)
- **Logging**: structlog (structured JSON logging)
- **Testing**: pytest + pytest-asyncio

## API Endpoints

### POST /api/v1/analyze
Create a new geometry analysis request.

**Request:**
```json
{
  "model_file_id": "uuid",
  "tenant_id": "uuid",
  "storage_key": "path/to/file.stl",
  "storage_bucket": "model-files"
}
```

**Response:** Analysis record with status `pending` (processing in background)

### POST /api/v1/analyze/upload
Analyze an STL file uploaded directly (multipart/form-data).

**Form fields:**
- `file`: STL file
- `model_file_id`: UUID
- `tenant_id`: UUID

**Response:** Complete analysis results

### GET /api/v1/analyze/{analysis_id}
Get analysis results by ID.

**Query params:**
- `tenant_id`: UUID

### GET /api/v1/model/{model_file_id}
Get latest analysis for a model file.

**Query params:**
- `tenant_id`: UUID

### GET /api/v1/health
Health check endpoint.

## Installation

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- pnpm (for monorepo integration)

### Setup

```bash
# Navigate to service directory
cd apps/geometry-service

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run database migration
psql -U printos -d printos -f app/database/migrations/001_create_geometry_analyses.sql
```

### Configuration

Environment variables (`.env`):

```env
# Service
SERVICE_NAME=geometry-analysis-service
ENVIRONMENT=development
DEBUG=false

# API
HOST=0.0.0.0
PORT=8000
API_PREFIX=/api/v1

# Database
DATABASE_URL=postgresql+asyncpg://printos:printos@localhost:5432/printos

# Storage
STORAGE_BASE_URL=http://localhost:9000
STORAGE_BUCKET=model-files

# Analysis limits
MAX_FILE_SIZE_BYTES=104857600
MAX_TRIANGLES=1000000
```

## Running the Service

### Development

```bash
# Activate virtual environment
source .venv/bin/activate

# Run with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production

```bash
# Using gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Docker

```bash
# Build image
docker build -t geometry-analysis-service .

# Run container
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql+asyncpg://printos:printos@host.docker.internal:5432/printos \
  geometry-analysis-service
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_analyzer.py
```

## Analysis Response Structure

```json
{
  "analysis_id": "uuid",
  "model_file_id": "uuid",
  "tenant_id": "uuid",
  "status": "completed",
  "metrics": {
    "width_mm": 100.0,
    "height_mm": 50.0,
    "depth_mm": 25.0,
    "volume_mm3": 125000.0,
    "surface_area_mm2": 10000.0,
    "triangle_count": 1200
  },
  "quality": {
    "is_watertight": true,
    "is_manifold": true,
    "has_duplicate_faces": false,
    "has_self_intersections": false,
    "has_degenerate_faces": false,
    "euler_characteristic": 2,
    "non_manifold_edges": 0,
    "non_manifold_vertices": 0
  },
  "complexity": {
    "complexity_score": 45.5,
    "printability_score": 95.0,
    "complexity_factors": {
      "triangle_count": 1200,
      "volume": 125000.0,
      "surface_area": 10000.0,
      "aspect_ratio": 4.0
    },
    "printability_issues": []
  },
  "error_message": null,
  "created_at": "2026-07-19T00:00:00Z",
  "updated_at": "2026-07-19T00:00:05Z",
  "completed_at": "2026-07-19T00:00:05Z"
}
```

## Integration with 3D Print OS

### Database Schema

The service creates a `geometry_analyses` table that references the existing `model_files` table:

```sql
CREATE TABLE geometry_analyses (
    id UUID PRIMARY KEY,
    model_file_id UUID REFERENCES model_files(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    storage_key TEXT NOT NULL,
    storage_bucket TEXT NOT NULL,
    status TEXT NOT NULL,
    metrics JSONB,
    quality JSONB,
    complexity JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);
```

### Integration Flow

1. **Model Upload**: User uploads STL via main API (`/api/v1/models/uploads`)
2. **Analysis Trigger**: Main API calls geometry service (`POST /api/v1/analyze`)
3. **Background Processing**: Service fetches STL from storage and analyzes
4. **Result Storage**: Results stored in `geometry_analyses` table
5. **Result Retrieval**: Main API queries results via (`GET /api/v1/analyze/{id}`)

### Multi-Tenancy

The service enforces tenant isolation:
- All queries include `tenant_id` filter
- Row Level Security (RLS) enabled on database
- Tenant ID validated from request headers

## Future Enhancements

- **AI Integration**: Hook into ML models for advanced printability prediction
- **Queue Integration**: Add message queue for high-volume processing
- **Caching**: Cache analysis results for repeated requests
- **Batch Processing**: Support analyzing multiple files in one request
- **Advanced Metrics**: Add support for overhang detection, wall thickness analysis
- **Cost Estimation**: Integrate with pricing module for material cost calculation

## Troubleshooting

### Common Issues

**Service fails to start:**
- Check PostgreSQL connection string
- Verify database migration was run
- Check port availability

**Analysis fails with "Storage fetch failed":**
- Verify `STORAGE_BASE_URL` is configured
- Check storage bucket permissions
- Ensure storage service is accessible

**Analysis fails with "exceeds maximum triangle count":**
- Increase `MAX_TRIANGLES` limit
- Consider simplifying mesh before upload

### Logging

Logs are structured JSON. View with:

```bash
# Development (pretty print)
DEBUG=true uvicorn app.main:app

# Production (JSON logs)
uvicorn app.main:app
```

## License

Proprietary — All rights reserved.
