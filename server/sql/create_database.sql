-- Создание базы данных
CREATE DATABASE IF NOT EXISTS hr_system;
USE hr_system;

-- Таблица специалистов
CREATE TABLE IF NOT EXISTS specialists (
  id INT PRIMARY KEY AUTO_INCREMENT,
  full_name VARCHAR(255) NOT NULL,
  available_start TIME NOT NULL,
  available_end TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Таблица навыков
CREATE TABLE IF NOT EXISTS skills (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- Таблица связи специалистов и навыков
CREATE TABLE IF NOT EXISTS specialist_skills (
  specialist_id INT,
  skill_id INT,
  PRIMARY KEY (specialist_id, skill_id),
  FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Таблица собеседований
CREATE TABLE IF NOT EXISTS interviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  candidate_name VARCHAR(255) NOT NULL,
  interview_time TIME NOT NULL,
  specialist_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE CASCADE
);

-- Таблица связи собеседований и навыков
CREATE TABLE IF NOT EXISTS interview_skills (
  interview_id INT,
  skill_id INT,
  PRIMARY KEY (interview_id, skill_id),
  FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

-- Вставка начальных навыков
INSERT IGNORE INTO skills (name) VALUES 
  ('JavaScript'), 
  ('Python'), 
  ('Java'), 
  ('C#'), 
  ('React'), 
  ('Node.js'), 
  ('SQL'), 
  ('Docker'), 
  ('Git');