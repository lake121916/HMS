const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login to http://localhost:5000/api/auth/login');
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'nurse@hospital.com',
      password: 'nurse123'
    });
    
    console.log('Login successful!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Login failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Backend may not be running.');
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLogin();
