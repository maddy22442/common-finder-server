# Common Address Finder - Server

This is the backend server for the Common Address Finder project. It handles file uploads, processes text and JSON files, extracts valid addresses, and finds common addresses across multiple files.

## Features
- Accepts `.txt` and `.json` files
- Formats and validates uploaded files
- Finds common addresses across multiple files
- Deletes uploaded and processed files after execution
- Uses `multer` for file uploads and `cors` for cross-origin support

## Requirements
Make sure you have the following installed before running the server:
- [Node.js](https://nodejs.org/) (v14 or later)
- npm (Node Package Manager)

## Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/common-address-finder-server.git
   cd common-address-finder-server
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

## Usage
### Start the Server
Run the following command to start the server:
```sh
node server.js
```
The server will be running on `http://localhost:3000`.

### API Endpoint
#### `POST /api/find-common`
- **Description:** Accepts multiple file uploads, processes them, and returns common addresses.
- **Headers:**
  ```json
  {
    "Accept": "application/json"
  }
  ```
- **Body:** Multipart form-data with key `files[]` (supports multiple files)
- **Response:**
  ```json
  {
    "success": true,
    "count": 5,
    "commonAddresses": ["123 Main St", "456 Elm St", "789 Oak St"]
  }
  ```

## Project Structure
```
common-address-finder-server/
│-- server.js       # Main server file
│-- package.json    # Dependencies and scripts
│-- uploads/        # Temporary file storage
│-- formatted_uploads/ # Processed files
```

## Dependencies
- `express` - Web framework for Node.js
- `multer` - Middleware for handling file uploads
- `cors` - Enables cross-origin requests
- `fs` - File system module for handling file operations

## License
This project is licensed under the MIT License.

