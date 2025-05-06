// server.js
const express = require('express');
const webPush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

const app = express();
const port = 4000;
app.use(cors());

const vapidKeys = webPush.generateVAPIDKeys();

webPush.setVapidDetails('mailto:your-email@example.com', vapidKeys.publicKey, vapidKeys.privateKey);

app.use(bodyParser.json());
app.use(express.static('public')); // Serve static files from the public directory

app.get('/', (req, res) => {
    res.status(201).json({ "message": "hai", "publicKey": vapidKeys.publicKey });
});
app.get('/publicKey', (req, res) => {
    res.status(201).send(vapidKeys.publicKey);
});

// Store subscriptions

let subscriptions = {};


app.use(bodyParser.json());


app.get('/users', (req, res) => {
    res.status(201).json({ "message": subscriptions });
});

// Endpoint to subscribe users

app.post('/subscribe', (req, res) => {
    const subscription = req.body;
    const userId = req.body.userId; // Assume userId is sent with the subscription

    // Check if the user is already subscribed
    if (!subscriptions[userId]) {
        subscriptions[userId] = [];
    }

    // Check if the subscription already exists for the user
    const existingSubscription = subscriptions[userId].find(sub => sub.subscription.endpoint === subscription.subscription.endpoint);

    if (!existingSubscription) {
        // If not, add the new subscription
        subscriptions[userId].push(subscription);
        console.log("sub", subscriptions)
        res.status(201).json({ message: 'Subscribed successfully.' });
    } else {
        // If already subscribed, respond accordingly
        res.status(200).json({ message: 'Already subscribed.' });
    }
});


// Endpoint to send personalized notifications

app.post('/send-notification', (req, res) => {
    const { userId, message } = req.body; // Get userId and message from the request

    if (subscriptions[userId]) {
        const payload = JSON.stringify({ title: 'Personalized Notification', body: message });

        Promise.all(subscriptions[userId].map(subscription => {
            return webPush.sendNotification(subscription.subscription, payload);
        }))
            .then(() => res.status(200).json({ message: 'Notification sent' }))
            .catch(error => {
                console.error('Error sending notification:', error);
                res.sendStatus(500);
            });
    } else {
        res.status(404).json({ message: 'No subscriptions found for this user' });
    }
});

app.get('/read-file/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'public', filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.type(path.extname(filePath));

    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).json({ error: 'Error serving file' });
        }
    });
});


app.listen(port, '0.0.0.0', () => {

    console.log(`Server running at http://0.0.0.0:${port}`);

});