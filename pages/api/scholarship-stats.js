import path from 'path';
import fs from 'fs/promises';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const filePath = path.join(process.cwd(), 'public', 'data', 'scholarships', 'scholarship_stats.json');
    const fileContent = await fs.readFile(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in scholarship-stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
