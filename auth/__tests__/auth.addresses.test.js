const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const userModel = require('../src/models/user.model');

function makeAuthCookie(user) {
  const token = jwt.sign(
    {
      id: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role || 'user',
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' },
  );

  return [`token=${token}`];
}

describe('Auth Routes - api/auth/users/me/addresses', () => {
  describe('GET /api/auth/users/me/addresses', () => {
    it('should return 401 when token cookie is missing', async () => {
      const res = await request(app).get('/api/auth/users/me/addresses');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Unauthorized ! Invalid credentials');
    });

    it('should return 401 when token is invalid', async () => {
      const res = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Cookie', ['token=invalid.token']);

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Unauthorized');
    });

    it('should return 404 when authenticated user does not exist', async () => {
      const token = jwt.sign(
        {
          id: '507f191e810c19729de860ea',
          username: 'ghost',
          email: 'ghost@example.com',
          role: 'user',
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' },
      );

      const res = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Cookie', [`token=${token}`]);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'User not found');
    });

    it('should return empty addresses for a new user', async () => {
      const user = await userModel.create({
        username: 'addr_new',
        email: 'addr_new@example.com',
        password: 'password123',
        fullName: { firstName: 'Addr', lastName: 'New' },
      });

      const res = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Cookie', makeAuthCookie(user));

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('addresses');
      expect(Array.isArray(res.body.addresses)).toBe(true);
      expect(res.body.addresses).toHaveLength(0);
    });

    it('should mark exactly one address as default when none are default', async () => {
      const user = await userModel.create({
        username: 'addr_nodefault',
        email: 'addr_nodefault@example.com',
        password: 'password123',
        fullName: { firstName: 'Addr', lastName: 'NoDefault' },
        addresses: [
          {
            street: 'A',
            city: 'C1',
            state: 'S1',
            country: 'IN',
            pincode: '560001',
            isDefault: false,
          },
          {
            street: 'B',
            city: 'C2',
            state: 'S2',
            country: 'IN',
            pincode: '110001',
            isDefault: false,
          },
        ],
      });

      const res = await request(app)
        .get('/api/auth/users/me/addresses')
        .set('Cookie', makeAuthCookie(user));

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.addresses)).toBe(true);
      expect(res.body.addresses).toHaveLength(2);

      const defaultCount = res.body.addresses.filter((a) => a.isDefault).length;
      expect(defaultCount).toBe(1);
    });
  });

  describe('POST /api/auth/users/me/addresses', () => {
    it('should return 401 when token cookie is missing', async () => {
      const res = await request(app)
        .post('/api/auth/users/me/addresses')
        .send({
          street: 'X',
          city: 'Y',
          state: 'Z',
          country: 'IN',
          pincode: '560001',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Unauthorized ! Invalid credentials');
    });

    it('should return 400 for invalid pincode', async () => {
      const user = await userModel.create({
        username: 'addr_badpin',
        email: 'addr_badpin@example.com',
        password: 'password123',
        fullName: { firstName: 'Addr', lastName: 'BadPin' },
      });

      const res = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Cookie', makeAuthCookie(user))
        .send({
          street: 'X',
          city: 'Y',
          state: 'Z',
          country: 'IN',
          pincode: '123',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
      expect(Array.isArray(res.body.errors)).toBe(true);
    });

    it('should add an address and set it as default for the first address', async () => {
      const user = await userModel.create({
        username: 'addr_add1',
        email: 'addr_add1@example.com',
        password: 'password123',
        fullName: { firstName: 'Addr', lastName: 'Add1' },
      });

      const res = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Cookie', makeAuthCookie(user))
        .send({
          street: 'S',
          city: 'City',
          state: 'State',
          country: 'IN',
          pincode: '560001',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', 'Address added successfully');
      expect(res.body).toHaveProperty('addresses');
      expect(res.body.addresses).toHaveLength(1);
      expect(res.body.addresses[0]).toHaveProperty('isDefault', true);

      const refreshed = await userModel.findById(user._id);
      expect(refreshed.addresses).toHaveLength(1);
      expect(refreshed.addresses[0].isDefault).toBe(true);
    });

    it('should keep existing default when adding a non-default address', async () => {
      const user = await userModel.create({
        username: 'addr_add2',
        email: 'addr_add2@example.com',
        password: 'password123',
        fullName: { firstName: 'Addr', lastName: 'Add2' },
        addresses: [
          {
            street: 'S1',
            city: 'C1',
            state: 'ST1',
            country: 'IN',
            pincode: '560001',
            isDefault: true,
          },
        ],
      });

      const res = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Cookie', makeAuthCookie(user))
        .send({
          street: 'S2',
          city: 'C2',
          state: 'ST2',
          country: 'IN',
          pincode: '110001',
          isDefault: false,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('addresses');
      expect(res.body.addresses).toHaveLength(2);

      const defaultCount = res.body.addresses.filter((a) => a.isDefault).length;
      expect(defaultCount).toBe(1);
    });

    it('should switch default when adding an address with isDefault=true', async () => {
      const user = await userModel.create({
        username: 'addr_switchdefault',
        email: 'addr_switchdefault@example.com',
        password: 'password123',
        fullName: { firstName: 'Addr', lastName: 'SwitchDefault' },
        addresses: [
          {
            street: 'S1',
            city: 'C1',
            state: 'ST1',
            country: 'IN',
            pincode: '560001',
            isDefault: true,
          },
        ],
      });

      const res = await request(app)
        .post('/api/auth/users/me/addresses')
        .set('Cookie', makeAuthCookie(user))
        .send({
          street: 'S2',
          city: 'C2',
          state: 'ST2',
          country: 'IN',
          pincode: '110001',
          isDefault: true,
        });

      expect(res.statusCode).toBe(201);
      const defaultCount = res.body.addresses.filter((a) => a.isDefault).length;
      expect(defaultCount).toBe(1);

      const refreshed = await userModel.findById(user._id);
      const refreshedDefaultCount = refreshed.addresses.filter((a) => a.isDefault).length;
      expect(refreshedDefaultCount).toBe(1);
    });
  });

  describe('DELETE /api/auth/users/me/addresses/:addressId', () => {
    it('should return 401 when token cookie is missing', async () => {
      const res = await request(app).delete('/api/auth/users/me/addresses/507f191e810c19729de860ea');

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('message', 'Unauthorized ! Invalid credentials');
    });

    it('should return 400 for invalid addressId', async () => {
      const user = await userModel.create({
        username: 'addr_del_badid',
        email: 'addr_del_badid@example.com',
        password: 'password123',
        fullName: { firstName: 'Addr', lastName: 'DelBadId' },
      });

      const res = await request(app)
        .delete('/api/auth/users/me/addresses/not-a-valid-id')
        .set('Cookie', makeAuthCookie(user));

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message', 'Invalid addressId');
    });

    it('should return 404 when address is not found', async () => {
      const user = await userModel.create({
        username: 'addr_del_notfound',
        email: 'addr_del_notfound@example.com',
        password: 'password123',
        fullName: { firstName: 'Addr', lastName: 'DelNotFound' },
      });

      const res = await request(app)
        .delete('/api/auth/users/me/addresses/507f191e810c19729de860ea')
        .set('Cookie', makeAuthCookie(user));

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message', 'Address not found');
    });

    it('should delete an address and reassign default if needed', async () => {
      const user = await userModel.create({
        username: 'addr_del_default',
        email: 'addr_del_default@example.com',
        password: 'password123',
        fullName: { firstName: 'Addr', lastName: 'DelDefault' },
        addresses: [
          {
            street: 'S1',
            city: 'C1',
            state: 'ST1',
            country: 'IN',
            pincode: '560001',
            isDefault: true,
          },
          {
            street: 'S2',
            city: 'C2',
            state: 'ST2',
            country: 'IN',
            pincode: '110001',
            isDefault: false,
          },
        ],
      });

      const addressIdToDelete = String(user.addresses[0]._id);

      const res = await request(app)
        .delete(`/api/auth/users/me/addresses/${addressIdToDelete}`)
        .set('Cookie', makeAuthCookie(user));

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Address deleted successfully');
      expect(res.body).toHaveProperty('addresses');
      expect(res.body.addresses).toHaveLength(1);
      expect(res.body.addresses[0]).toHaveProperty('isDefault', true);

      const refreshed = await userModel.findById(user._id);
      expect(refreshed.addresses).toHaveLength(1);
      expect(refreshed.addresses[0].isDefault).toBe(true);
    });
  });
});
