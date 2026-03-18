-- Seed tracks (problem statements)
INSERT INTO public.tracks (id, title, description, max_teams, current_count, max_capacity) VALUES
('ps1', '1. FinTech & Web3 Security', 'Develop a decentralized tracing mechanism...', 10, 0, 10),
('ps2', '2. AI-Driven Healthcare Diagnostics', 'Build an agentic AI model...', 10, 0, 10),
('ps3', '3. Campus Community Hub (Open Innovation)', 'Design a full-stack platform...', 10, 0, 10),
('ps4', '4. Algorithmic Supply Chain Optimization', 'Develop a predictive algorithm...', 10, 0, 10),
('ps5', '5. Quantum Cryptography Simulator', 'Create a simulation environment...', 10, 0, 10),
('ps6', '6. Gamified Education for Neurodivergent Learners', 'Design an interactive application...', 10, 0, 10)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  max_teams = EXCLUDED.max_teams,
  current_count = EXCLUDED.current_count,
  max_capacity = EXCLUDED.max_capacity;
