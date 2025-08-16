module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({ 
    status: 'OK',
    message: 'Hello from LINE Blog Generator',
    method: req.method,
    timestamp: new Date().toISOString()
  });
};
// Force rebuild
