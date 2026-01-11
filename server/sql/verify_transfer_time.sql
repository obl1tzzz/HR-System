SELECT * FROM interviews 
WHERE specialist_id = ? 
  AND id != ?
  AND (
    (interview_time <= ? AND ADDTIME(interview_time, MAKETIME(?, ?, 0)) > ?)
    OR
    (interview_time < ? AND interview_time >= ?)
  )