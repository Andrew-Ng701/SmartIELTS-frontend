param(
  [string]$BaseUrl = "http://localhost:8080/api",
  [string]$UserEmail,
  [string]$AdminEmail,
  [string]$Password = "CodexTest1234"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

function Invoke-JsonApi {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [string]$Token = $null
  )

  $headers = @{}
  if ($Token) {
    $headers.Authorization = "Bearer $Token"
  }

  $uri = "$BaseUrl$Path"
  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -TimeoutSec 30
  }

  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body ($Body | ConvertTo-Json -Depth 40 -Compress) -TimeoutSec 30
}

function Assert-ApiSuccess {
  param([object]$Response, [string]$Name)
  if ($Response.code -ne 1) {
    throw "$Name failed: code=$($Response.code), msg=$($Response.msg)"
  }
  Write-Host "PASS $Name"
}

function Write-ApiFailure {
  param([string]$Name, [object]$Response)
  Write-Host "FAIL $Name code=$($Response.code), msg=$($Response.msg)"
}

function Assert-True {
  param([bool]$Condition, [string]$Name, [string]$Message)
  if (-not $Condition) {
    throw "$Name failed: $Message"
  }
  Write-Host "PASS $Name"
}

function New-BizImage {
  param([int]$SortOrder = 0)
  return @{
    objectKey = "writing-question-image/29a76c20-7c00-406c-b63b-6cefea3ebae6.png"
    fileUrl = "https://smartielts-bucket-writing-task1.oss-cn-hongkong.aliyuncs.com/writing-question-image/29a76c20-7c00-406c-b63b-6cefea3ebae6.png"
    originalName = "codex-e2e-image.png"
    contentType = "image/png"
    fileSize = 33436
    width = 658
    height = 378
    sortOrder = $SortOrder
  }
}

function Get-Items {
  param([object]$Data)
  if ($Data -is [array]) { return @($Data) }
  if ($Data.list) { return @($Data.list) }
  if ($Data.questions -and $Data.questions.list) { return @($Data.questions.list) }
  return @($Data)
}

function Get-FirstReadingPassageId {
  param([object]$Detail)
  $top = @($Detail.data.passages)
  if ($top.Count -gt 0 -and $top[0].id) {
    return [long]$top[0].id
  }
  foreach ($part in @($Detail.data.parts)) {
    foreach ($group in @($part.groups)) {
      foreach ($passage in @($group.passages)) {
        if ($passage.id) {
          return [long]$passage.id
        }
      }
    }
  }
  return 0
}

