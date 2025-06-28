const request = require('supertest');
const app = require('..');

jest.mock('../../supabaseAuthJwtManager', () => ({
  signInWithPassword: jest.fn(),
  verifyToken: jest.fn(),
}));

const {
  signInWithPassword,
  verifyToken,
} = require('../../supabaseAuthJwtManager');

describe('Authentication and homepage', () => {
  test('login success and access home', async () => {
    signInWithPassword.mockResolvedValue({
      access_token: 'access',
      refresh_token: 'refresh',
      user: { id: '1', email: 'test@example.com', user_metadata: { name: 'Test User' } },
    });
    verifyToken.mockResolvedValue({ id: '1', email: 'test@example.com', user_metadata: { name: 'Test User' } });

    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);

    expect(loginRes.body.access_token).toBeDefined();

    const homeRes = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${loginRes.body.access_token}`)
      .expect(200);

    expect(homeRes.body.message).toMatch(/Welcome, Test User/);
  });

  test('login failure', async () => {
    signInWithPassword.mockRejectedValue(new Error('Invalid credentials'));
    await request(app)
      .post('/auth/login')
      .send({ email: 'wrong@example.com', password: 'bad' })
      .expect(401);
  });
});
