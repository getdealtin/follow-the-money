const express = require('express');
const cors = require('cors');
const NodeCache = require('node-cache');
const axios = require('axios');

const app = express();
const cache = new NodeCache({ stdTTL: 3600 });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const FEC_KEY = process.env.FEC_API_KEY || 'DEMO_KEY';
const FEC_BASE = 'https://api.open.fec.gov/v1';

app.get('/api/fec', async (req, res) => {
  try {
    const { fecpath, ...rest } = req.query;
    const query = { ...rest, api_key: FEC_KEY };
    const cacheKey = fecpath + JSON.stringify(query);
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ ...cached, _cached: true });
    const url = `${FEC_BASE}/${fecpath}`;
    const response = await axios.get(url, { params: query });
    cache.set(cacheKey, response.data);
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message;
    res.status(status).json({ error: message });
  }
});

app.get('/api/wikidata', async (req, res) => {
  try {
    const cacheKey = 'wiki_' + JSON.stringify(req.query);
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ ...cached, _cached: true });
    const response = await axios.get('https://www.wikidata.org/w/api.php', {
      params: { ...req.query, format: 'json' },
      headers: { 'User-Agent': 'FollowTheMoney/1.0 (civic transparency tool)' }
    });
    cache.set(cacheKey, response.data);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', cached_entries: cache.keys().length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
