$envFile = "d:\AI\bindu-fashion-tracker\.env"

if (-Not (Test-Path $envFile)) {
    Write-Host ".env file not found!"
    exit 1
}

$lines = Get-Content $envFile
foreach ($line in $lines) {
    # Skip empty lines or comments
    if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith("#")) {
        continue
    }

    # Split by the first equals sign
    $parts = $line.Split("=", 2)
    if ($parts.Length -eq 2) {
        $key = $parts[0].Trim()
        $val = $parts[1].Trim()
        
        # Remove surrounding quotes if any
        if ($val.StartsWith("`"") -and $val.EndsWith("`"")) {
            $val = $val.Substring(1, $val.Length - 2)
        } elseif ($val.StartsWith("'") -and $val.EndsWith("'")) {
            $val = $val.Substring(1, $val.Length - 2)
        }

        # Vercel needs them for production, preview, and development
        Write-Host "Adding $key to Vercel..."
        
        # We need to escape the value properly or pass it via stdin
        $process = Start-Process -FilePath "npx" -ArgumentList "vercel","env","add",$key,"production","preview","development","--force" -RedirectStandardInput "$env:TEMP\vercel_env_$key.txt" -Wait -NoNewWindow -PassThru
        
        Set-Content -Path "$env:TEMP\vercel_env_$key.txt" -Value $val -NoNewline
        
        npx vercel env add $key production preview development --force < "$env:TEMP\vercel_env_$key.txt" | Out-Null
        
        Remove-Item "$env:TEMP\vercel_env_$key.txt"
    }
}

Write-Host "All environment variables pushed to Vercel!"
