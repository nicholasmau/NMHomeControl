# Simple OpenSSL certificate generation for Home Control
# Requires OpenSSL to be installed (comes with Git for Windows)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Home Control - HTTPS Certificate Generator" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Create certs directory
$certsDir = "certs"
if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir | Out-Null
    Write-Host "Created certs/ directory" -ForegroundColor Green
}

# Check if OpenSSL is available
$openssl = $null
try {
    # Try Git's bundled OpenSSL first
    $gitBash = "C:\Program Files\Git\usr\bin\openssl.exe"
    if (Test-Path $gitBash) {
        $openssl = $gitBash
    } else {
        # Try system PATH
        $openssl = (Get-Command openssl -ErrorAction SilentlyContinue).Source
    }
} catch {
    $openssl = $null
}

if (-not $openssl) {
    Write-Host "ERROR: OpenSSL not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install OpenSSL:" -ForegroundColor Yellow
    Write-Host "  1. Install Git for Windows (includes OpenSSL): https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "  2. Or download OpenSSL: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Run the app in HTTP mode by setting HTTPS_ENABLED=false in .env" -ForegroundColor Yellow
    exit 1
}

Write-Host "Using OpenSSL: $openssl" -ForegroundColor Green
Write-Host ""

# Certificate parameters
$hostname = Read-Host "Enter hostname (default: localhost)"
if ([string]::IsNullOrWhiteSpace($hostname)) { $hostname = "localhost" }

$ipAddress = Read-Host "Enter IP address (default: 127.0.0.1)"
if ([string]::IsNullOrWhiteSpace($ipAddress)) { $ipAddress = "127.0.0.1" }

Write-Host ""
Write-Host "Generating self-signed certificate..." -ForegroundColor Yellow

# Generate private key
& $openssl genrsa -out "$certsDir\server.key" 2048 2>&1 | Out-Null

# Create config file for certificate
$configContent = @"
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C=US
ST=State
L=City
O=HomeControl
CN=$hostname

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = $hostname
DNS.2 = localhost
IP.1 = $ipAddress
IP.2 = 127.0.0.1
"@

$configPath = "$certsDir\openssl.cnf"
$configContent | Out-File -FilePath $configPath -Encoding ASCII

# Generate certificate
& $openssl req -new -x509 -key "$certsDir\server.key" -out "$certsDir\server.crt" -days 365 -config $configPath 2>&1 | Out-Null

# Clean up config file
Remove-Item $configPath -ErrorAction SilentlyContinue

# Verify files were created
if ((Test-Path "$certsDir\server.key") -and (Test-Path "$certsDir\server.crt")) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  SUCCESS! Certificates generated" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Files created:" -ForegroundColor Cyan
    Write-Host "  - certs/server.key (private key)" -ForegroundColor White
    Write-Host "  - certs/server.crt (certificate)" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Set HTTPS_ENABLED=true in your .env file" -ForegroundColor White
    Write-Host "  2. Restart the backend: docker-compose restart backend" -ForegroundColor White
    Write-Host "  3. Access the app at https://localhost:3001" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: Your browser will show a security warning because" -ForegroundColor Yellow
    Write-Host "this is a self-signed certificate. Click 'Advanced' and" -ForegroundColor Yellow
    Write-Host "'Proceed to localhost' to accept it." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "ERROR: Certificate generation failed!" -ForegroundColor Red
    Write-Host "Please check the OpenSSL output above for errors." -ForegroundColor Red
    exit 1
}
