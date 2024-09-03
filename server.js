import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import pkg from "pg";
import bcrypt from "bcrypt";

const { Pool } = pkg;

const db = new Pool({
  user: "postgres",
  host: "localhost",
  database: "notesApp",
  password: "ola12345",
  port: 5432
});

db.connect();

const app = express();
const port = 3001;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password cannot be empty!" });
  }

  try {
    const checkUserQuery = 'SELECT * FROM users WHERE username = $1';
    const checkUserResult = await db.query(checkUserQuery, [username]);

    if (checkUserResult.rows.length > 0) {
      const existingUser = checkUserResult.rows[0];
      const isPasswordValid = await bcrypt.compare(password, existingUser.password);

      if (isPasswordValid) {
        res.json({
          token: 'test1234',
          userId: existingUser.id
        });
      } else {
        res.status(404).json({ error: "Incorrect password!" });
      }
    } else {
      res.status(409).json({ error: "Username doesn't exist!" });
    }
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: "Error during login" });
  }
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password cannot be empty!" });
  }

  try {
    const checkUserQuery = 'SELECT * FROM users WHERE username = $1';
    const checkUserResult = await db.query(checkUserQuery, [username]);

    if (checkUserResult.rows.length > 0) {
      return res.status(409).json({ error: "Username is taken." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertUserQuery = 'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *';
    const insertedUser = await db.query(insertUserQuery, [username, hashedPassword]);

    res.status(201).json(insertedUser.rows[0]);
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).json({ error: "Error during registration" });
  }
});

app.get('/notes', async (req, res) => {
  const userId = req.query.userId;

  try {
    const query = 'SELECT * FROM notes WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    const notes = result.rows;
    res.json(notes);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ error: "Error fetching notes" });
  }
});

app.post('/notes', async (req, res) => {
  const { title, content, userId } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content cannot be empty!" });
  }

  try {
    const insertNoteQuery = 'INSERT INTO notes (title, content, user_id) VALUES ($1, $2, $3) RETURNING *';
    const result = await db.query(insertNoteQuery, [title, content, userId]);
    const newNote = result.rows[0];
    res.status(201).json(newNote);
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: "Error creating note" });
  }
});

app.delete('/notes/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = parseInt(req.query.userId);

  try {
    const deleteNoteQuery = 'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await db.query(deleteNoteQuery, [id, userId]);

    if (result.rows.length > 0) {
      res.sendStatus(200);
    } else {
      res.status(404).json({ error: "Note not found or not authorized to delete." });
    }
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: "Error deleting note" });
  }
});

app.put('/notes/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Title and content cannot be empty!" });
  }

  try {
    const updateNoteQuery = 'UPDATE notes SET title = $2, content = $3 WHERE id = $1 RETURNING *';
    const result = await db.query(updateNoteQuery, [id, title, content]);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows[0]);
    } else {
      res.status(404).json({ error: "Note not found. No notes were updated." });
    }
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(500).json({ error: "Error updating note" });
  }
});

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
