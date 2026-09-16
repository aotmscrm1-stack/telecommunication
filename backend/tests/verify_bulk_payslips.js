require('dotenv').config();
const mongoose = require('mongoose');
const Payslip = require('../src/models/Payslip');
const User = require('../src/models/User');
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function testBulkPayslips() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    let user = await User.findOne();
    if (!user) {
      user = await User.create({
        name: 'Test Admin',
        email: 'test_admin@aotms.com',
        password: 'Password123!',
        role: 'admin',
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const baseUrl = 'http://localhost:5000/api';

    const testPayload = {
      payslips: [
        {
          employee_name: 'Test Bulk Emp 1',
          employee_id: 'TB001',
          joining_date: '01-01-2024',
          designation: 'Software Engineer',
          department: 'Engineering',
          location: 'Vijayawada',
          effective_work_days: 30,
          lop: 0,
          bank_name: 'HDFC Bank',
          bank_account_number: '123456789012',
          pan_number: 'ABCDE1234F',
          pf_number: 'PF12345',
          uan_number: '101234567890',
          payslip_month: 'September 2026',
          gross_salary: 40000,
          incentive: 1000,
          tds: 200,
        },
        {
          employee_name: 'Test Bulk Emp 2',
          employee_id: 'TB002',
          joining_date: '10-02-2024',
          designation: 'QA Engineer',
          department: 'Quality',
          location: 'Vijayawada',
          effective_work_days: 30,
          lop: 2,
          bank_name: 'SBI',
          bank_account_number: '987654321098',
          pan_number: 'XYZPK9876Q',
          pf_number: 'PF67890',
          uan_number: '109876543210',
          payslip_month: 'September 2026',
          gross_salary: 30000,
          incentive: 500,
          tds: 200,
        },
      ],
    };

    console.log('Testing POST /api/payslips/bulk ...');
    const res = await axios.post(`${baseUrl}/payslips/bulk`, testPayload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('Response Status:', res.status);
    console.log('Response Message:', res.data.message);
    console.log('Saved count:', res.data.savedCount);
    console.log('Sample saved payslip:', {
      id: res.data.payslips[0]._id,
      name: res.data.payslips[0].employee_name,
      basic: res.data.payslips[0].basic_salary,
      hra: res.data.payslips[0].hra,
      special: res.data.payslips[0].special_allowance,
      net: res.data.payslips[0].net_salary,
      netInWords: res.data.payslips[0].net_salary_in_words,
    });

    // Cleanup test records
    await Payslip.deleteMany({ employee_id: { $in: ['TB001', 'TB002'] } });
    console.log('Cleanup test records completed.');

    console.log('ALL BULK PAYSLIP BACKEND TESTS PASSED SUCCESSFULLY! ✅');
    process.exit(0);
  } catch (err) {
    console.error('Test Failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

testBulkPayslips();
