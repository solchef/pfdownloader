const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const session = require('express-session');
const nodemailer = require('nodemailer'); // Import Nodemailer

const app = express();
const PORT = 3000;

// Folder where the files are stored
const files = {
    'sitenants1.tar.gz': path.join(__dirname, 'uploads', 'sitenants1.tar.gz'),
    'sitenants2.tar.gz': path.join(__dirname, 'uploads', 'sitenants2.tar.gz'),
    'sonarqube.zip': path.join(__dirname, 'uploads', 'sonarqube.zip')
};

// Middleware to parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Session middleware for storing the PIN
app.use(session({
    secret: 'your-secret-key', // Replace with a strong secret
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Generate a random 6-digit PIN and store it in the session
app.use((req, res, next) => {
    if (!req.session.pin) {
        req.session.pin = crypto.randomInt(100000, 999999);
        console.log(`Initial PIN: ${req.session.pin}`); // Log the PIN when it's generated
    }
    next();
});

// Serve static files (HTML, CSS)
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Validate the PIN
app.post('/validate-pin', (req, res) => {
    const { enteredPin } = req.body;
    console.log(req.session.pin, enteredPin);
    if (parseInt(enteredPin, 10) === req.session.pin) {
        res.status(200).send('Valid PIN');
    } else {
        res.status(401).send('Invalid PIN');
    }
});

// Handle file download request with PIN
app.post('/download', (req, res) => {
    const { enteredPin, fileName } = req.body;

    // Check if the entered PIN matches the generated PIN
    if (parseInt(enteredPin, 10) === req.session.pin) {
        const filePath = files[fileName];

        if (filePath && fs.existsSync(filePath)) {
            res.download(filePath, (err) => {
                if (err) {
                    res.status(500).send('Error while downloading the file.');
                }
            });
        } else {
            res.status(404).send('File not found!');
        }
    } else {
        res.status(401).send('Incorrect PIN. Access denied.');
    }
});

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.com', // Replace with your email provider's SMTP server
    port: 587, // Common SMTP port
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'tech-support@payflares.com',
        pass: 'Surgeon12*' 
    },
    tls: {
      rejectUnauthorized: false,
    },
    requireTLS: true
});

// Reset the PIN after every successful download and send an email
app.post('/reset-pin', (req, res) => {
    req.session.pin = crypto.randomInt(100000, 999999);

    // Prepare the email
    const mailOptions = {
        from: 'tech-support@payflares.com', // Sender address
        to: 'sitenantshosting@gmail.com', // Replace with the recipient's email
        subject: 'Your Payflares Internal Downloads Vault PIN has been reset',
        text: `Your new PIN is: ${req.session.pin}`
    };

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).send('Error sending email.');
        }
        console.log('Email sent:', info.response);
        res.send(`New PIN generated: ${req.session.pin}`);
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`File Transfer App running on http://localhost:${PORT}`);
});
