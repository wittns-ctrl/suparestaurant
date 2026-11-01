import { UsersService } from './users.service';

function query<T>(result: T) {
  const q: any = {
    select: () => q,
    populate: () => q,
    exec: () => Promise.resolve(result),
    then: (resolve: (v: T) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return q;
}

const USER_ID = '507f1f77bcf86cd799439011';

function build(currentEmail: string) {
  const updated = {
    _id: { toString: () => USER_ID },
    role: 'customer',
    toObject: () => ({ _id: USER_ID, email: 'x', accountType: 'customer' }),
  };
  const userModel = {
    findById: jest.fn(() =>
      query({ accountType: 'customer', email: currentEmail }),
    ),
    findOne: jest.fn(() => query(null)),
    findByIdAndUpdate: jest.fn(() => query(updated)),
  };
  const service = new UsersService(
    userModel as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, userModel };
}

describe('UsersService.update — changing email', () => {
  it('marks a new address as unconfirmed and drops the old Google link', async () => {
    const { service, userModel } = build('old@example.com');

    await service.update(
      USER_ID,
      { email: 'New@Example.com' },
      USER_ID,
      'customer',
    );

    const update = (
      userModel.findByIdAndUpdate.mock.calls as unknown[][]
    )[0][1];
    expect(update).toEqual({
      $set: { email: 'new@example.com', emailUnconfirmed: true },
      $unset: { oauthProvider: 1, oauthProviderId: 1 },
    });
  });

  it('does not flag anything when the email is unchanged', async () => {
    const { service, userModel } = build('same@example.com');

    await service.update(
      USER_ID,
      { email: 'SAME@example.com', name: 'Sam' },
      USER_ID,
      'customer',
    );

    const update = (
      userModel.findByIdAndUpdate.mock.calls as unknown[][]
    )[0][1];
    expect(update).toEqual({ email: 'same@example.com', name: 'Sam' });
  });
});
