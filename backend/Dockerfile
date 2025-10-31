# Multi-stage build for Barcode Generator Backend
FROM python:3.11-slim as builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user --break-system-packages -r requirements.txt

# Final stage
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlite3 \
    curl \
    fontconfig \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Install requests for test script
RUN pip install --user --break-system-packages requests

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p data uploads downloads logs archives && \
    chmod -R 755 data uploads downloads logs archives

# Make test scripts executable
RUN chmod +x test_all_endpoints.py start_api_with_tests.sh

# Expose port
EXPOSE 8034

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8034/healthz || exit 1

# Run the application
CMD ["bash", "-c", "uvicorn app:app --host 0.0.0.0 --port 8034 --workers 2"]
