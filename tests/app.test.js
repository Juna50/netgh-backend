const request = require('supertest');
const app = require('../src/app');

describe('Backend health and routing', () => {
  test('GET /health returns 200 and status OK', async () => {
    const res = await request(app).get('/health').expect(200);

    expect(res.body).toMatchObject({
      success: true,
      status: 'OK',
    });
    expect(res.body.environment).toBe('test');
    expect(res.body.timestamp).toBeDefined();
  });

  test('Unknown route returns 404 with a not found message', async () => {
    const res = await request(app).get('/api/unknown-route').expect(404);

    expect(res.body).toEqual({
      success: false,
      message: 'Route /api/unknown-route not found',
    });
  });

  test('POST /api/auth/login with invalid payload returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'invalid-email' })
      .expect(400);

    expect(res.body).toEqual({
      success: false,
      message: 'Valid email required',
    });
  });
});
