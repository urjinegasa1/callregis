const express=require('express');
const mongoose=require('mongoose');
const path = require('path');  // Add this line
const callRoutes = require('./routes/calls');

const session=require('express-session');
const bcrypt=require('bcryptjs');
const User=require('./models/User');
const Call = require('./models/Call');
const auth = require('./middleware/auth')
const jwt = require('jsonwebtoken');
const app=express();
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect('mongodb://localhost:27017/Authen')
    .then(() => {
        console.log('Connected to MongoDB successfully');
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    });
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(callRoutes);
app.use(session({
    secret:'ABcd',resave:false,saveUninitialized:false
}));
app.get('/',(req,res)=>{
    res.sendFile(__dirname+'/index.html');



})

app.get('/login',(req,res)=>{
    res.sendFile(__dirname+'/login.html');
})

    app.post('/register', async (req, res) => {
        try {
            const { fullname, username, password, confirmPassword, role } = req.body;
            
            // Basic validation
            if (!fullname || !username || !password || !role) {
                return res.status(400).json({ error: 'All fields are required' });
            }
    
            if (password !== confirmPassword) {
                return res.status(400).json({ error: 'Passwords do not match' });
            }
    
            // Check existing user
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ error: 'Username already exists' });
            }
    
            // Create new user
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = new User({
                fullname,
                username,
                password: hashedPassword,
                role
            });
    
            await user.save();
            res.status(201).json({ message: 'Registration successful' });
    
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    });
app.get('/dashbord',(req,res)=>{
    if(req.session.role!=='admin'){
        return res.status(403).json({
            error:'unauthorized'
        })
    }
    res.sendFile('dashboard.html')
})
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find user
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid username or password'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user._id,
                username: user.username,
                role: user.role 
            },
            'your-secret-key', // Replace with a secure secret from environment variables
            { expiresIn: '24h' }
        );

        // Success response with token
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            username: user.username,
            role: user.role,
            token: token // Send token to client
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            error: 'An error occurred during login'
        });
    }
});

app.post('/api/calls/new', auth, async (req, res) => {
    try {
        console.log('Received call submission:', req.body); // Debug log
        console.log('Authenticated user:', req.user); // Debug log

        // Validate required fields
        const requiredFields = ['bank', 'district', 'problem', 'terminal', 'contact', 'comments'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({
                    success: false,
                    error: `${field} is required`
                });
            }
        }

        const call = new Call({
            bank: req.body.bank,
            district: req.body.district,
            problem: req.body.problem,
            terminal: req.body.terminal,
            contact: req.body.contact,
            comments: req.body.comments,
            createdBy: req.user._id,
            status: 'pending'
        });

        console.log('Call object before save:', call); // Debug log

        await call.save();

        console.log('Call saved successfully'); // Debug log

        res.status(201).json({
            success: true,
            message: 'Call registered successfully',
            call: call
        });

    } catch (error) {
        console.error('Call registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register call'
        });
    }
});
app.get('/api/calls', auth, async (req, res) => {
    try {
        console.log('Fetching calls for user:', req.user._id);
        
        const calls = await Call.find()
            .populate('createdBy', 'username')
            .sort({ createdAt: -1 });
        
        console.log('Found calls:', calls); // Debug log

        res.json({
            success: true,
            calls
        });

    } catch (error) {
        console.error('Get calls error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch calls'
        });
    }
});

const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;

// Get report statistics
app.get('/api/calls/report', auth, async (req, res) => {
    try {
        const month = parseInt(req.query.month);
        const year = new Date().getFullYear();
        
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const calls = await Call.find({
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        });

        const stats = {
            totalCalls: calls.length,
            approvedCalls: calls.filter(call => call.status === 'approved').length,
            pendingCalls: calls.filter(call => call.status === 'pending').length,
            totalDuration: 'N/A' // Add duration calculation if needed
        };

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Report generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate report'
        });
    }
});

// Download report as CSV
app.get('/api/calls/report/download', auth, async (req, res) => {
    try {
        const month = parseInt(req.query.month);
        const year = new Date().getFullYear();
        
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const calls = await Call.find({
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).populate('createdBy', 'username');

        const csvStringifier = createCsvStringifier({
            header: [
                {id: 'date', title: 'Date'},
                {id: 'bank', title: 'District'},
                {id: 'district', title: 'Branch'},
                {id: 'status', title: 'Status'},
                {id: 'problem', title: 'Problem'},
                {id: 'contact', title: 'Phone'},
                {id: 'comments', title: 'Comments'},
                {id: 'createdBy', title: 'Created By'}
            ]
        });

        const records = calls.map(call => ({
            date: call.createdAt.toLocaleDateString(),
            bank: call.bank,
            district: call.district,
            status: call.status,
            problem: call.problem,
            contact: call.contact,
            comments: call.comments,
            createdBy: call.createdBy.username
        }));

        const csvString = csvStringifier.stringifyRecords(records);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=calls-report-${month}-${year}.csv`);
        res.send(csvStringifier.getHeaderString() + csvString);

    } catch (error) {
        console.error('CSV generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate CSV'
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});