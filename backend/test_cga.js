import axios from 'axios';
async function run() {
  try {
    const login = await axios.post('http://localhost:5000/api/auth/demo');
    const token = login.data.token;
    console.log('Login successful');
    const verify = await axios.post('http://localhost:5000/api/cga/verify', 
      { claim_text: 'Test claim' }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('CGA Verify:', verify.data);
  } catch(e) {
    console.error('Error:', e.response ? e.response.data : e.message);
  }
}
run();
