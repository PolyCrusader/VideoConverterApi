"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ffprobe_static_1 = __importDefault(require("ffprobe-static"));
const dotenv_1 = __importDefault(require("dotenv"));
const child_process_1 = __importDefault(require("child_process"));
const fs_1 = __importDefault(require("fs"));
const url_1 = __importDefault(require("url"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const got_1 = __importDefault(require("got"));
const stream_1 = __importDefault(require("stream"));
const util_1 = __importDefault(require("util"));
//For env File 
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 8000;
app.use(express_1.default.json());
app.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let fileUrl = req.body['fileUrl'];
    let final_size = parseInt(req.body['maxSize']);
    if (isNaN(final_size)) {
        res.json({ error: "maxSize is not a number" });
        return;
    }
    const parsed = url_1.default.parse(fileUrl);
    let input_file = makeid(10) + "." + fileUrl.split('/').slice(-1).toString().split('.').slice(-1).toString();
    //download synchronously
    const pipeline = util_1.default.promisify(stream_1.default.pipeline);
    yield pipeline(got_1.default.stream(fileUrl), fs_1.default.createWriteStream("uploads/" + input_file));
    //CRADO faire avec de la reocnnaissance d'extension on avec file
    let input_streams = child_process_1.default.execSync(`${ffprobe_static_1.default.path} -loglevel error -show_entries stream=codec_type -of csv=p=0 uploads/${input_file}`).toString();
    let duration = child_process_1.default.execSync(`${ffprobe_static_1.default.path} -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 uploads/${input_file}`).toString();
    let output_format = "";
    let output_codec = "";
    let intput_duration;
    if (input_streams == "video\n") {
        console.log("got video");
        console.log(duration);
        if (duration == "N/A\n") {
            output_format = ".webp";
            output_codec = "libwebp";
            intput_duration = 1;
        }
        else {
            output_format = ".mp4";
            output_codec = "h264";
            intput_duration = parseFloat(duration.toString());
        }
    }
    else {
        output_format = ".mp4";
        output_codec = "h264";
        intput_duration = parseFloat(duration.toString());
    }
    //get 10sec of the video
    let short_duration = 10;
    if (intput_duration < short_duration) {
        short_duration = intput_duration;
    }
    const short_file = `${input_file.split('.').slice(0, -1).toString()}_short${output_format}`;
    const tmp_generation_file = `${input_file.split('.').slice(0, -1).toString()}_test${output_format}`;
    // ffmpeg -i test.mp4 -ss 0 -t 600 -c copy  test_output.mp4
    if (short_duration > 1) {
        child_process_1.default.execSync(`${ffmpeg_static_1.default} -i uploads/${input_file} -ss 0 -t ${short_duration} -c copy tmp_generations/${short_file}`);
    }
    else {
        fs_1.default.copyFileSync(`uploads/${input_file}`, `tmp_generations/${short_file}`);
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
        child_process_1.default.execSync(`${ffmpeg_static_1.default} -i tmp_generations/${short_file} -y -b:v ${outputBitrate}k -vcodec ${output_codec} tmp_generations/${tmp_generation_file}`);
        test_file_size = fs_1.default.statSync(`tmp_generations/${tmp_generation_file}`).size;
        outputBitrate = Math.abs(outputBitrate - Math.abs(short_file_size - test_file_size) * p - Math.abs(last_test_file_size - test_file_size) * d);
        counter += 1;
    }
    //clean files
    fs_1.default.unlinkSync(`tmp_generations/${short_file}`);
    fs_1.default.unlinkSync(`tmp_generations/${tmp_generation_file}`);
    const output_file = `${input_file.split('.').slice(0, -1).toString()}${output_format}`;
    //TODO remove the -y
    let command = `${ffmpeg_static_1.default} -i uploads/${input_file} -y -b:v ${outputBitrate}k -vcodec ${output_codec} outputs/${output_file}`;
    console.log(command);
    child_process_1.default.execSync(command);
    fs_1.default.unlinkSync(`uploads/${input_file}`);
    res.json({ "result": "success", "url": `http://localhost:${port}/outputs/${output_file}` });
}));
app.get('/outputs/:file', (req, res) => {
    const file = req.params.file;
    const fileLocation = `outputs/${file}`;
    res.download(fileLocation, file);
});
app.listen(port, () => {
    console.log(`Server is Fire at http://localhost:${port}`);
});
function makeid(length) {
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
