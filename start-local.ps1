param(
  [int]$Port = 8080
)

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
  $python = Get-Command py -ErrorAction SilentlyContinue
}

if (-not $python) {
  Write-Error "Python 3 was not found. Install Python and try again."
  exit 1
}

Write-Host "Starting local server at http://localhost:$Port"
& $python.Source -m http.server $Port
