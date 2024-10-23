const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { v4 } = require("uuid");
const fs = require("fs/promises");
// files path
const FILES_PATH = path.join(__dirname, "files");

// create express app
const app = express();

// use cors middleware
app.use(cors());
app.use(express.json());

// configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, FILES_PATH);
  },
  filename: function (req, file, cb) {
    const uniqueID = v4();
    const extension = path.extname(file.originalname);
    const originalName = path.basename(file.originalname, extension);
    cb(null, `${uniqueID}-${originalName}${extension}`);
  },
});

const upload = multer({ storage: storage });

/*
    @desc: upload a file
    @route: /upload
    @access: public
*/
app.post("/upload", upload.single("file"), (req, res) => {
  res.status(200).json({
    message: "file uploaded successfully",
  });
});

app.get("/files", async (req, res) => {
  try {
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    const page = parseInt(req.query.page, 10) || 0;
    const sortField = req.query.sortField || "dateUploaded";
    const sortOrder = req.query.sortOrder || "asc";
    const files = await Promise.all(
      (
        await fs.readdir(FILES_PATH)
      ).map(async (file) => {
        const stat = await fs.stat(path.join(FILES_PATH, file));
        const uuidRegex =
          /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(.+)/i;
        const match = file.match(uuidRegex);
        const originalFileName = match ? match[2].trim() : file;
        return {
          originalName: originalFileName,
          size: stat.size,
          dateUploaded: stat.birthtime.toISOString(),
        };
      })
    );

    const filesList = files.sort((a, b) => {
      if (sortOrder === "asc") {
        return a[sortField] > b[sortField] ? 1 : -1;
      } else {
        return a[sortField] < b[sortField] ? 1 : -1;
      }
    });

    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;

    return res.status(200).json({
      status: "success",
      data: {
        filesList: filesList.slice(startIndex, endIndex),
        totalFilesCount: files.length,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "something went wrong",
      error,
    });
  }
});

app.listen(3000, () => {
  console.log("server is running on port 3000");
});
