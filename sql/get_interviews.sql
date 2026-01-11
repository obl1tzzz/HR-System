SELECT i.*, s.full_name as specialist_name,
GROUP_CONCAT(sk.name ORDER BY sk.name) as skills_names
FROM interviews i
LEFT JOIN specialists s ON i.specialist_id = s.id
LEFT JOIN interview_skills isk ON i.id = isk.interview_id
LEFT JOIN skills sk ON isk.skill_id = sk.id
GROUP BY i.id
ORDER BY i.interview_time