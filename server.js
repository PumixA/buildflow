const express = require('express');
const app = express();
app.get('/health', (req, res) => res.status(200).json({ status: 'UP', service: 'BuildFlow-API' }));
app.listen(3000, () => console.log('MVP running on port 3000'));