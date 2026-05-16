# =============================================================================
# Automate RAG Pipeline (Sync, Test, Run)
# =============================================================================

Param(
    [switch]$Sync,
    [switch]$Test,
    [switch]$Run,
    [switch]$All
)

$ErrorActionPreference = "Stop"

function Run-Sync {
    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "1/3: Extracting records from SQL to JSON" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    python 01_extract_records.py

    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "2/3: Building local embeddings" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    python 02_build_embeddings.py

    Write-Host "=================================================" -ForegroundColor Cyan
    Write-Host "3/3: Syncing embeddings to ChromaDB" -ForegroundColor Cyan
    Write-Host "=================================================" -ForegroundColor Cyan
    python 05_build_embedding_indexes.py
}

function Run-Tests {
    Write-Host "=================================================" -ForegroundColor Green
    Write-Host "Running Full API Smoke Tests" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Green
    
    # Start the API in the background for testing
    Write-Host "Starting temporary API server on port 8002..."
    $apiProcess = Start-Process -FilePath "uvicorn" -ArgumentList "rag_api_universal:app --port 8002" -PassThru -NoNewWindow
    
    # Wait for API to be ready
    Start-Sleep -Seconds 5
    
    try {
        python test_api_full_smoke.py
    }
    finally {
        Write-Host "Stopping temporary API server..."
        Stop-Process -Id $apiProcess.Id -Force
    }
}

function Run-API {
    Write-Host "=================================================" -ForegroundColor Yellow
    Write-Host "Starting RAG API Server" -ForegroundColor Yellow
    Write-Host "=================================================" -ForegroundColor Yellow
    uvicorn rag_api_universal:app --host 0.0.0.0 --port 8002 --reload
}

if ($All) {
    $Sync = $true
    $Test = $true
    $Run = $true
}

if (-not $Sync -and -not $Test -and -not $Run) {
    Write-Host "Usage: .\automate_rag.ps1 [-Sync] [-Test] [-Run] [-All]"
    Write-Host "  -Sync : Extracts new records, builds embeddings, and syncs to ChromaDB"
    Write-Host "  -Test : Runs full API smoke tests"
    Write-Host "  -Run  : Starts the RAG API Server on port 8002"
    Write-Host "  -All  : Runs Sync, then Test, then Run"
    exit
}

if ($Sync) {
    Run-Sync
}

if ($Test) {
    Run-Tests
}

if ($Run) {
    Run-API
}
