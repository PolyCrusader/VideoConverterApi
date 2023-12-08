import express, { Request, Response, Application } from 'express';
import ffprobe from 'ffprobe-static';
import child_process from 'child_process';
import fs from 'fs';
import ffmpeg from 'ffmpeg-static';
import got from 'got';
import stream from 'stream';
import util from 'util';

const app: Application = express();
const port = 8000;

app.use(express.json());

app.post('/', async (req: Request, res: Response) => {
  //create directory if not exists
  if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");
  if (!fs.existsSync("outputs")) fs.mkdirSync("outputs");
  if (!fs.existsSync("progress")) fs.mkdirSync("progress");
  if (!fs.existsSync("tmp_generations")) fs.mkdirSync("tmp_generations");

  let fileUrl: string = req.body['fileUrl'];
  let final_size: number = parseInt(req.body['maxSize']);

  if (isNaN(final_size)) {
    res.json({ error: "maxSize is not a number" });
    return;
  }
  let input_file: string = makeid(10) + "." + fileUrl.split('/').slice(-1).toString().split('.').slice(-1).toString();

  //download synchronously
  const pipeline = util.promisify(stream.pipeline);
  await pipeline(got.stream(fileUrl), fs.createWriteStream("uploads/" + input_file));

  console.log(`${ffprobe.path} -v error -show_format -show_streams -of json uploads/${input_file}`);

  const originalVideoInfoJson = JSON.parse(child_process.execSync(`${ffprobe.path} -v error -show_format -show_streams -of json uploads/${input_file}`).toString());

  let input_streams = originalVideoInfoJson.streams.map((stream: any) => stream.codec_type).join("\n");
  let duration: string = originalVideoInfoJson.format.duration;

  let output_format: string = "";
  let output_codec: string = "";
  let input_duration: number;
  if (duration == undefined) {
    output_format = ".webp";
    output_codec = "libwebp";
    input_duration = 1;
  } else {
    input_duration = parseFloat(duration.toString());
    output_format = ".mp4";
    output_codec = "h264";
  }

  if (final_size * 8 / input_duration < 100) { //TODO maybe change the value
    res.json({ error: "maxSize is too small" });
    return;
  }

  const output_file = `${input_file.split('.').slice(0, -1).toString()}${output_format}`;

  //TODO replace with real ip
  res.json({ "result": "success", "url": `http://localhost:${port}/outputs/${output_file}` });
  if (duration == undefined) {
    processImage(input_file, originalVideoInfoJson, final_size, input_duration, output_file);
  } else {
    processVideo(input_file, originalVideoInfoJson, final_size, input_duration, output_file);
  }
  deleteOldFiles();
});

app.get('/outputs/:file', (req: Request, res: Response) => {
  const file = req.params.file;
  const fileLocation = `outputs/${file}`;
  if (fs.existsSync(`progress/${file}-1.txt`) || fs.existsSync(`progress/${file}-2.txt`)) {
    const progress = getProgress(file);
    res.json({ "result": "error", "error": "encoding not finished", "avencement": progress });
    return;
  }
  res.download(fileLocation, file);
});

function processVideo(input_file: string, originalVideoInfoJson: any, final_size: number, input_duration: number, output_file: string) {
  const outputBitrate = (final_size * 8) / originalVideoInfoJson.format.duration * (80 / 100);
  //TODO remove the -y
  let command: string = `${ffmpeg} -y -i uploads/${input_file} -c:v libx264 -b:v ${outputBitrate}k -pass 1 -an -progress progress/${output_file}-1.txt -f null /dev/null && \
  ${ffmpeg} -y -i uploads/${input_file} -c:v libx264 -b:v ${outputBitrate}k -pass 2 -progress progress/${output_file}-2.txt outputs/${output_file}`;
  fs.writeFileSync(`progress/${output_file}-duration.txt`, input_duration.toString());
  child_process.exec(
    command,
  ).on('exit', function (code, signal) {
    console.log('child process exited');
    fs.unlinkSync(`uploads/${input_file}`);
    fs.unlinkSync(`progress/${output_file}-1.txt`);
    fs.unlinkSync(`progress/${output_file}-2.txt`);
    fs.unlinkSync(`progress/${output_file}-duration.txt`);
  });
}

function processImage(input_file: string, originalVideoInfoJson: any, final_size: number, input_duration: number, output_file: string) {
  let outputSize: number = 0;
  let height: number = originalVideoInfoJson.streams[0].height;
  let width: number = originalVideoInfoJson.streams[0].width;
  do {
    let command: string = `${ffmpeg} -y -i uploads/${input_file} -vf scale=${width}:${height} -c:v libwebp -progress progress/${output_file}-1.txt tmp_generations/${output_file}`;
    child_process.execSync(command);
    outputSize = fs.statSync(`tmp_generations/${output_file}`).size / 1024;
    const factor: number = final_size / outputSize;
    if (factor < 1) {
      height = Math.round(height * factor);
      width = Math.round(width * factor);
      if (height % 2 !== 0) {
        height -= 1;
      }
      if (width % 2 !== 0) {
        width -= 1;
      }

    }
  } while (outputSize > final_size);
  let command = `${ffmpeg} -y -i tmp_generations/${output_file} -vf scale=${width}:${height} -c:v libwebp -progress progress/${output_file}-2.txt outputs/${output_file}`;
  child_process.execSync(command);
  fs.unlinkSync(`progress/${output_file}-2.txt`);
  fs.unlinkSync(`progress/${output_file}-1.txt`);
  fs.unlinkSync(`tmp_generations/${output_file}`);
  fs.unlinkSync(`uploads/${input_file}`);
}

function getProgress(file: string): number {
  let offset: number;
  let out_time_ms: string;
  if (fs.existsSync(`progress/${file}-2.txt`)) {
    offset = 50;
    const data = fs.readFileSync(`progress/${file}-2.txt`, 'utf8');
    out_time_ms = data.split("\n").filter((line: string) => line.startsWith("out_time_ms")).slice(-1).toString().split("=").slice(-1).toString();
  } else {
    offset = 0;
    const data = fs.readFileSync(`progress/${file}-1.txt`, 'utf8');
    out_time_ms = data.split("\n").filter((line: string) => line.startsWith("out_time_ms")).slice(-1).toString().split("=").slice(-1).toString();
  }
  let duration = fs.readFileSync(`progress/${file}-duration.txt`, 'utf8');
  if (duration == undefined) {//this is probably an image
    duration = "1";
  }
  return (parseFloat(out_time_ms) / 1000000) / parseFloat(duration) * 50 + offset;
}

function makeid(length: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

function deleteOldFiles() {
  const files = fs.readdirSync("outputs");
  const now = new Date().getTime();
  files.forEach((file) => {
    const fileLocation = `outputs/${file}`;
    const stats = fs.statSync(fileLocation);
    const endTime = new Date(stats.mtime).getTime() + 1000 * 60 * 60 * 24 * 7; //7 days
    if (now > endTime) {
      fs.unlinkSync(fileLocation);
    }
  });

}

app.listen(port, () => {
  console.log(`Server is Fire at http://localhost:${port}`);
});