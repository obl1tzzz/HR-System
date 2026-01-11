      SELECT s.*, GROUP_CONCAT(sk.name ORDER BY sk.name) as skills_names
      FROM specialists s
      LEFT JOIN specialist_skills ss ON s.id = ss.specialist_id
      LEFT JOIN skills sk ON ss.skill_id = sk.id
      GROUP BY s.id
      ORDER BY s.full_name