if (-not $UserEmail -or -not $AdminEmail) {
  throw "UserEmail and AdminEmail are required."
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$adminLogin = Invoke-JsonApi -Method "POST" -Path "/auth/login" -Body @{ email = $AdminEmail; password = $Password }
Assert-ApiSuccess $adminLogin "admin login"
$adminToken = $adminLogin.data.token
Assert-True ($adminLogin.data.role -eq "ADMIN") "admin role" "expected ADMIN, got $($adminLogin.data.role)"

$userLogin = Invoke-JsonApi -Method "POST" -Path "/auth/login" -Body @{ email = $UserEmail; password = $Password }
Assert-ApiSuccess $userLogin "user login"
$userToken = $userLogin.data.token
Assert-True ($userLogin.data.role -eq "USER") "user role" "expected USER, got $($userLogin.data.role)"

$image = New-BizImage

# Admin Writing: create multiple image-backed questions, read by id, list, update.
$writingPayloads = @(
  @{
    taskType = "TASK_1"
    title = "Codex E2E Writing Task 1 $stamp"
    description = "The chart shows changes in library visits. Summarise the main features."
    prepMinutes = 2
    totalMinutes = 20
    images = @($image)
  },
  @{
    taskType = "TASK_2"
    title = "Codex E2E Writing Task 2 $stamp"
    description = "Some people believe online learning is more effective than classroom learning. Discuss both views."
    prepMinutes = 3
    totalMinutes = 40
    images = @($image)
  }
)

$writingQuestions = @()
foreach ($payload in $writingPayloads) {
  $created = Invoke-JsonApi -Method "POST" -Path "/admin/writing/questions" -Body $payload -Token $adminToken
  Assert-ApiSuccess $created "admin writing create $($payload.taskType)"
  $writingQuestions += $created.data

  $detail = Invoke-JsonApi -Method "GET" -Path "/admin/writing/questions/$($created.data.id)" -Token $adminToken
  if ($detail.code -eq 1) {
    Write-Host "PASS admin writing get by id $($created.data.id)"
    Assert-True ($detail.data.id -eq $created.data.id) "admin writing detail id $($created.data.id)" "detail id mismatch"
    Assert-True (@($detail.data.images).Count -ge 1) "admin writing image readback $($created.data.id)" "expected images in detail"
  } else {
    Write-ApiFailure "admin writing get by id $($created.data.id)" $detail
  }
}

$writingList = Invoke-JsonApi -Method "GET" -Path "/admin/writing/questions?pageNum=1&pageSize=50" -Token $adminToken
Assert-ApiSuccess $writingList "admin writing list"
$writingIds = @(Get-Items $writingList.data | ForEach-Object { $_.id })
Assert-True ($writingIds -contains $writingQuestions[0].id) "admin writing list contains created" "created question not listed"

# Admin Speaking: create multiple parts, read by id, list.
$speakingPayloads = @(
  @{
    part = "PART1"
    subType = "NORMAL"
    topicKey = "codex-e2e-$stamp"
    questionText = "What kind of weather do you enjoy most?"
    cueCard = $null
    followUpQuestionsJson = "[]"
    prepSeconds = 0
    answerSeconds = 30
    displayOrder = 1
    active = 1
  },
  @{
    part = "PART2"
    subType = "CUE_CARD"
    topicKey = "codex-e2e-topic-$stamp"
    questionText = "Describe a useful website you often visit."
    cueCard = "You should say what it is, how you use it, and why it is useful."
    followUpQuestionsJson = '["How has the internet changed studying?","Should schools teach digital skills?"]'
    prepSeconds = 60
    answerSeconds = 120
    displayOrder = 2
    active = 1
  },
  @{
    part = "PART3"
    subType = "FOLLOW_UP"
    topicKey = "codex-e2e-topic-$stamp"
    questionText = "Do people rely too much on online information?"
    cueCard = $null
    followUpQuestionsJson = "[]"
    prepSeconds = 0
    answerSeconds = 45
    displayOrder = 3
    active = 1
  }
)

$speakingQuestions = @()
foreach ($payload in $speakingPayloads) {
  $created = Invoke-JsonApi -Method "POST" -Path "/admin/speaking/questions" -Body $payload -Token $adminToken
  Assert-ApiSuccess $created "admin speaking create $($payload.part)"
  $speakingQuestions += $created.data

  $detail = Invoke-JsonApi -Method "GET" -Path "/admin/speaking/questions/$($created.data.id)" -Token $adminToken
  if ($detail.code -eq 1) {
    Write-Host "PASS admin speaking get by id $($created.data.id)"
    Assert-True ($detail.data.id -eq $created.data.id) "admin speaking detail id $($created.data.id)" "detail id mismatch"
  } else {
    Write-ApiFailure "admin speaking get by id $($created.data.id)" $detail
  }
}

$speakingList = Invoke-JsonApi -Method "GET" -Path "/admin/speaking/questions" -Token $adminToken
Assert-ApiSuccess $speakingList "admin speaking list"
$speakingIds = @(Get-Items $speakingList.data | ForEach-Object { $_.id })
Assert-True ($speakingIds -contains $speakingQuestions[0].id) "admin speaking list contains created" "created question not listed"

# Admin Reading: create shell, create groups, then save passage and questions together through clientKey/clientPassageKey.
$readingShell = Invoke-JsonApi -Method "POST" -Path "/admin/reading/tests" -Token $adminToken -Body @{
  title = "Codex E2E Reading $stamp"
  totalScore = 6
  timerMode = "TEST_LEVEL"
  prepMinutes = 0
  totalMinutes = 60
  autoSubmit = 1
  allowPause = 1
}
Assert-ApiSuccess $readingShell "admin reading create shell"
$readingTestId = $readingShell.data.id

$readingGroups = @(
  @{
    testId = $readingTestId
    partNumber = 1
    groupNumber = 1
    title = "Passage 1 - E2E Mapping"
    instructionText = "Read the passage and answer the questions."
    groupGuideText = "Questions 1-6"
    groupRequirementText = "Use the correct answers."
    questionType = "SUMMARY_COMPLETION"
    answerMode = "TEXT"
    questionNoStart = 1
    questionNoEnd = 6
    displayOrder = 1
    caseInsensitive = 1
    ignoreWhitespace = 1
    ignorePunctuation = 0
    images = @($image)
  }
)
$readingPhase1 = Invoke-JsonApi -Method "PUT" -Path "/admin/reading/tests/$readingTestId/full" -Token $adminToken -Body @{
  test = @{
    title = "Codex E2E Reading $stamp"
    totalScore = 6
    timerMode = "TEST_LEVEL"
    prepMinutes = 0
    totalMinutes = 60
    autoSubmit = 1
    allowPause = 1
  }
  partGroups = $readingGroups
  passages = @()
  questions = @()
}
Assert-ApiSuccess $readingPhase1 "admin reading full save groups"
$readingDetail1 = Invoke-JsonApi -Method "GET" -Path "/admin/reading/tests/$readingTestId" -Token $adminToken
Assert-ApiSuccess $readingDetail1 "admin reading detail after groups"
$readingPartGroupId = @($readingDetail1.data.partGroups)[0].id
Assert-True ($readingPartGroupId -gt 0) "admin reading partGroup id readback" "missing partGroup id"
$readingGroups[0].id = $readingPartGroupId

$clientPassageKey = "codex-passage-$stamp"
$readingQuestionsPayload = @(
  @{
    clientPassageKey = $clientPassageKey
    partGroupId = $readingPartGroupId
    questionNumber = 1
    questionType = "MULTIPLE_CHOICE_SINGLE"
    answerMode = "SINGLE"
    questionText = "What is the main benefit of clear route signs?"
    correctAnswer = "B"
    optionsJson = '["A. More traffic","B. Faster orientation","C. Higher prices","D. Fewer buses"]'
    acceptedAnswersJson = '["B"]'
    groupLabel = "Route signs"
    caseInsensitive = 1
    ignoreWhitespace = 1
    ignorePunctuation = 0
    displayOrder = 1
    score = 1
    images = @($image)
  },
  @{
    clientPassageKey = $clientPassageKey
    partGroupId = $readingPartGroupId
    questionNumber = 2
    questionType = "MULTIPLE_CHOICE_MULTI"
    answerMode = "MULTI"
    questionText = "Which TWO items support visitors?"
    correctAnswer = "A,C"
    optionsJson = '["A. Maps","B. Locked gates","C. Lighting","D. Noise"]'
    acceptedAnswersJson = '["A","C"]'
    groupLabel = "Visitor support"
    caseInsensitive = 1
    ignoreWhitespace = 1
    ignorePunctuation = 0
    displayOrder = 2
    score = 1
    images = @($image)
  },
  @{
    clientPassageKey = $clientPassageKey
    partGroupId = $readingPartGroupId
    questionNumber = 3
    questionType = "DIAGRAM_LABEL_COMPLETION"
    answerMode = "TEXT"
    questionText = "The diagram label should be _____."
    correctAnswer = "platform"
    acceptedAnswersJson = '["platform"]'
    groupLabel = "Diagram"
    caseInsensitive = 1
    ignoreWhitespace = 1
    ignorePunctuation = 0
    displayOrder = 3
    score = 1
    images = @($image)
  },
  @{
    clientPassageKey = $clientPassageKey
    partGroupId = $readingPartGroupId
    questionNumber = 4
    questionType = "SUMMARY_COMPLETION"
    answerMode = "TEXT"
    questionText = "Clear signs reduce _____."
    correctAnswer = "confusion"
    acceptedAnswersJson = '["confusion"]'
    groupLabel = "Summary"
    caseInsensitive = 1
    ignoreWhitespace = 1
    ignorePunctuation = 0
    displayOrder = 4
    score = 1
    images = @($image)
  },
  @{
    clientPassageKey = $clientPassageKey
    partGroupId = $readingPartGroupId
    questionNumber = 5
    questionType = "NOTE_COMPLETION"
    answerMode = "TEXT"
    questionText = "Lighting improves _____."
    correctAnswer = "safety"
    acceptedAnswersJson = '["safety"]'
    groupLabel = "Notes"
    caseInsensitive = 1
    ignoreWhitespace = 1
    ignorePunctuation = 0
    displayOrder = 5
    score = 1
    images = @($image)
  },
  @{
    clientPassageKey = $clientPassageKey
    partGroupId = $readingPartGroupId
    questionNumber = 6
    questionType = "MATCHING"
    answerMode = "TEXT"
    questionText = "Which feature helps at night?"
    correctAnswer = "lighting"
    acceptedAnswersJson = '["lighting"]'
    groupLabel = "Matching"
    caseInsensitive = 1
    ignoreWhitespace = 1
    ignorePunctuation = 0
    displayOrder = 6
    score = 1
    images = @($image)
  }
)

$readingPhase2 = Invoke-JsonApi -Method "PUT" -Path "/admin/reading/tests/$readingTestId/full" -Token $adminToken -Body @{
  test = @{
    title = "Codex E2E Reading $stamp"
    totalScore = 6
    timerMode = "TEST_LEVEL"
    prepMinutes = 0
    totalMinutes = 60
    autoSubmit = 1
    allowPause = 1
  }
  partGroups = $readingGroups
  passages = @(@{
    clientKey = $clientPassageKey
    testId = $readingTestId
    partGroupId = $readingPartGroupId
    passageNo = 1
    title = "E2E Passage With Client Key"
    content = "A short passage about maps, signs, platforms, lighting and safety. Clear signs reduce confusion for visitors."
    materialType = "PASSAGE"
    displayOrder = 1
  })
  questions = $readingQuestionsPayload
}
if ($readingPhase2.code -eq 1) {
  Write-Host "PASS admin reading full save passage and questions same batch"
} else {
  Write-ApiFailure "admin reading full save passage and questions same batch" $readingPhase2
  Write-Host "INFO admin reading fallback: save passage first, then questions with persisted passageId"
  $readingPassageOnly = Invoke-JsonApi -Method "PUT" -Path "/admin/reading/tests/$readingTestId/full" -Token $adminToken -Body @{
    test = @{
      title = "Codex E2E Reading $stamp"
      totalScore = 6
      timerMode = "TEST_LEVEL"
      prepMinutes = 0
      totalMinutes = 60
      autoSubmit = 1
      allowPause = 1
    }
    partGroups = $readingGroups
    passages = @(@{
      clientKey = $clientPassageKey
      testId = $readingTestId
      partGroupId = $readingPartGroupId
      passageNo = 1
      title = "E2E Passage With Client Key"
      content = "A short passage about maps, signs, platforms, lighting and safety. Clear signs reduce confusion for visitors."
      materialType = "PASSAGE"
      displayOrder = 1
    })
    questions = @()
  }
  Assert-ApiSuccess $readingPassageOnly "admin reading fallback passage save"
  $readingFallbackDetail = Invoke-JsonApi -Method "GET" -Path "/admin/reading/tests/$readingTestId" -Token $adminToken
  Assert-ApiSuccess $readingFallbackDetail "admin reading fallback detail with passage"
  if (@($readingFallbackDetail.data.passages).Count -lt 1) {
    Write-Host "FAIL admin reading top-level passages readback missing"
  }
  $persistedPassageId = Get-FirstReadingPassageId $readingFallbackDetail
  Assert-True ($persistedPassageId -gt 0) "admin reading fallback passage id" "missing persisted passage id"
  $readingQuestionsWithPassageId = @($readingQuestionsPayload | ForEach-Object {
    $copy = @{} + $_
    $copy.Remove("clientPassageKey")
    $copy.passageId = $persistedPassageId
    $copy
  })
  $readingPhase2 = Invoke-JsonApi -Method "PUT" -Path "/admin/reading/tests/$readingTestId/full" -Token $adminToken -Body @{
    test = @{
      title = "Codex E2E Reading $stamp"
      totalScore = 6
      timerMode = "TEST_LEVEL"
      prepMinutes = 0
      totalMinutes = 60
      autoSubmit = 1
      allowPause = 1
    }
    partGroups = $readingGroups
    passages = @(@{
      id = $persistedPassageId
      testId = $readingTestId
      partGroupId = $readingPartGroupId
      passageNo = 1
      title = "E2E Passage With Client Key"
      content = "A short passage about maps, signs, platforms, lighting and safety. Clear signs reduce confusion for visitors."
      materialType = "PASSAGE"
      displayOrder = 1
    })
    questions = $readingQuestionsWithPassageId
  }
  Assert-ApiSuccess $readingPhase2 "admin reading fallback questions save"
}
$readingDetail2 = Invoke-JsonApi -Method "GET" -Path "/admin/reading/tests/$readingTestId" -Token $adminToken
Assert-ApiSuccess $readingDetail2 "admin reading detail after questions"
if (@($readingDetail2.data.passages).Count -ge 1) {
  Write-Host "PASS admin reading passages top-level"
} else {
  Write-Host "FAIL admin reading passages top-level missing"
}
$readingPassageId = Get-FirstReadingPassageId $readingDetail2
Assert-True ($readingPassageId -gt 0) "admin reading passage id readback" "missing persisted passage id"
Assert-True (@($readingDetail2.data.questions).Count -ge 6) "admin reading questions readback" "expected 6 questions"
Assert-True (@($readingDetail2.data.questions | Where-Object { $_.questionType -eq "DIAGRAM_LABEL_COMPLETION" }).Count -ge 1) "admin reading enum readback" "DIAGRAM_LABEL_COMPLETION not persisted"
Assert-True (@($readingDetail2.data.questions | Where-Object { @($_.images).Count -ge 1 }).Count -ge 1) "admin reading question image readback" "missing question image"

# Admin Listening: create shell, group, questions with image-backed payload.
$listeningShell = Invoke-JsonApi -Method "POST" -Path "/admin/listening/tests" -Token $adminToken -Body @{
  title = "Codex E2E Listening $stamp"
  totalScore = 5
  timerMode = "TEST_LEVEL"
  prepMinutes = 1
  totalMinutes = 40
  autoSubmit = 1
  allowPause = 1
  allowAudioSeek = 0
}
Assert-ApiSuccess $listeningShell "admin listening create shell"
$listeningTestId = $listeningShell.data.id

$listeningGroups = @(@{
  testId = $listeningTestId
  partNumber = 1
  groupNumber = 1
  title = "Section 1 - E2E Map"
  instructionText = "Listen and answer."
  groupGuideText = "Questions 1-5"
  groupRequirementText = "Choose or complete."
  questionType = "NOTE_COMPLETION"
  answerMode = "TEXT"
  questionNoStart = 1
  questionNoEnd = 5
  displayOrder = 1
  caseInsensitive = 1
  ignoreWhitespace = 1
  ignorePunctuation = 0
  images = @($image)
})
$listeningPhase1 = Invoke-JsonApi -Method "PUT" -Path "/admin/listening/tests/$listeningTestId/full" -Token $adminToken -Body @{
  test = @{
    title = "Codex E2E Listening $stamp"
    totalScore = 5
    timerMode = "TEST_LEVEL"
    prepMinutes = 1
    totalMinutes = 40
    autoSubmit = 1
    allowPause = 1
    allowAudioSeek = 0
  }
  partGroups = $listeningGroups
  questions = @()
  audios = @()
}
Assert-ApiSuccess $listeningPhase1 "admin listening full save groups"
$listeningDetail1 = Invoke-JsonApi -Method "GET" -Path "/admin/listening/tests/$listeningTestId" -Token $adminToken
Assert-ApiSuccess $listeningDetail1 "admin listening detail after groups"
$listeningPartGroupId = @($listeningDetail1.data.partGroups)[0].id
Assert-True ($listeningPartGroupId -gt 0) "admin listening partGroup id readback" "missing partGroup id"
$listeningGroups[0].id = $listeningPartGroupId

$listeningQuestionsPayload = @(
  @{
    testId = $listeningTestId
    partGroupId = $listeningPartGroupId
    sectionNumber = 1
    questionNumber = 1
    questionType = "MULTIPLE_CHOICE_SINGLE"
    answerMode = "SINGLE"
    questionText = "Where is the ticket office?"
    correctAnswer = "A"
    optionsJson = '["A. Near the gate","B. Behind the cafe","C. Opposite the library"]'
    acceptedAnswersJson = '["A"]'
    caseInsensitive = 1
    ignoreWhitespace = 1
    ignorePunctuation = 0
    displayOrder = 1
    score = 1
    images = @($image)
  },
  @{
    testId = $listeningTestId
    partGroupId = $listeningPartGroupId
    sectionNumber = 1
    questionNumber = 2
    questionType = "DIAGRAM_LABEL_COMPLETION"
    answerMode = "TEXT"
    questionText = "Map label 2: _____."
    correctAnswer = "garden"
    acceptedAnswersJson = '["garden"]'
    caseInsensitive = 1
    ignoreWhitespace = 1
    ignorePunctuation = 0
    displayOrder = 2
    score = 1
    images = @($image)
  },
  @{
    testId = $listeningTestId
    partGroupId = $listeningPartGroupId
    sectionNumber = 1
    questionNumber = 3
    questionType = "TABLE_COMPLETION"
    answerMode = "TEXT"
    questionText = "Start time: _____."
    correctAnswer = "nine"
    acceptedAnswersJson = '["nine","9"]'
    caseInsensitive = 1
    ignoreWhitespace = 1
    ignorePunctuation = 0
    displayOrder = 3
    score = 1
    images = @($image)
  },
  @{
    testId = $listeningTestId
    partGroupId = $listeningPartGroupId
    sectionNumber = 1
    questionNumber = 4
    questionType = "NOTE_COMPLETION"
    answerMode = "TEXT"
    questionText = "Bring a _____."
    correctAnswer = "pen"
    acceptedAnswersJson = '["pen"]'
    caseInsensitive = 1
    ignoreWhitespace = 1
    ignorePunctuation = 0
    displayOrder = 4
    score = 1
    images = @($image)
  },
  @{
    testId = $listeningTestId
    partGroupId = $listeningPartGroupId
    sectionNumber = 1
    questionNumber = 5
    questionType = "MATCHING"
    answerMode = "TEXT"
    questionText = "Match the speaker to the role."
    correctAnswer = "guide"
    acceptedAnswersJson = '["guide"]'
    caseInsensitive = 1
    ignoreWhitespace = 1
    ignorePunctuation = 0
    displayOrder = 5
    score = 1
    images = @($image)
  }
)
$listeningPhase2 = Invoke-JsonApi -Method "PUT" -Path "/admin/listening/tests/$listeningTestId/full" -Token $adminToken -Body @{
  test = @{
    title = "Codex E2E Listening $stamp"
    totalScore = 5
    timerMode = "TEST_LEVEL"
    prepMinutes = 1
    totalMinutes = 40
    autoSubmit = 1
    allowPause = 1
    allowAudioSeek = 0
  }
  partGroups = $listeningGroups
  questions = $listeningQuestionsPayload
  audios = @(@{ title = "Codex E2E logical audio placeholder" })
}
Assert-ApiSuccess $listeningPhase2 "admin listening full save questions"
$listeningDetail2 = Invoke-JsonApi -Method "GET" -Path "/admin/listening/tests/$listeningTestId" -Token $adminToken
Assert-ApiSuccess $listeningDetail2 "admin listening detail after questions"
Assert-True (@($listeningDetail2.data.questions).Count -ge 5) "admin listening questions readback" "expected 5 questions"
Assert-True (@($listeningDetail2.data.questions | Where-Object { $_.questionType -eq "TABLE_COMPLETION" }).Count -ge 1) "admin listening enum readback" "TABLE_COMPLETION not persisted"
Assert-True (@($listeningDetail2.data.questions | Where-Object { @($_.images).Count -ge 1 }).Count -ge 1) "admin listening question image readback" "missing question image"

# User Reading/Listening start and submit with created tests.
$readingSession = Invoke-JsonApi -Method "POST" -Path "/user/reading/tests/$readingTestId/start" -Token $userToken
Assert-ApiSuccess $readingSession "user reading start"
$readingAnswers = @($readingDetail2.data.questions | ForEach-Object {
  if ($_.answerMode -eq "MULTI") {
    @{ questionId = $_.id; answers = @("A", "C") }
  } else {
    @{ questionId = $_.id; answer = "$($_.correctAnswer)" }
  }
})
$readingSubmit = Invoke-JsonApi -Method "POST" -Path "/user/reading/tests/$readingTestId/submit" -Token $userToken -Body @{
  sessionId = $readingSession.data.sessionId
  startedTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
  timeSpentSeconds = 120
  autoSubmitted = 0
  answers = $readingAnswers
}
Assert-ApiSuccess $readingSubmit "user reading submit"

$listeningSession = Invoke-JsonApi -Method "POST" -Path "/user/listening/tests/$listeningTestId/start" -Token $userToken
Assert-ApiSuccess $listeningSession "user listening start"
$listeningAnswers = @($listeningDetail2.data.questions | ForEach-Object {
  @{ questionId = $_.id; answer = "$($_.correctAnswer)" }
})
$listeningSubmit = Invoke-JsonApi -Method "POST" -Path "/user/listening/tests/$listeningTestId/submit" -Token $userToken -Body @{
  sessionId = $listeningSession.data.sessionId
  startedTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
  timeSpentSeconds = 90
  autoSubmitted = 0
  answers = $listeningAnswers
}
Assert-ApiSuccess $listeningSubmit "user listening submit"

# User Writing submit: text only should pass; mixed text+image should be rejected.
$writingUserList = Invoke-JsonApi -Method "GET" -Path "/user/writing/questions?pageNum=1&pageSize=100" -Token $userToken
Assert-ApiSuccess $writingUserList "user writing list"
$targetWriting = @(Get-Items $writingUserList.data | Where-Object { $_.id -eq $writingQuestions[0].id })[0]
Assert-True ($null -ne $targetWriting) "user writing list contains created" "created writing question unavailable to user"

$textForm = New-Object System.Net.Http.MultipartFormDataContent
$textForm.Add([System.Net.Http.StringContent]::new("7.0"), "targetScore")
$textForm.Add([System.Net.Http.StringContent]::new("This is a concise E2E writing answer with text only."), "textContent")
$client = [System.Net.Http.HttpClient]::new()
$client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $userToken)
$textResponse = $client.PostAsync("$BaseUrl/user/writing/questions/$($writingQuestions[0].id)/submit", $textForm).Result
$textJson = $textResponse.Content.ReadAsStringAsync().Result | ConvertFrom-Json
Assert-ApiSuccess $textJson "user writing submit text only"

