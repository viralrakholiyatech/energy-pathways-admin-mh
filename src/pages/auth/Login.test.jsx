import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import Login from './Login';
import { loginRequest } from '../../utils/api';
import { saveSession } from '../../utils/auth';
import Swal from 'sweetalert2';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
jest.mock('../../utils/api', () => ({ loginRequest: jest.fn() }));
jest.mock('../../utils/auth', () => ({ saveSession: jest.fn() }));
jest.mock('sweetalert2', () => ({ fire: jest.fn() }));

test.each(['success', 'Invalid credentials', 'Failed to fetch', 'Could not reach server', 'HTTP 502'])('handles login result: %s', async message => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  if (message === 'success') loginRequest.mockResolvedValue({ token: 'test-token', expiresIn: 3600 });
  else loginRequest.mockRejectedValue(new Error(message));
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
    expect(loginRequest).toHaveBeenCalledWith('admin', 'admin');
    if (message === 'success') {
      expect(saveSession).toHaveBeenCalledWith('test-token', 3600);
      expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'success' }));
      return;
    }
    expect(saveSession).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ icon: 'error', title: 'Login failed' }));
  } finally { act(() => root.unmount()); }
});
