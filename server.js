


// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const cors = require('cors');

// const app = express();

// app.use(cors());
// app.use(express.json());

// const UPLOAD_DIR = '/tmp/uploads'; // Change directory to /tmp (Vercel only allows this)
// const FORMATTED_DIR = '/tmp/formatted_uploads'; 

// if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// if (!fs.existsSync(FORMATTED_DIR)) fs.mkdirSync(FORMATTED_DIR, { recursive: true });

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, UPLOAD_DIR);
//   },
//   filename: (req, file, cb) => {
//     let baseName = path.basename(file.originalname, path.extname(file.originalname));

//     if (/json/i.test(baseName)) {
//       baseName = baseName.replace(/\s+/g, '').replace(/\d+/g, '');
//     }

//     const uniqueName = `${Date.now()}_${baseName}${path.extname(file.originalname)}`;
//     cb(null, uniqueName);
//   }
// });

// const upload = multer({ storage: storage });

// function formatFile(filePath) {
//   try {
//     let content = fs.readFileSync(filePath, 'utf-8').trim();
//     content = content.replace(/\r\n/g, '\n');

//     if (filePath.endsWith('.json') || filePath.endsWith('.json.txt')) {
//       try {
//         const jsonData = JSON.parse(content);
//         if (!Array.isArray(jsonData)) {
//           console.error(`Invalid JSON array in file: ${filePath}`);
//           return null;
//         }
//         content = jsonData.join('\n') + '\n';
//       } catch (e) {
//         console.error(`Error parsing JSON in file ${filePath}:`, e.message);
//         return null;
//       }
//     }

//     if (!content.length) {
//       console.error(`File ${filePath} is empty or invalid.`);
//       return null;
//     }

//     const formattedFileName = path.basename(filePath, path.extname(filePath)) + '_formatted.txt';
//     const formattedFilePath = path.join(FORMATTED_DIR, formattedFileName);
//     fs.writeFileSync(formattedFilePath, content, 'utf-8');

//     return formattedFilePath;
//   } catch (error) {
//     console.error(`Error formatting file ${filePath}:`, error.message);
//     return null;
//   }
// }

// function readAddressesFromFile(filePath) {
//   try {
//     let content = fs.readFileSync(filePath, 'utf-8').trim();
//     return new Set(content.split('\n').map(addr => addr.trim()).filter(addr => addr.length > 0));
//   } catch (err) {
//     console.error(`Error reading file ${filePath}:`, err.message);
//     return new Set();
//   }
// }

// function findCommonAddresses(files) {
//   if (files.length === 0) return new Set();

//   let commonAddresses = readAddressesFromFile(files[0]);

//   for (let i = 1; i < files.length; i++) {
//     const currentAddresses = readAddressesFromFile(files[i]);
//     commonAddresses = new Set([...commonAddresses].filter(addr => currentAddresses.has(addr)));

//     if (commonAddresses.size === 0) break;
//   }

//   return commonAddresses;
// }

// function deleteFiles(files) {
//   files.forEach(file => {
//     if (fs.existsSync(file)) {
//       fs.unlinkSync(file);
//     }
//   });
// }

// app.post('/api/find-common', upload.array('files', 10), (req, res) => {
//   try {
//     if (!req.files || req.files.length < 2) {
//       return res.status(400).json({ 
//         error: 'Please upload at least 2 files',
//         message: 'Insufficient files uploaded'
//       });
//     }

//     const originalPaths = req.files.map(file => file.path);
//     const formattedPaths = originalPaths.map(formatFile).filter(Boolean);

//     if (formattedPaths.length < 2) {
//       deleteFiles(originalPaths); 
//       deleteFiles(formattedPaths); 
//       return res.status(400).json({ error: 'Invalid or improperly formatted files' });
//     }

//     const commonAddresses = findCommonAddresses(formattedPaths);

//     deleteFiles(originalPaths);
//     deleteFiles(formattedPaths);

