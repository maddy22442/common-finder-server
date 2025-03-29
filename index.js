const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;


app.use(cors());
app.use(express.json());


const UPLOAD_DIR = path.join(__dirname, 'uploads');
const FORMATTED_DIR = path.join(__dirname, 'formatted_uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(FORMATTED_DIR)) fs.mkdirSync(FORMATTED_DIR, { recursive: true });


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    let baseName = path.basename(file.originalname, path.extname(file.originalname));


    if (/json/i.test(baseName)) {
      baseName = baseName.replace(/\s+/g, '').replace(/\d+/g, '');
    }

    const uniqueName = `${Date.now()}_${baseName}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });


function formatFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8').trim();
    content = content.replace(/\r\n/g, '\n');

    if (filePath.endsWith('.json') || filePath.endsWith('.json.txt')) {
      try {
        const jsonData = JSON.parse(content);
        if (!Array.isArray(jsonData)) {
          console.error(`Invalid JSON array in file: ${filePath}`);
          return null;
        }
        content = jsonData.join('\n') + '\n';
      } catch (e) {
        console.error(`Error parsing JSON in file ${filePath}:`, e.message);
        return null;
      }
    }

    if (!content.length) {
      console.error(`File ${filePath} is empty or invalid.`);
      return null;
    }

    const formattedFileName = path.basename(filePath, path.extname(filePath)) + '_formatted.txt';
    const formattedFilePath = path.join(FORMATTED_DIR, formattedFileName);
    fs.writeFileSync(formattedFilePath, content, 'utf-8');
 

    return formattedFilePath;
  } catch (error) {
    console.error(`Error formatting file ${filePath}:`, error.message);
    return null;
  }
}

function readAddressesFromFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8').trim();
    return new Set(content.split('\n').map(addr => addr.trim()).filter(addr => addr.length > 0));
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err.message);
    return new Set();
  }
}

function findCommonAddresses(files) {
  if (files.length === 0) return new Set();

  let commonAddresses = readAddressesFromFile(files[0]);

  for (let i = 1; i < files.length; i++) {
    const currentAddresses = readAddressesFromFile(files[i]);
    commonAddresses = new Set([...commonAddresses].filter(addr => currentAddresses.has(addr)));

    if (commonAddresses.size === 0) break;
  }

  return commonAddresses;
}

function deleteFiles(files) {
  files.forEach(file => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    
    }
  });
}

app.post('/api/find-common', upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ 
        error: 'Please upload at least 2 files',
        message: 'Insufficient files uploaded'
      });
    }

    const originalPaths = req.files.map(file => file.path);
    const formattedPaths = originalPaths.map(formatFile).filter(Boolean);

    if (formattedPaths.length < 2) {
      deleteFiles(originalPaths); 
      deleteFiles(formattedPaths); 
      return res.status(400).json({ error: 'Invalid or improperly formatted files' });
    }

    const commonAddresses = findCommonAddresses(formattedPaths);

    deleteFiles(originalPaths);
    deleteFiles(formattedPaths);

    console.log('Common addresses:', commonAddresses);

    res.json({
      success: true,
      count: commonAddresses.size,
      commonAddresses: Array.from(commonAddresses).sort()
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
