DELETE FROM interviews 
WHERE specialist_id = ? AND
NOT (interview_time >= ? AND ADDTIME(interview_time, MAKETIME(?, ?, 0)) <= ?)
