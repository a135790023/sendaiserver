const express = require('express');
const webpush = require('web-push');
const bodyParser = require('body-parser');
const cors = require('cors'); // 記得要 npm install cors

const app = express();

// 🔓 允許所有網站連線 (解決 CORS 問題)
app.use(cors());
app.use(bodyParser.json());

// 🔑 你的 VAPID Keys (請確認這裡是你最新的 key)
const publicVapidKey = 'BA9EFqigQF0HLsJisQtvcbWrjAvtz14BT9DKwaygnNJR51kPnY-TwH9Ui94sLEzZOS4FdOiXI-OKAUl1A2Mh-Fc';
const privateVapidKey = 'wpUqQhxKlvFrlNZ_2ILgVlk2NuD2Tjf7vdWGZAKN1w8';

webpush.setVapidDetails('mailto:test@example.com', publicVapidKey, privateVapidKey);

// ⚠️ 注意：雲端重啟後這裡會清空
let subscriptions = [];

// 測試用路由 (讓你知道伺服器活著)
app.get('/', (req, res) => {
    res.send('Hello! Backend is working on Cloud! ☁️');
});

// 訂閱路由
app.post('/subscribe', (req, res) => {
    const subscription = req.body;
    subscriptions.push(subscription);
    console.log('📝 新增訂閱！目前人數:', subscriptions.length);
    res.status(201).json({});
});

// 推播路由
app.post('/broadcast', (req, res) => {
    const { title, message, url } = req.body;
    const payload = JSON.stringify({
        title: title, 
        body: message,
        icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602145.png',
        data: { url: url || '/' }
    });

    Promise.all(subscriptions.map(sub => webpush.sendNotification(sub, payload).catch(e => console.log(e))))
        .then(() => res.json({ success: true }))
        .catch(err => res.status(500).json({ error: err.message }));
});

// ⭐ 關鍵：使用雲端分配的 Port
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server started on port ${port}`));