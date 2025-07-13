// Quick script to create company-a
// Run this in your browser console while logged in as super-admin

const createCompanyA = async () => {
  const response = await fetch('/api/create-company', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Company A',
      slug: 'company-a',
      adminEmail: 'admin@company-a.com'
    })
  });
  
  const result = await response.json();
  console.log('Company A created:', result);
};

createCompanyA();