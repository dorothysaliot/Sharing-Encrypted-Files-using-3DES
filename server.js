require("dotenv").config()
const multer = require("multer")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")
const File = require("./models/File")
const crypto = require('crypto')
const path = require("path");
const express = require("express")
const app = express()
app.use(express.urlencoded({ extended: true }))

// const upload = multer({ dest: "uploads" })
const connectDB = require('./config/db')
connectDB();

mongoose.connect(process.env.MONGO_URI)

app.set("view engine", "ejs")



app.get("/", (req, res) => {
  res.render("index")
})

// app.use(express.static('public'));
// app.use(express.static(__dirname + '/public'));
// app.use(express.static("public"));
// app.use('/css',express.static(__dirname +'/css'));
app.use(express.static(__dirname + '/public'));


// app.get('/', function (req, res) {
//   res.sendFile(path.join(__dirname + '/views/index.html'));
// });

const upload = multer({
    dest: "upload"
    
  });
  
 
app.post("/upload", upload.single("file"), async (req, res) => {
  const fileData = {
    path: req.file.path,
    originalName: req.file.originalname,
  }
  if (req.body.password != null && req.body.password !== "") {
    fileData.password = await bcrypt.hash(req.body.password, 10)
  }

  const file = await File.create(fileData)
  const filePath = req.file.path; // source file path
  const encryptedFilePath = encrypt3DES(filePath, 'testkey');
  decrypt3DES(encryptedFilePath, 'testkey');

  res.render("index", { fileLink: `${req.headers.origin}/file/${file.id}` })
})

app.route("/file/:id").get(handleDownload).post(handleDownload)

async function handleDownload(req, res) {

  const file = await File.findById(req.params.id)

  if (file.password != null) {
    if (req.body.password == null) {
      res.render("password")
      return
    }

    if (!(await bcrypt.compare(req.body.password, file.password))) {
      res.render("password", { error: true })
      return
    }
  }
 
  file.downloadCount++
  await file.save()
  console.log(file.downloadCount)

  res.download(file.path, file.originalName)
}



/**
 * Encrypt 3DES using Node.js's crypto module * 
 * @param data A utf8 string
 * @param key Key would be hashed by md5 and shorten to maximum of 192 bits,
 * @returns {*} A base64 string
 */
function encrypt3DES(data, key) {
  const md5Key = crypto.createHash('md5').update(key).digest("hex").substr(0, 24);
  const cipher = crypto.createCipheriv('des-ede3', md5Key, '');
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
  }

  
/**
 * Decrypt 3DES using Node.js's crypto module 
 * @param data a base64 string
 * @param key Key would be hashed by md5 and shorten to max 192 bits,
 * @returns {*} a utf8 string
 */
function decrypt3DES(data, key) {
  const md5Key = crypto.createHash('md5').update(key).digest("hex").substr(0, 24);
  const decipher = crypto.createDecipheriv('des-ede3', md5Key, '');
  let encrypted = decipher.update(data, 'base64', 'utf8');
  encrypted += decipher.final('utf8');
  return encrypted;
  }

 
 
app.listen(process.env.PORT || 3000)