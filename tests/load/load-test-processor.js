// Load test processor for custom functions

function randomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function randomInvoiceData() {
  const itemCount = Math.floor(Math.random() * 5) + 1;
  const items = [];

  for (let i = 0; i < itemCount; i++) {
    items.push({
      lot_id: `LOT-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
      title: `Test Item ${i + 1}`,
      quantity: Math.floor(Math.random() * 3) + 1,
      unit_price: parseFloat((Math.random() * 1000 + 50).toFixed(2))
    });
  }

  return {
    items,
    buyers_premium_rate: 0.10,
    tax_rate: 0.0825
  };
}

function generateUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
    'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0'
  ];

  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

module.exports = {
  randomString,
  randomInvoiceData,
  generateUserAgent
};