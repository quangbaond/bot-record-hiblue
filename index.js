const express = require('express');
const { launch, getStream } = require("puppeteer-stream");
const fs = require("fs");
const puppeteer = require('puppeteer')

const app = express();
app.use(express.json());

const recordings = new Map()

async function stopRecording(stream, file) {
    if (stream) {
        await stream.destroy();
    }

    if (file) {
        file.close();
    }
}


async function startRecording(url, outputPath) {

    const file = fs.createWriteStream('record/'+ outputPath);
    const browser = await launch({
        executablePath: puppeteer.executablePath(),
        headless: true,
	});

	const page = await browser.newPage();
	await page.goto(url.href);
	const stream = await getStream(page, { audio: true, video: true });
	console.log("recording");

	stream.pipe(file);

    recordings.set(url.href, {stream, file, url})
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
    const { url, outputPath } = req.body;

    const recording = recordings.get(url)
    console.log(recording);

    if (!recording) {
        res.status(404).json({ error: 'Không tìm thấy bản ghi video với đường dẫn đầu ra đã cho' });
        return;
    }

    const { stream, file } = recording;

    try {
      await stopRecording(stream, file);
      res.status(200).json({ message: 'Dừng ghi video thành công' });
    } catch (error) {
      console.error('Không thể dừng ghi video:', error);
      res.status(500).json({ error: 'Lỗi khi dừng ghi video' });
    }
});

const port = 8999;
app.listen(port, () => {
  console.log(`Server đang lắng nghe tại ${port}`);
});
