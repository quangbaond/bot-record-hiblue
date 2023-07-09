const express = require('express');
const puppeteer = require('puppeteer');
const { PuppeteerScreenRecorder } = require('puppeteer-screen-recorder');

const app = express();
app.use(express.json());

let browser;
let page;
let recorder;

async function stopRecording(page) {
    if (recorder) {
        await recorder.stop();
    }

    if (page) {
        await page.close();
    }

    if (browser) {
        await browser.close();
    }
}


async function startRecording(url, outputPath) {

    browser = await puppeteer.launch({
        args: ['--use-fake-ui-for-media-stream'],
        headless: true,
    });
    // const urlNew = new URL(url + '?token=$2a$12$wUdztTLUapm7X7uXXyCOLOXnOE6FZqqMOiA4uDByAFMHcmXyonr9K')
    const urlNew = new URL(url)
    const context = browser.defaultBrowserContext();
    const origin = new URL(urlNew).origin;
    context.clearPermissionOverrides();
    context.overridePermissions(origin, ['camera']);

    page = await browser.newPage();
    recorder = new PuppeteerScreenRecorder(page);

    await page.setViewport({ width: 1920, height: 1024 });
    await page.goto(urlNew.href);

    const granted = await page.evaluate(async () => {
        return (await navigator.permissions.query({ name: 'camera' })).state;
    });
    console.log(outputPath);

    await recorder.start('./report/video/' + outputPath);

    console.log('Granted:', granted);
}

app.post('/start', async (req, res) => {
    if (!req.body.url) res.status(422).json({ error: 'Không thể record khi không có url' });
    const { url, outputPath } = req.body;

    try {
        await startRecording(new URL(url), outputPath);
        res.status(200).json({ message: 'Bắt đầu ghi video thành công' });
    } catch (error) {
        console.error('Không thể bắt đầu ghi video:', error);
        res.status(500).json({ error: 'Lỗi khi bắt đầu ghi video' });
    }
});

app.post('/stop', async (req, res) => {
    try {
        await stopRecording(page);
        res.status(200).json({ message: 'Dừng ghi video thành công' });
    } catch (error) {
        console.error('Không thể dừng ghi video:', error);
        res.status(500).json({ error: 'Lỗi khi dừng ghi video' });
    }
});

const port = 8888;
app.listen(port, () => {
    console.log(`Server đang lắng nghe tại ${port}`);
});
