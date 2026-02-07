# Frontend Dockerfile
FROM node:20-alpine

# Install openssl for certificate generation
RUN apk add --no-cache openssl

# Set working directory
WORKDIR /app

# Create certificate generation script inline
RUN echo '#!/bin/sh' > /usr/local/bin/generate-certs.sh && \
    echo 'CERTS_DIR="/app/certs"' >> /usr/local/bin/generate-certs.sh && \
    echo 'if [ -f "$CERTS_DIR/server.key" ] && [ -f "$CERTS_DIR/server.crt" ]; then' >> /usr/local/bin/generate-certs.sh && \
    echo '    echo "✅ Certificates already exist"' >> /usr/local/bin/generate-certs.sh && \
    echo '    exit 0' >> /usr/local/bin/generate-certs.sh && \
    echo 'fi' >> /usr/local/bin/generate-certs.sh && \
    echo 'echo "📜 Generating self-signed certificates..."' >> /usr/local/bin/generate-certs.sh && \
    echo 'openssl req -x509 -newkey rsa:2048 -nodes \\' >> /usr/local/bin/generate-certs.sh && \
    echo '    -keyout "$CERTS_DIR/server.key" \\' >> /usr/local/bin/generate-certs.sh && \
    echo '    -out "$CERTS_DIR/server.crt" \\' >> /usr/local/bin/generate-certs.sh && \
    echo '    -days 365 \\' >> /usr/local/bin/generate-certs.sh && \
    echo '    -subj "/CN=localhost" \\' >> /usr/local/bin/generate-certs.sh && \
    echo '    -addext "subjectAltName=DNS:localhost,DNS:backend,DNS:frontend,IP:127.0.0.1"' >> /usr/local/bin/generate-certs.sh && \
    echo 'chmod 644 "$CERTS_DIR/server.key" "$CERTS_DIR/server.crt"' >> /usr/local/bin/generate-certs.sh && \
    echo 'echo "✅ Certificates generated successfully!"' >> /usr/local/bin/generate-certs.sh && \
    chmod +x /usr/local/bin/generate-certs.sh

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create startup script that generates certs if needed
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo '/usr/local/bin/generate-certs.sh' >> /app/start.sh && \
    echo 'exec npm run dev -- --host 0.0.0.0' >> /app/start.sh && \
    chmod +x /app/start.sh

# Copy and set permissions for test-and-start script
COPY test-and-start.sh /app/test-and-start.sh
RUN chmod +x /app/test-and-start.sh

# Expose port
EXPOSE 5173

# Start with tests, then run dev server
CMD ["/app/test-and-start.sh"]
