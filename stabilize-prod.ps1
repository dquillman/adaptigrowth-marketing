Write-Host "Stabilizing production state..."

# Ensure git repo
git rev-parse --is-inside-work-tree *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Error "Not inside a git repository. Aborting."
    exit 1
}

# Ensure firestore rules exist
if (-not (Test-Path "firestore.rules")) {
    Write-Error "firestore.rules not found. Aborting."
    exit 1
}

# Backup firestore rules
Copy-Item firestore.rules firestore.rules.golden -Force
Write-Host "Backed up firestore.rules to firestore.rules.golden"

# Create production checklist safely
$checklist = "PROD_CHECKLIST.md"

if (-not (Test-Path $checklist)) {
    $lines = @()
    $lines += "# Production Firestore Checklist"
    $lines += ""
    $lines += "After ANY Firestore rule change:"
    $lines += ""
    $lines += "- [ ] Deploy Firestore rules"
    $lines += "- [ ] Log out of app"
    $lines += "- [ ] Clear browser storage (IndexedDB and LocalStorage)"
    $lines += "- [ ] Log back in"
    $lines += "- [ ] Load exams"
    $lines += "- [ ] Create and save study plan"
    $lines += "- [ ] Verify Admin Core access"

    Set-Content -Path $checklist -Value $lines -Encoding UTF8
    Write-Host "Created PROD_CHECKLIST.md"
}
else {
    Write-Host "PROD_CHECKLIST.md already exists"
}

# Commit changes
git add firestore.rules firestore.rules.golden $checklist
git commit -m "Stabilize production Firestore permissions" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Changes committed"
}
else {
    Write-Host "No changes to commit"
}

# Tag release
$tag = "v1.0-prod-stable"
git rev-parse $tag *> $null

if ($LASTEXITCODE -ne 0) {
    git tag -a $tag -m "Production stable Firestore rules"
    Write-Host "Tagged release $tag"
}
else {
    Write-Host "Tag $tag already exists"
}

Write-Host "Production stabilization complete."