//     console.log('Common addresses:', commonAddresses);

//     res.json({
//       success: true,
//       count: commonAddresses.size,
//       commonAddresses: Array.from(commonAddresses).sort()
//     });

//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).json({
//       error: 'Internal server error',
//       message: error.message
//     });
//   }
// });

// // Vercel requires exporting the app
// module.exports = app;

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Environment configuration
const isVercel = process.env.VERCEL === '1';
const UPLOAD_DIR = isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads');
const FORMATTED_DIR = isVercel ? '/tmp/formatted_uploads' : path.join(__dirname, 'formatted_uploads');

// Create directories if they don't exist
const createDirectories = () => {
  try {
    [UPLOAD_DIR, FORMATTED_DIR].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    });
  } catch (err) {
    console.error('Error creating directories:', err);
    process.exit(1);
  }
};

createDirectories();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    let baseName = path.basename(file.originalname, path.extname(file.originalname));

    // Clean JSON filenames
    if (/json/i.test(baseName)) {
      baseName = baseName.replace(/\s+/g, '').replace(/\d+/g, '');
    }

    const uniqueName = `${Date.now()}_${baseName}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Max 10 files
  }
});

/**
 * Formats the content of a file
 * @param {string} filePath - Path to the file
 * @returns {string|null} Path to formatted file or null if error
 */
const formatFile = (filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8').trim();
    content = content.replace(/\r\n/g, '\n');

    // Handle JSON files
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
};

/**
 * Reads addresses from a file into a Set
 * @param {string} filePath - Path to the file
 * @returns {Set<string>} Set of addresses
 */
const readAddressesFromFile = (filePath) => {
  try {
    let content = fs.readFileSync(filePath, 'utf-8').trim();
    return new Set(
      content.split('\n')
        .map(addr => addr.trim())
        .filter(addr => addr.length > 0)
    );
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err.message);
    return new Set();
  }
};

/**
 * Finds common addresses across multiple files
 * @param {string[]} files - Array of file paths
 * @returns {Set<string>} Set of common addresses
 */
const findCommonAddresses = (files) => {
  if (files.length === 0) return new Set();

  let commonAddresses = readAddressesFromFile(files[0]);

  for (let i = 1; i < files.length; i++) {
    const currentAddresses = readAddressesFromFile(files[i]);
    commonAddresses = new Set([...commonAddresses].filter(addr => currentAddresses.has(addr)));

    if (commonAddresses.size === 0) break;
  }

  return commonAddresses;
};

/**
 * Deletes multiple files
 * @param {string[]} files - Array of file paths to delete
 */
const deleteFiles = (files) => {
  files.forEach(file => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch (err) {
      console.error(`Error deleting file ${file}:`, err.message);
    }
  });
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: isVercel ? 'vercel' : 'local',
    uploadDir: UPLOAD_DIR,
    formattedDir: FORMATTED_DIR,
    timestamp: new Date().toISOString()
  });
});

// Main endpoint
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
      return res.status(400).json({ 
        error: 'Invalid or improperly formatted files',
        details: 'Ensure files contain valid data and are either text files or JSON arrays'
      });
    }

    const commonAddresses = findCommonAddresses(formattedPaths);

    // Clean up files
    deleteFiles(originalPaths);
    deleteFiles(formattedPaths);

    res.json({
      success: true,
      count: commonAddresses.size,
      commonAddresses: Array.from(commonAddresses).sort()
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Start server or export for Vercel
if (isVercel) {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`
    Server running in ${process.env.NODE_ENV || 'development'} mode
    Access URLs:
    - Local:      http://localhost:${PORT}
    - Health:     http://localhost:${PORT}/api/health
    - Main endpoint: POST http://localhost:${PORT}/api/find-common
    
    File directories:
    - Uploads:    ${UPLOAD_DIR}
    - Formatted:  ${FORMATTED_DIR}
    `);
  });
}