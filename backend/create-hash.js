const bcrypt = require('bcryptjs');

async function createPasswordHash() {
    const password = 'fd@2127!';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('================================');
    console.log('Password: fd@2127!');
    console.log('Hashed Password:', hashedPassword);
    console.log('====================================');
    
    // Test verification
    const isValid = await bcrypt.compare('fd@2127!', hashedPassword);
    console.log('Password verification test:', isValid ? '✅ SUCCESS' : '❌ FAILED');
}

createPasswordHash();