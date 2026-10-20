FROM python:3.11-slim-bookworm

# Set working directory
WORKDIR /app

# Install system dependencies
# prusa-slicer provides the CLI used for slicer-accurate quotes (/api/v1/slice)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libgomp1 \
    prusa-slicer \
    && rm -rf /var/lib/apt/lists/*

ENV SLICER_EXECUTABLE=prusa-slicer

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app ./app

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/api/v1/health')"

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
