# La Nuit de l'Info Reencoder 🎬🔄

Welcome to the La Nuit de l'Info Reencoder! This Node.js application allows you to reencode video and image files to meet specific size requirements. Whether you want to compress videos or resize images, this reencoder has got you covered.

## Table of Contents 📚
- [Introduction](#la-nuit-de-linfo-reencoder-)
- [Features](#features-)
- [Installation](#installation-)
- [Usage](#usage-)
- [Endpoints](#endpoints-)
- [Examples](#examples-)
- [Contributing](#contributing-)
- [License](#license-)
- [Acknowledgements](#acknowledgements-)

## Features 🌟
- Reencode both videos and images.
- Specify the maximum size for the output.
- Automatic cleanup of old files.
- Beautifull demo website

## Installation 🚀
1. Clone the repository:

```bash
git clone https://github.com/PolyCrusader/VideoConverterApi.git
```

2. Install dependencies:

```bash
cd la-nuit-de-linfo-reencoder
npm install
```

3. Run the server:

```bash
npm start
```

The server will be running at `http://localhost:8000`.

## Usage 🎮
To use the reencoder, you can make a POST request to `http://localhost:8000/` with the following JSON payload:

```json
{
  "fileUrl": "URL_TO_YOUR_FILE",
  "maxSize": "MAXIMUM_SIZE_IN_MB"
}
```

The server will respond with a JSON object containing the result and the URL to the reencoded file.

Additionally, an interface is available to call the API via a GET request at `http://localhost:8000/`. Simply open this URL in your web browser, and you'll be presented with a form to submit your reencoding request.

## Endpoints 🛣️

- **POST `/`**: Reencode a file.

  Example Payload:
  ```json
  {
    "fileUrl": "https://example.com/video.mp4",
    "maxSize": "10"
  }
  ```

  Example Response:
  ```json
  {
    "result": "success",
    "url": "http://localhost:8000/outputs/output_file.mp4"
  }
  ```

- **GET** `/`: Demo website to use the api easily

- **GET `/outputs/:file`**: Download the reencoded file.

- **GET `/progress/:file`**: Check the encoding progress.

## Examples 🌈
For a video file:
```bash
curl -X POST -H "Content-Type: application/json" -d '{"fileUrl": "https://example.com/video.mp4", "maxSize": "10"}' http://localhost:8000/
```

For an image file:
```bash
curl -X POST -H "Content-Type: application/json" -d '{"fileUrl": "https://example.com/image.jpg", "maxSize": "5"}' http://localhost:8000/
```

## License 📄
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements 🙏
Special thanks to the La Nuit de l'Info team!