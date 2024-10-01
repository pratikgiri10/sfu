const express = require('express');
const app = express();
const mediaSoup = require('mediasoup');
const { Server } = require('socket.io');
const { createServer } = require('http');
const cors = require('cors');

app.use(cors());
const http = createServer(app);
const io = new Server(http,{
    cors: "http://localhost:5500"
});

let worker;
let router;
let rtpCapabilities;

const mediaCodecs = [
    {
        kind        : "audio",
        mimeType    : "audio/opus",
        clockRate   : 48000,
        channels    : 2
      },
      {
        kind       : "video",
        mimeType   : "video/H264",
        clockRate  : 90000,
        parameters :
        {
          "packetization-mode"      : 1,
          "profile-level-id"        : "42e01f",
          "level-asymmetry-allowed" : 1
        }
      }
]

io.on('connection',async (socket) => {
    console.log(`A user connected: ${socket.id}`);
    async function createWorker(){
        worker = await mediaSoup.createWorker();
        console.log(`WorkerPid: ${worker.pid}`);
    
        router = await worker.createRouter({mediaCodecs});
        console.log(`Router: ${router}`);
        rtpCapabilities = router.rtpCapabilities;
        socket.on('getRtpCapabilities',async (_,callback) => {
            try{
                callback(rtpCapabilities);
            }catch(err){
                console.log('error sending rtpCapbilities')
               
            }
            
        });
    }

    await createWorker();
    
    // console.log('router rtpCapabilities: ',rtpCapabilities);
})
app.get('/',(req,res) => {
    res.send("Welcome!");
})


http.listen(3000,() => {
    console.log("Server is running at port 3000 ...");
})