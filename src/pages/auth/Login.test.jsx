import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import Login from './Login';
import { loginRequest } from '../../utils/api';
import { startPreviewSession } from '../../utils/auth';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('../../utils/api', () => ({ loginRequest: jest.fn() }));
jest.mock('../../utils/auth', () => ({ startPreviewSession: jest.fn() }));

test('preview sign-in opens admin without contacting the login API', async () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Login />));
    for (const name of ['username', 'password']) {
      const input = container.querySelector(`input[name="${name}"]`);
      input.value = 'admin';
      await act(async () => Simulate.change(input, { target: { name, value: 'admin' } }));
    }
    await act(async () => Simulate.submit(container.querySelector('form')));
    expect(loginRequest).not.toHaveBeenCalled();
    expect(startPreviewSession).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/admin/data-upload", { replace: true });
  } finally { act(() => root.unmount()); }
});
