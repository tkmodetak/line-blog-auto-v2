module.exports = async (req, res) => {
  console.log('Webhook received:', req.method);
  
  // CORSê›íË
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-line-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'OK', 
      message: 'LINE Blog Auto Generator is running',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method === 'POST') {
    try {
      const events = req.body?.events || [];
      console.log('Events received:', events.length);
      
      // ä»íPÇ»âûìö
      return res.status(200).json({ 
        success: true, 
        eventsProcessed: events.length,
        message: 'Webhook processed successfully'
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(200).json({ 
        success: true, 
        error: error.message 
      });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};