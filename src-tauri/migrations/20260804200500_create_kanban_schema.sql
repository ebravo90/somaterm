CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT,
    is_agent BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS cycles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    ticket_type TEXT NOT NULL,
    cycle_id TEXT,
    assignee_id TEXT,
    reporter_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (cycle_id) REFERENCES cycles(id),
    FOREIGN KEY (assignee_id) REFERENCES users(id),
    FOREIGN KEY (reporter_id) REFERENCES users(id),

    CHECK (status IN ('Backlog', 'Ready', 'In Progress', 'In Review', 'Done', 'Canceled')),
    CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    CHECK (ticket_type IN ('Story', 'Task', 'Bug', 'Spike'))
);
