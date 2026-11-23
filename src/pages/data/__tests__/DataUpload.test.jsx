import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import DataUpload from '../DataUpload';
import Swal from 'sweetalert2';
import { getToken, clearSession } from '../../../utils/auth';
const mockNavigate = jest.fn();
jest.mock('react-router-dom',()=>({useNavigate:()=>mockNavigate}));
jest.mock('../../../components/Layout',()=>({children})=><div>{children}</div>);
jest.mock('../../../utils/auth',()=>({getToken:jest.fn(),clearSession:jest.fn()}));
jest.mock('sweetalert2',()=>({fire:jest.fn()}));
let root, container;
const button = text => [...container.querySelectorAll('button')].find(b=>b.textContent===text);
const select = () => act(()=>Simulate.change(container.querySelector('input[type=file]'),{target:{files:[new File(['workbook'],'data.xlsx')]}}));
beforeEach(()=>{
  global.IS_REACT_ACT_ENVIRONMENT=true;
  jest.clearAllMocks(); getToken.mockReturnValue('login-token'); global.fetch=jest.fn();
  container=document.createElement('div'); document.body.appendChild(container); root=createRoot(container);
  act(()=>root.render(<DataUpload/>)); act(()=>button('Upload File').click()); select();
});
afterEach(()=>{act(()=>root.unmount());container.remove();delete global.fetch;});
test('uploads only file with the login Bearer token and reports server success',async()=>{
  expect(container.querySelector('form').enctype).toBe('multipart/form-data');
  expect(container.querySelector('input[type=file]').name).toBe('file');
  fetch.mockResolvedValue({ok:true,status:200,json:async()=>({message:'Excel inputs updated successfully'})});
  await act(async()=>button('Upload & Process').click());
  const [url,request]=fetch.mock.calls[0];
  expect(url).toBe('/api/admin/upload-excel'); expect(request.method).toBe('POST');
  expect(request.headers).toEqual({Authorization:'Bearer login-token'});
  expect([...request.body.keys()]).toEqual(['file']); expect(request.body.get('file').name).toBe('data.xlsx');
  expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({icon:'success',text:'Excel inputs updated successfully'}));
  expect(container.querySelector('input[type=file]')).toBeNull();
});
test.each([false,true])('failed uploads keep the file and never show success (network=%s)',async network=>{
  if(network) fetch.mockRejectedValue(new Error('Network unavailable'));
  else fetch.mockResolvedValue({ok:false,status:400,json:async()=>({message:'Invalid workbook'})});
  await act(async()=>button('Upload & Process').click());
  expect(container.querySelector('[role=alert]').textContent).toContain(network?'Network unavailable':'Invalid workbook');
  expect(container.textContent).toContain('data.xlsx'); expect(button('Upload & Process').disabled).toBe(false);
  expect(Swal.fire).not.toHaveBeenCalled();
});
test('shows the server validation details for HTTP 422',async()=>{
  fetch.mockResolvedValue({ok:false,status:422,json:async()=>({detail:[{loc:['body','file'],msg:'Field required',type:'missing'}]})});
  await act(async()=>button('Upload & Process').click());
  expect(container.querySelector('[role=alert]').textContent).toBe('file: Field required');
  expect(Swal.fire).not.toHaveBeenCalled();
  expect(container.textContent).toContain('data.xlsx');
});
test('expired token returns to login',async()=>{
  fetch.mockResolvedValue({ok:false,status:401,json:async()=>({message:'Unauthorized'})});
  await act(async()=>button('Upload & Process').click());
  expect(clearSession).toHaveBeenCalled();expect(mockNavigate).toHaveBeenCalledWith('/login',{replace:true});
});
test('shows the workbook sheet and cell rejected by the API',async()=>{
  fetch.mockResolvedValue({ok:false,status:422,json:async()=>({
    error:'Workbook validation failed; no database data was changed',
    details:{issues:[{sheet:'MPSEC Results',address:'C76',error:'New formula is not supported by the deployed model'}]}
  })});
  await act(async()=>Simulate.submit(container.querySelector('form')));
  expect(container.querySelector('[role=alert]').textContent).toContain('MPSEC Results!C76: New formula is not supported by the deployed model');
  expect(Swal.fire).not.toHaveBeenCalled();
});
test('does not submit with a missing token or send duplicate requests',async()=>{
  getToken.mockReturnValue(null);
  await act(async()=>button('Upload & Process').click()); expect(fetch).not.toHaveBeenCalled();
  getToken.mockReturnValue('login-token'); let resolve;
  fetch.mockReturnValue(new Promise(r=>{resolve=r;}));
  act(()=>{button('Upload & Process').click();button('Upload & Process').click();});
  expect(fetch).toHaveBeenCalledTimes(1); expect(container.querySelector('input[type=file]').disabled).toBe(true);
  await act(async()=>resolve({ok:true,status:200,json:async()=>({})}));
});
