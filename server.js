const express = require('express');
const AWS = require('aws-sdk');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ✅ Allow only your Vercel frontend
app.use(cors({
  origin: "https://secure-s3-frontend-ipeb.vercel.app"
}));

app.use(express.json());

// ✅ AWS SDK Config
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

// ✅ Create Folder
app.post('/create-folder', async (req, res) => {
  const { folderName, userId } = req.body;
  if (!folderName || !userId) return res.status(400).json({ error: "Missing fields" });

  const key = `${userId}/${folderName}/.keep`;
  const params = { Bucket: BUCKET_NAME, Key: key, Body: '' };

  try {
    await s3.putObject(params).promise();
    res.json({ message: "Folder created successfully" });
  } catch (err) {
    res.status(500).json({ error: "Folder creation failed" });
  }
});

// ✅ Get Pre-Signed URL for Upload
app.post('/get-presigned-url', async (req, res) => {
  const { fileName, folderName, userId } = req.body;
  if (!fileName || !folderName || !userId) return res.status(400).json({ error: "Missing fields" });

  const key = `${userId}/${folderName}/${fileName}`;
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: 60,
    ContentType: 'application/octet-stream'
  };

  try {
    const url = s3.getSignedUrl('putObject', params);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate URL" });
  }
});

// ✅ List Files in Folder
app.post('/list-files', async (req, res) => {
  const { userId, folderName } = req.body;
  if (!userId || !folderName) return res.status(400).json({ error: "Missing fields" });

  const prefix = `${userId}/${folderName}/`;
  const params = { Bucket: BUCKET_NAME, Prefix: prefix };

  try {
    const data = await s3.listObjectsV2(params).promise();
    const files = data.Contents
      .filter(item => !item.Key.endsWith('/.keep'))
      .map(item => item.Key.replace(prefix, ''));
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: "Failed to list files" });
  }
});

// ✅ Get Pre-Signed URL for Download
app.post('/get-download-url', async (req, res) => {
  const { fileName, folderName, userId } = req.body;
  if (!fileName || !folderName || !userId) return res.status(400).json({ error: "Missing fields" });

  const key = `${userId}/${folderName}/${fileName}`;
  const params = { Bucket: BUCKET_NAME, Key: key, Expires: 60 };

  try {
    const url = s3.getSignedUrl('getObject', params);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate download URL" });
  }
});

// ✅ Delete File
app.post('/delete-file', async (req, res) => {
  const { fileName, folderName, userId } = req.body;
  if (!fileName || !folderName || !userId) return res.status(400).json({ error: "Missing fields" });

  const key = `${userId}/${folderName}/${fileName}`;
  const params = { Bucket: BUCKET_NAME, Key: key };

  try {
    await s3.deleteObject(params).promise();
    res.json({ message: "File deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "File deletion failed" });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
