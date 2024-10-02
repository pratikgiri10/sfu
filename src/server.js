const express = require('express');
const app = express();
const mediaSoup = require('mediasoup');
const { Server } = require('socket.io');
const { createServer } = require('http');
const cors = require('cors');
const { IceParameters } = require('mediasoup/node/lib/fbs/web-rtc-transport');

app.use(cors());
const http = createServer(app);
const io = new Server(http,{
    cors: "http://localhost:5500"
});

let worker;
let router;
let rtpCapabilities;
let producerTransport;
let consumerTransport;
let producer;
let consumer;

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
async function createWorker(){
    worker = await mediaSoup.createWorker({
        rtcMinPort: 10000,
        rtcMaxPort: 10010
    });
    console.log(`WorkerPid: ${worker.pid}`);

    router = await worker.createRouter({mediaCodecs});
    console.log(`Router: ${router}`);
    
}
async function createWebRtcTransport(){
    try{
        const transport = await router.createWebRtcTransport(
            {
                listenInfos :
                [
                  {
                    // protocol         : "udp", 
                    ip               : "192.168.1.37", 
                    // announcedIp      : "103.94.255.131" 
                    //"103.94.255.131" 192.168.1.37
                  }
                ],
                enableUdp    : true,
                enableTcp    : true,
                preferUdp    : true
              }
        )
        transport.on('icestatechange',(state) => {
            console.log(`IceStateChange: ${state}`);
        })
        transport.on('dtlstatechange',(state) => {
            console.log(`dtlsStateChange: ${state}`);
        })
        return transport;
    } catch(err){
        console.log("Cannot create transport: ",err);
    }
    
    
}

io.on('connection',async (socket) => {
    console.log(`A user connected: ${socket.id}`);
   

    await createWorker();
    rtpCapabilities = router.rtpCapabilities;
    socket.on('getRtpCapabilities',async (_,callback) => {
            try{
                callback(rtpCapabilities);
            }catch(err){
                console.log('error sending rtpCapbilities')
               
            }
            
    });
    socket.on('createSendTransport',async(rtpCapabilities,callback) => {
        try{
            producerTransport = await createWebRtcTransport();
            console.log(`Producer Transport created: ${producerTransport}`);
            callback({
                id: producerTransport.id,
                iceParameters: producerTransport.iceParameters,
                iceCandidates: producerTransport.iceCandidates,
                dtlsParameters: producerTransport.dtlsParameters
            })
        } catch(err){
            console.log(`Error creating producer transport: ${err}`);
        }
       
    })
    socket.on('producer-connect',async ({dtlsParameters}) => {
        try{
           
            await producerTransport.connect({dtlsParameters});
            console.log(`producer-connect event: ${producerTransport.dtlsParameters}`);
        } catch(err){
            console.log('error connecting ',err);
        }
        
    })
    socket.on('produce',async({kind, rtpParameters}) => {
        try{
            producer = await producerTransport.produce({kind, rtpParameters});
            console.log("produce event: ",producer.id);
        } catch(err){
            console.log('error producing: ',err);
        }
        
    })
    socket.on('createRecvTransport',async (rtpCapabilities,callback) => {
        try{
            consumerTransport = await createWebRtcTransport();
            console.log(`Consumer Transport created: ${consumerTransport}`);
            callback({
                id: consumerTransport.id,
                iceParameters: consumerTransport.iceParameters,
                iceCandidates: consumerTransport.iceCandidates,
                dtlsParameters:consumerTransport.dtlsParameters
            })
        } catch(err){
            console.log("error creating consumer transport: ",err);
        }
    })
    socket.on('consumer-connect',async({dtlsParameters}) => {
        try{
            await consumerTransport.connect({dtlsParameters});
            console.log("consumer connected")
        } catch(err){
            console.log("error connecting consumer: ",err);
        }
    })
    socket.on('consume',async({rtpCapabilities},callback) => {
        try{
            consumer = await consumerTransport.consume({
                rtpCapabilities,
                producerId: producer.id,
                paused: true
            });
            console.log("consumed");
            callback({
                id: consumer.id,
                producerId: producer.id,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters
            });
        } catch(err){
            console.log("error consuming: ",err);
        }
        socket.on('resume',async () => {
            await consumer.resume();
            console.log("consumer resumed");
        })
    })
    

    
    // console.log('router rtpCapabilities: ',rtpCapabilities);
})
app.get('/',(req,res) => {
    res.send("Welcome!");
})


http.listen(3000,() => {
    console.log("Server is running at port 3000 ...");
})