$mixedForm = New-Object System.Net.Http.MultipartFormDataContent
$mixedForm.Add([System.Net.Http.StringContent]::new("7.0"), "targetScore")
$mixedForm.Add([System.Net.Http.StringContent]::new("This mixed payload should be rejected."), "textContent")
$bytes = [System.Text.Encoding]::UTF8.GetBytes("not a real png but enough to test multipart exclusivity")
$fileContent = [System.Net.Http.ByteArrayContent]::new($bytes)
$fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("image/png")
$mixedForm.Add($fileContent, "images", "codex-e2e.png")
$mixedResponse = $client.PostAsync("$BaseUrl/user/writing/questions/$($writingQuestions[0].id)/submit", $mixedForm).Result
$mixedJson = $mixedResponse.Content.ReadAsStringAsync().Result | ConvertFrom-Json
Assert-True ($mixedJson.code -eq 0) "user writing mixed source rejected" "expected code=0, got code=$($mixedJson.code)"
Write-Host "INFO user writing mixed source msg=$($mixedJson.msg)"
$client.Dispose()

# User Speaking lifecycle: start should pass; next-question may expose external D-ID config failures.
$speakingStart = Invoke-JsonApi -Method "POST" -Path "/user/speaking/start-exam" -Token $userToken -Body @{ examType = "FULL"; totalQuestions = 3 }
Assert-ApiSuccess $speakingStart "user speaking start exam"
try {
  $speakingNext = Invoke-JsonApi -Method "POST" -Path "/user/speaking/next-question" -Token $userToken -Body @{ sessionId = $speakingStart.data.sessionId }
  if ($speakingNext.code -eq 1) {
    Write-Host "PASS user speaking next-question"
    if ($speakingNext.data.talkId) {
      Write-Host "INFO speaking talkId=$($speakingNext.data.talkId)"
    }
  } else {
    Write-Host "WARN user speaking next-question returned code=$($speakingNext.code), msg=$($speakingNext.msg)"
  }
} catch {
  Write-Host "WARN user speaking next-question request error: $($_.Exception.Message)"
}

Write-Host "SUMMARY readingTestId=$readingTestId listeningTestId=$listeningTestId writingQuestionIds=$(@($writingQuestions | ForEach-Object { $_.id }) -join ',') speakingQuestionIds=$(@($speakingQuestions | ForEach-Object { $_.id }) -join ',')"
