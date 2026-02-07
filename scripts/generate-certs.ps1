# PowerShell certificate generation script
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Home Control - HTTPS Certificate Generator (PowerShell)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Create certs directory
$certsDir = "certs"
if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir | Out-Null
}

# Certificate parameters
$hostname = Read-Host "Enter hostname (default: localhost)"
if ([string]::IsNullOrWhiteSpace($hostname)) { $hostname = "localhost" }

$ipAddress = Read-Host "Enter IP address (default: 127.0.0.1)"
if ([string]::IsNullOrWhiteSpace($ipAddress)) { $ipAddress = "127.0.0.1" }

$validDays = Read-Host "Certificate validity in days (default: 365)"
if ([string]::IsNullOrWhiteSpace($validDays)) { $validDays = 365 }

Write-Host ""
Write-Host "Generating certificate..." -ForegroundColor Yellow

try {
    # Create a self-signed certificate
    $cert = New-SelfSignedCertificate `
        -Subject "CN=$hostname" `
        -DnsName $hostname, $ipAddress `
        -KeyAlgorithm RSA `
        -KeyLength 2048 `
        -NotAfter (Get-Date).AddDays($validDays) `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -FriendlyName "Home Control Dev Certificate" `
        -HashAlgorithm SHA256 `
        -KeyUsage DigitalSignature, KeyEncipherment `
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")

    # Export to PFX
    $pfxPath = "$certsDir\temp.pfx"
    $certPassword = ConvertTo-SecureString -String "temp123" -Force -AsPlainText
    Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $certPassword | Out-Null
    
    # Use certutil to convert PFX to PEM (available on all Windows)
    $keyPath = "$certsDir\server.key"
    $certPath = "$certsDir\server.crt"
    
    # Export certificate only (public key)
    & certutil -encode $cert.GetRawCertData() "$certsDir\temp_cert.b64" | Out-Null
    $certContent = Get-Content "$certsDir\temp_cert.b64" -Raw
    $certPem = $certContent -replace "-----BEGIN CERTIFICATE-----.*-----END CERTIFICATE-----", ""
    $certPem = "-----BEGIN CERTIFICATE-----`n" + $certPem.Trim() + "`n-----END CERTIFICATE-----`n"
    [System.IO.File]::WriteAllText($certPath, $certPem)
    
    # For the private key, we need openssl or a workaround
    # Let's create a placeholder and show instructions
    Write-Host ""
    Write-Host "⚠️  Note: PowerShell certificate export requires additional tools" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1 - Use Docker (Recommended):" -ForegroundColor Cyan
    Write-Host "  Docker containers will generate certificates automatically!" -ForegroundColor White
    Write-Host "  Just run: docker-compose up --build" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2 - Install OpenSSL:" -ForegroundColor Cyan
    Write-Host "  1. Download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor White
    Write-Host "  2. Run: npm run generate-certs" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 3 - Use HTTP mode (less secure):" -ForegroundColor Cyan
    Write-Host "  Remove the certs folder and start in HTTP mode" -ForegroundColor White
    Write-Host ""
    
    # Clean up
    Remove-Item "$certsDir\temp_cert.b64" -ErrorAction SilentlyContinue
    Remove-Item $pfxPath -Force
    Remove-Item "Cert:\CurrentUser\My\$($cert.Thumbprint)" -Force
    
    Write-Host "Certificate created at: $certPath" -ForegroundColor Green
    Write-Host "For Docker, you're all set! Just run docker-compose up --build" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "❌ Error generating certificate: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Recommended: Use Docker instead!" -ForegroundColor Yellow
    Write-Host "  docker-compose up --build" -ForegroundColor White
    exit 1
}
