import express, { Request, Response, Application } from 'express';
import ffmpeg from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';
import dotenv from 'dotenv';
import child_process from 'child_process';
import fs from 'fs';
import urlParser from 'url';
import ffmpegPath from 'ffmpeg-static';
import got from 'got';
import stream from 'stream';
import util from 'util';
import optimizeVideo from './video';

//For env File 
dotenv.config();

const app: Application = express();
const port = process.env.PORT || 8000;

app.use(express.json());

app.post('/', async (req: Request, res: Response) => {
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

  //CRADO faire avec de la reocnnaissance d'extension on avec file
  let input_streams = originalVideoInfoJson.streams.map((stream: any) => stream.codec_type).join("\n");
  let duration: string = originalVideoInfoJson.format.duration;

  let output_format: string = "";
  let output_codec: string = "";
  let intput_duration: number;
  if (duration == undefined) {
    output_format = ".webp";
    output_codec = "libwebp";
    intput_duration = 1;
  } else {
    intput_duration = parseFloat(duration.toString());
    output_format = ".mp4";
    output_codec = "h264";
  }

  /*
  //get 10sec of the video
  let short_duration = 10;
  if (intput_duration < short_duration) {
    short_duration = intput_duration;
  }

  const short_file = `${input_file.split('.').slice(0, -1).toString()}_short${output_format}`;
  const tmp_generation_file = `${input_file.split('.').slice(0, -1).toString()}_test${output_format}`;
  // ffmpeg -i test.mp4 -ss 0 -t 600 -c copy  test_output.mp4
  if (short_duration > 1) {
    child_process.execSync(`${ffmpegPath} -i uploads/${input_file} -ss 0 -t ${short_duration} -c copy tmp_generations/${short_file}`);
  } else {
    fs.copyFileSync(`uploads/${input_file}`, `tmp_generations/${short_file}`);
  }
  const p = 0.0007;
  const d = 0.0001;
  let outputBitrate = (final_size * 8) / intput_duration;
  let short_file_size = (final_size * 1024) / intput_duration * short_duration;
  console.log("short_file_size", short_file_size);
  let test_file_size = short_file_size + 1;
  let last_test_file_size = test_file_size;
  let counter = 0;
  while (test_file_size - short_file_size > 0) {
    if (counter > 20) {
      res.json({ error: "can't find a bitrate" });
      return;
    }
    console.log("outputBitrate", outputBitrate);
    child_process.execSync(`${ffmpegPath} -i tmp_generations/${short_file} -y -b:v ${outputBitrate}k -vcodec ${output_codec} tmp_generations/${tmp_generation_file}`);
    test_file_size = fs.statSync(`tmp_generations/${tmp_generation_file}`).size;
    outputBitrate = Math.abs(outputBitrate - Math.abs(short_file_size - test_file_size) * p - Math.abs(last_test_file_size - test_file_size) * d);
    counter += 1;
  }
  //clean files
  fs.unlinkSync(`tmp_generations/${short_file}`);
  fs.unlinkSync(`tmp_generations/${tmp_generation_file}`);
  */

  const output_file = `${input_file.split('.').slice(0, -1).toString()}${output_format}`;
  const { bitrate: outputBitrate, width: outputWith, height: outputHeight } = optimizeVideo(originalVideoInfoJson, final_size);
  //TODO remove the -y
  let command: string = `${ffmpegPath} -i uploads/${input_file} -y -b:v ${outputBitrate} -vcodec ${output_codec} -vf scale=${outputWith}:${outputHeight},fps=25 outputs/${output_file}`;
  console.log(command);

  child_process.execSync(
    command,
  );
  fs.unlinkSync(`uploads/${input_file}`);
  res.json({ "result": "success", "url": `http://localhost:${port}/outputs/${output_file}` });
});

app.get('/outputs/:file', (req: Request, res: Response) => {
  const file = req.params.file;
  const fileLocation = `outputs/${file}`;
  res.download(fileLocation, file);
});

app.listen(port, () => {
  console.log(`Server is Fire at http://localhost:${port}`);
});

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