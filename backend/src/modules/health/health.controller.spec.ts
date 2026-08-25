import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns the backend health contract', () => {
    const controller = new HealthController();

    expect(controller.getHealth()).toEqual({
      code: 0,
      message: 'ok',
      data: {
        status: 'ok',
        service: 'backend',
      },
    });
  });
});
