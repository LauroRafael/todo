$ErrorActionPreference = "Stop"

$api = "http://localhost:4000"
$h = @{ "Content-Type" = "application/json" }

Write-Host "1) GET /health"
$health = Invoke-RestMethod -Uri "$api/health"
$health | ConvertTo-Json

Write-Host "2) POST /tasks (Task A)"
$t1 = Invoke-RestMethod -Method Post -Uri "$api/tasks" -Headers $h -Body (@{ title = "Task A"; description = "Desc A" } | ConvertTo-Json)
$t1 | ConvertTo-Json

Write-Host "3) POST /tasks (Task B)"
$t2 = Invoke-RestMethod -Method Post -Uri "$api/tasks" -Headers $h -Body (@{ title = "Task B" } | ConvertTo-Json)
$t2 | ConvertTo-Json

Write-Host "4) GET /tasks"
$list1 = Invoke-RestMethod -Uri "$api/tasks"
Write-Host ("Count=" + $list1.Count)

Write-Host "5) PUT /tasks/:id (complete+edit Task A)"
$u1 = Invoke-RestMethod -Method Put -Uri ("$api/tasks/" + $t1.id) -Headers $h -Body (@{ completed = $true; title = "Task A (edit)" } | ConvertTo-Json)
$u1 | ConvertTo-Json

Write-Host "6) DELETE /tasks/:id (Task B)"
Invoke-RestMethod -Method Delete -Uri ("$api/tasks/" + $t2.id) | Out-Null
Write-Host "Deleted."

Write-Host "7) GET /tasks"
$list2 = Invoke-RestMethod -Uri "$api/tasks"
Write-Host ("Count=" + $list2.Count)

Write-Host "OK"

