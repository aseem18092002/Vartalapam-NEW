const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const bodyParser = require('body-parser');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Error: Images only!');
        }
    }
}).single('image');

// Create uploads directory if it doesn't exist
if (!fs.existsSync('./public/uploads')) {
    fs.mkdirSync('./public/uploads', { recursive: true });
}

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// In-memory storage
const messages = [];
const users = new Map(); // socketId -> { username, profilePic }

// Routes for file upload
app.post('/upload/profile', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            res.status(400).json({ error: err });
        } else if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
        } else {
            res.json({ filename: `/uploads/${req.file.filename}` });
        }
    });
});

app.post('/upload/message', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            res.status(400).json({ error: err });
        } else if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
        } else {
            res.json({ filename: `/uploads/${req.file.filename}` });
        }
    });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('user_join', (data) => {
        users.set(socket.id, {
            username: data.username,
            profilePic: data.profilePic || '/api/placeholder/40/40'
        });
        io.emit('user_joined', {
            users: Array.from(users.values()),
            username: data.username
        });
    });

    socket.on('send_message', (data) => {
        const user = users.get(socket.id);
        const message = {
            id: Date.now(),
            user: user.username,
            profilePic: user.profilePic,
            text: data.text,
            image: data.image,
            timestamp: new Date().toISOString()
        };
        messages.push(message);
        io.emit('new_message', message);
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        users.delete(socket.id);
        if (user) {
            io.emit('user_left', {
                users: Array.from(users.values()),
                username: user.username
            });
        }
    });
});



// require('dotenv').config();



// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect('mongodb+srv://aseemmishra3184:Aseem%402002@cluster0.c5kab.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
  
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
  
});

const User = mongoose.model('User', userSchema);

// Routes
app.post('/api/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }
    res.json({ message: 'Logged in successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});




const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});