      SELECT sk.* FROM skills sk
      JOIN specialist_skills ss ON sk.id = ss.skill_id
      WHERE ss.specialist_id = ?