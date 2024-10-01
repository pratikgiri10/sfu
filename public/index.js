const { io } = require('socket.io-client');
const socket = io('http://localhost:3000');
const mediasoupClient = require('mediasoup-client');

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const start = document.getElementById('start');
const join = document.getElementById('join');

let device;
let sendTransport;
let recvTRansport;
let producer;
let consumer;

start.addEventListener('click',async () => {
    // await initializeSocket();
    console.log('start button')
    await initializeDevice();
    setTimeout(function(){
        createSendTransport();

    },1000)
})
join.addEventListener('click',async () => {
    // await initializeSocket();
    console.log('join button')
    await initializeDevice();
})




    socket.on('connect', () => {
        console.log(`A client connected: ${socket.id}`);
    })
async function initializeDevice(){
    console.log("Initializing device");
    socket.emit('getRtpCapabilities',{},async (rtpCapabilities) => {
        console.log('getting rtpCapabilities: ',rtpCapabilities)
        const routerRtpCapabilities = rtpCapabilities;
        device = new mediasoupClient.Device();
        await device.load({routerRtpCapabilities});
        console.log('Device loaded with rtpCapabilities: ',device.rtpCapabilities);

    })
}
async function createSendTransport(){
    if(!device)
        console.log("Device not initialized");
    socket.emit('createSendTransport',device.rtpCapabilities,async (params) => {
        console.log("Params from send tranport: ",params);
        try{
            sendTransport = await device.createSendTransport(params);
            
            sendTransport.on('connect',async ({dtlsParameters},callback,errback) => {
                try{
                    socket.emit('producer-connect',{
                        id: sendTransport.id,
                        dtlsParameters
                    })
                    callback();
                } catch(err){
                    console.log("Error emitting produce-connect: ",err);
                    errback(err);
                }
            })
            sendTransport.on('produce',async (parameters,callback,errback) => {
                try{
                    const { id } = socket.emit('produce',{
                        id: sendTransport.id,
                        kind: parameters.kind,
                        rtpParameters: parameters.rtpParameters
                    }) 
                    callback({id});
                } catch(err){
                    errback(err);
                }
            })
            sendTransport.on('icestatechange',(state) => {
                console.log("IceStateChange: ",state);
            })
            sendTransport.on('connectiostatechange',(state) => {
                console.log("ConnectionStateChange: ",state);
            })
            await produceMedia();
        } catch(err){
            console.log("Error creating sendTransport: ",err);
        }
        
    })
    
}
async function produceMedia(){
    const stream = await navigator.mediaDevices.getUserMedia({video: true});
    localVideo.srcObject = stream;
    const track = stream.getVideoTracks()[0];
    try{
        producer = await sendTransport.produce({track});
    } catch(err){
        console.log("error in producing media: ",err);
    }
    
    
}

async function createReceiveTransport(){

}