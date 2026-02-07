#!/bin/sh
# Certificate generation script for Docker container

CERTS_DIR="/app/certs"

# Check if certificates already exist
if [ -f "$CERTS_DIR/server.key" ] && [ -f "$CERTS_DIR/server.crt" ]; then
    echo "✅ Certificates already exist"
    exit 0
fi

echo "📜 Generating self-signed certificates..."

# Generate private key and certificate
openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout "$CERTS_DIR/server.key" \
    -out "$CERTS_DIR/server.crt" \
    -days 365 \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:backend,DNS:frontend,IP:127.0.0.1"

chmod 644 "$CERTS_DIR/server.key" "$CERTS_DIR/server.crt"

echo "✅ Certificates generated successfully!"
