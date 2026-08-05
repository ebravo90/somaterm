PRAGMA foreign_keys=OFF;

CREATE TABLE tickets_new (
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

    CHECK (status IN ('Open', 'Ready', 'Blocked', 'In Progress', 'Testing', 'UAT', 'Done', 'Canceled')),
    CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    CHECK (ticket_type IN ('Story', 'Task', 'Bug', 'Spike', 'Cycle'))
);

INSERT INTO tickets_new SELECT * FROM tickets;

DROP TABLE tickets;

ALTER TABLE tickets_new RENAME TO tickets;

PRAGMA foreign_keys=ON;
