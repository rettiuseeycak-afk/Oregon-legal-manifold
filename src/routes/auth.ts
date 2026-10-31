import { Router } from 'express';
import { registerUser, loginUser } from '../services/userService';

const router = Router();

/**
 * POST /api/auth/register
 * Registers a new user with email, hashed password, and default 'free' plan.
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await registerUser(email, password);
    // Do not return passwordHash to client
    const { passwordHash, ...safeUser } = user;
    return res.status(201).json({ user: safeUser });
  } catch (error: any) {
    console.error('Registration failed:', error);
    return res.status(400).json({ error: error?.message || 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Validates user credentials and returns safe user profile.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await loginUser(email, password);
    // Do not return passwordHash to client
    const { passwordHash, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (error: any) {
    console.error('Login failed:', error);
    return res.status(401).json({ error: error?.message || 'Invalid credentials' });
  }
});

export default router;
