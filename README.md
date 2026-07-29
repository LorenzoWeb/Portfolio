# Lorenzo-Snow Portfolio — Backend

## Quick Start

### 1. Install Node.js
Download from https://nodejs.org (choose the LTS version)

### 2. Install dependencies
Open a terminal in this folder and run:
```
npm install
```

### 3. Start the server
```
npm start
```

### 4. Open in your browser
- **Portfolio:**  http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin

---

## How to use the Admin Panel

### Editing content
1. Go to http://localhost:3000/admin
2. Use the sidebar to navigate to any section
3. Edit text fields directly
4. Press **💾 Save** (or Ctrl+S) to save — changes appear on your portfolio instantly

### Adding photos to projects
1. Go to **Image Manager** in the sidebar
2. Drag and drop your photos, or click to browse
3. Once uploaded, hover over an image and click **Copy URL**
4. Go to **Projects**, find your project, paste the URL into the image list, click **Add**
5. Save — your project now shows the photo (or a carousel if multiple)

### Adding a new project, experience, etc.
- Click the **+ Add …** button at the bottom of any section
- Fill in the fields
- Save

---

## File Structure
```
portfolio-backend/
├── server.js           ← Main server (run this)
├── package.json        ← Dependencies
├── portfolio-data.json ← All your content (auto-updated when you save)
├── admin.html          ← Admin panel
├── uploads/            ← Your uploaded photos live here
└── public/             ← Optional static files
```

## Tips
- **portfolio-data.json** is your single source of truth — back it up!
- Images in `uploads/` should also be backed up
- To stop the server: press Ctrl+C in the terminal
- To restart: run `npm start` again
