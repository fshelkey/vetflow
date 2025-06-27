const request = require('supertest');
const app = require('..');

describe('Authentication and homepage', () => {
  test('login success and access home', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200);

    const token = loginRes.body.token;
    expect(token).toBeDefined();

    const homeRes = await request(app)
      .get('/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(homeRes.body.message).toMatch(/Welcome, Test User/);
  });

  test('login failure', async () => {
    await request(app)
      .post('/auth/login')
      .send({ email: 'wrong@example.com', password: 'bad' })
      .expect(401);
  });
});
