const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const UPLOAD_DIR = '/tmp/uploads';
const FORMATTED_DIR = '/tmp/formatted_uploads';

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(FORMATTED_DIR)) fs.mkdirSync(FORMATTED_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    let baseName = path.basename(file.originalname, path.extname(file.originalname));
    if (/json/i.test(baseName)) baseName = baseName.replace(/\s+/g, '').replace(/\d+/g, '');
    cb(null, `${Date.now()}_${baseName}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

async function formatFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8').trim().replace(/\r\n/g, '\n');
    if (filePath.endsWith('.json') || filePath.endsWith('.json.txt')) {
      const jsonData = JSON.parse(content);
      if (!Array.isArray(jsonData)) return null;
      content = jsonData.join('\n') + '\n';
    }
    if (!content.length) return null;
    const formattedFilePath = path.join(FORMATTED_DIR, path.basename(filePath, path.extname(filePath)) + '_formatted.txt');
    fs.writeFileSync(formattedFilePath, content, 'utf-8');
    return formattedFilePath;
  } catch {
    return null;
  }
}

async function findCommonAddresses(files) {
  const readAddressesFromFile = filePath => new Set(fs.readFileSync(filePath, 'utf-8').trim().split('\n').map(addr => addr.trim()).filter(addr => addr.length > 0));
  return files.reduce((common, file, index) => index === 0 ? readAddressesFromFile(file) : new Set([...common].filter(addr => readAddressesFromFile(file).has(addr))), new Set());
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const middleware = promisify(upload.array('files', 10));
  await middleware(req, res);

  if (!req.files || req.files.length < 2) return res.status(400).json({ error: 'Please upload at least 2 files' });

  const formattedPaths = (req.files.map(file => formatFile(file.path))).filter(Boolean);
  if (formattedPaths.length < 2) return res.status(400).json({ error: 'Invalid files' });

  const commonAddresses = findCommonAddresses(formattedPaths);
  res.json({ success: true, count: commonAddresses.size, commonAddresses: Array.from(commonAddresses) });
};
